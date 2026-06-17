from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from django.http import HttpResponse
import re
from jobs.models import Job
from jobs.permissions import IsClient, IsApproved
from users.views import create_notification
from nlp_engine.models import NLPResult
from .models import Report
from .export_model import build_export_model
from .renderers import render_csv, render_docx, render_pdf

def clean_requirement(text):
    cleaned = str(text).strip()
    if cleaned and not cleaned[0].isupper():
        cleaned = cleaned[0].upper() + cleaned[1:]
    if cleaned and not cleaned.endswith("."):
        cleaned += "."
    return cleaned


# ---------------------------------------------------------------------------
# Report content builder
# ---------------------------------------------------------------------------

def build_report_content(job, nlp_result):
    """Assemble the full report content dict from an NLPResult."""
    polished_raw = nlp_result.polished_requirements or {}
    report_text = polished_raw.get("report_text", "")
    fallback_used = polished_raw.get("fallback_used", False)
    polished_categories = polished_raw.get("categories", {})

    categorized = []
    for cat_name, priority_dict in polished_categories.items():
        all_reqs = []
        for level in ("high", "medium", "low"):
            all_reqs.extend(priority_dict.get(level) or [])
        if all_reqs:
            categorized.append(
                {
                    "category": cat_name,
                    "requirements": [clean_requirement(r) for r in all_reqs],
                }
            )

    priorities = {
        "high": [
            clean_requirement(r)
            for portal in polished_categories.values()
            for r in portal.get("high", [])
        ],
        "medium": [
            clean_requirement(r)
            for portal in polished_categories.values()
            for r in portal.get("medium", [])
        ],
        "low": [
            clean_requirement(r)
            for portal in polished_categories.values()
            for r in portal.get("low", [])
        ],
    }

    mcq_statistics = nlp_result.mcq_statistics or {}
    stats = nlp_result.statistics or {}

    polished_requirements = {
        "report_text": report_text,
        "fallback_used": fallback_used,
        "categories": {
            cat_name: {
                "high": [clean_requirement(r) for r in (priority_dict.get("high") or [])],
                "medium": [
                    clean_requirement(r) for r in (priority_dict.get("medium") or [])
                ],
                "low": [clean_requirement(r) for r in (priority_dict.get("low") or [])],
            }
            for cat_name, priority_dict in polished_categories.items()
        },
    }

    total_reqs = sum(
        len(p.get("high", [])) + len(p.get("medium", [])) + len(p.get("low", []))
        for p in polished_categories.values()
    )
    if not total_reqs and report_text:
        total_reqs = len(re.findall(r"The system shall ", report_text, flags=re.IGNORECASE))

    summary = {
        "total_categories": len(polished_categories) or (1 if report_text else 0),
        "total_requirements": total_reqs,
        "high_priority_count": len(priorities["high"]),
        "medium_priority_count": len(priorities["medium"]),
        "low_priority_count": len(priorities["low"]),
        "duplicates_found": 0,
        "low_quality_count": 0,
        "mcq_questions_count": len(mcq_statistics),
        "spelling_corrections_count": 0,
        "fallback_used": fallback_used,
        **{k: v for k, v in stats.items() if k not in ("fallback_used",)},
    }

    # ── Extract keywords from the NLP statistics (stored by RunNLPView)
    # and fall back to pulling frequent nouns from the report text.
    stored_keywords = list(nlp_result.keywords or [])
    if not stored_keywords and report_text:
        import re as _re
        # Pull capitalised words (likely domain nouns) from the report text
        # as a simple keyword proxy when the NLP engine saved none.
        words = _re.findall(r"\b[A-Z][a-z]{3,}\b", report_text)
        freq = {}
        for w in words:
            freq[w] = freq.get(w, 0) + 1
        stored_keywords = [
            w for w, _ in sorted(freq.items(), key=lambda x: -x[1])
            if w not in {"The", "System", "Shall", "This", "That", "High", "Medium", "Low"}
        ][:15]

    return {
        "job_title": job.title,
        "job_description": job.description,
        "keywords": stored_keywords,
        "categorized_requirements": categorized,
        "priorities": priorities,
        "duplicates_removed": [],
        "low_quality_requirements": [],
        "mcq_statistics": mcq_statistics,
        "spelling_corrections": {},
        "polished_requirements": polished_requirements,
        "summary": summary,
    }


# ---------------------------------------------------------------------------
# API Views
# ---------------------------------------------------------------------------

class GenerateReportView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
            nlp_result = NLPResult.objects.get(job=job, is_complete=True)
        except Job.DoesNotExist:
            return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)
        except NLPResult.DoesNotExist:
            return Response(
                {"error": "Run NLP analysis first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content = build_report_content(job, nlp_result)

        report, _ = Report.objects.update_or_create(
            job=job,
            defaults={
                "generated_by": request.user,
                "content": content,
            },
        )
        create_notification(
            request.user,
            "report",
            "Report generated",
            f'The report for "{job.title}" is ready.',
        )

        return Response(
            {
                "message": "Report generated successfully.",
                "report": content,
            },
            status=status.HTTP_201_CREATED,
        )


class GetReportView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def get(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
            report = Report.objects.get(job=job)
        except Exception:
            return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "report": report.content,
                "generated_at": report.generated_at,
            }
        )

    def put(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
            report = Report.objects.get(job=job)
        except Job.DoesNotExist:
            return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)
        except Report.DoesNotExist:
            return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)

        content = request.data.get("report") or request.data.get("content")
        if content is None:
            return Response(
                {"error": "Report content is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.content = content
        report.save(update_fields=["content"])

        return Response(
            {
                "message": "Report updated successfully.",
                "report": report.content,
            }
        )


class ExportReportView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def perform_content_negotiation(self, request, force=False):
        # File downloads return HttpResponse; skip Accept-header negotiation.
        return (JSONRenderer(), "application/json")

    def get(self, request, job_id, export_format):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
            report = Report.objects.get(job=job)
        except (Job.DoesNotExist, Report.DoesNotExist):
            return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)

        export_format = (export_format or "").lower()
        if export_format not in {"pdf", "docx", "csv"}:
            return Response(
                {"error": "Unsupported export format. Use pdf, docx, or csv."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            content = report.content if isinstance(report.content, dict) else {}
            export_model = build_export_model(content, generated_at=report.generated_at)
            safe_title = re.sub(r"[^\w\s-]", "", job.title or "report").strip()
            safe_title = re.sub(r"\s+", "_", safe_title) or "report"
            filename = f"{safe_title}_requirements_report"

            if export_format == "pdf":
                file_bytes = render_pdf(export_model)
                response = HttpResponse(file_bytes, content_type="application/pdf")
                response["Content-Disposition"] = f'attachment; filename="{filename}.pdf"'
                return response

            if export_format == "docx":
                file_bytes = render_docx(export_model)
                response = HttpResponse(
                    file_bytes,
                    content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
                response["Content-Disposition"] = f'attachment; filename="{filename}.docx"'
                return response

            file_bytes = render_csv(export_model)
            response = HttpResponse(file_bytes, content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = f'attachment; filename="{filename}.csv"'
            return response
        except Exception:
            return Response(
                {"error": f"Failed to generate {export_format.upper()} export."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )