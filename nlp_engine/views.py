import logging
import re
from collections import Counter

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from jobs.models import Job
from jobs.permissions import IsApproved, IsClient
from requirements_module.models import RequirementForm, RequirementSubmission

from .fallback_formatter import basic_formatter
from .groq_service import process_requirements as groq_process
from .models import NLPResult

logger = logging.getLogger(__name__)

PORTAL_LABEL_HINTS = ("portal", "category", "module")
PRIORITY_LABEL_HINTS = ("priority",)
MCQ_TYPES = ("radio", "checkbox", "select", "multiple_choice", "mcq", "voting")

MCQ_OPTION_PATTERN = re.compile(
    r"^(option\s*\d+|[a-dA-D][.)]\s|[a-dA-D]\s*[-–]\s|\([a-dA-D]\)\s)",
    re.IGNORECASE,
)


def _normalize_priority(value):
    if not value:
        return "medium"
    lower = str(value).strip().lower()
    if "high" in lower:
        return "high"
    if "low" in lower:
        return "low"
    return "medium"


def _field_role(label, field_type):
    label_lower = (label or "").lower()
    if any(hint in label_lower for hint in PORTAL_LABEL_HINTS):
        return "portal"
    if any(hint in label_lower for hint in PRIORITY_LABEL_HINTS):
        return "priority"
    if (field_type or "").lower() in MCQ_TYPES:
        return "mcq"
    return "requirement"


def _looks_like_mcq_answer(value):
    if not isinstance(value, str):
        return False
    stripped = value.strip()
    if MCQ_OPTION_PATTERN.match(stripped):
        return True
    return bool(re.match(r"^[A-Da-d]$", stripped))


def _stringify_value(value):
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(str(v).strip() for v in value if v)
    return str(value).strip()


def collect_raw_responses(submissions):
    """
    Collect structured raw form data for Groq processing and fallback formatting.

    Returns dict with grouped_requirements, mcq_statistics, and raw_entries.
    """
    grouped_requirements = {}
    mcq_tallies = {}
    raw_entries = []

    for submission in submissions:
        form = submission.form
        field_map = {}
        fields_list = []
        if hasattr(form, "fields_config") and isinstance(form.fields_config, dict):
            fields_list = form.fields_config.get("fields", [])
        for field in fields_list:
            key = field.get("name") or field.get("id") or field.get("label", "")
            field_map[key] = field

        if not isinstance(submission.data, dict):
            continue

        portal = "General Requirements"
        priority = "medium"

        for key, value in submission.data.items():
            field_def = field_map.get(key, {})
            field_type = (field_def.get("type") or "").lower()
            label = field_def.get("label", key)
            role = _field_role(label, field_type)
            text_value = _stringify_value(value)

            if not text_value and field_type != "rating":
                continue

            if role == "portal":
                portal = text_value or portal
                raw_entries.append({"label": label, "value": text_value, "type": field_type})
                continue

            if role == "priority":
                priority = _normalize_priority(text_value)
                raw_entries.append({"label": label, "value": text_value, "type": field_type})
                continue

            if role == "mcq" or (
                field_type not in ("text", "rating")
                and _looks_like_mcq_answer(text_value)
            ):
                if label not in mcq_tallies:
                    mcq_tallies[label] = Counter()
                if isinstance(value, list):
                    for item in value:
                        item_text = _stringify_value(item)
                        if item_text:
                            mcq_tallies[label][item_text] += 1
                else:
                    mcq_tallies[label][text_value] += 1
                raw_entries.append({"label": label, "value": text_value, "type": field_type})
                continue

            if field_type == "rating":
                entry_value = f"Rating: {text_value}/{field_def.get('max', 5)}"
            else:
                entry_value = text_value

            raw_entries.append({"label": label, "value": entry_value, "type": field_type})
            grouped_requirements.setdefault(portal, []).append(
                {"text": entry_value, "priority": priority, "label": label}
            )

    mcq_statistics = {
        label: {
            "options": dict(counts),
            "total_responses": sum(counts.values()),
            "top_choice": counts.most_common(1)[0][0] if counts else None,
        }
        for label, counts in mcq_tallies.items()
    }

    return {
        "grouped_requirements": grouped_requirements,
        "mcq_statistics": mcq_statistics,
        "raw_entries": raw_entries,
    }


def format_raw_for_groq(raw_data):
    lines = ["RAW FORM RESPONSES", "=" * 40, ""]

    for entry in raw_data.get("raw_entries") or []:
        lines.append(f"Question: {entry['label']}")
        lines.append(f"Answer: {entry['value']}")
        lines.append("")

    mcq_statistics = raw_data.get("mcq_statistics") or {}
    if mcq_statistics:
        lines.extend(["MCQ RESULTS", "-" * 30, ""])
        for question, stats in mcq_statistics.items():
            lines.append(f"Question: {question}")
            lines.append(f"Total responses: {stats.get('total_responses', 0)}")
            lines.append(f"Top choice: {stats.get('top_choice', 'N/A')}")
            lines.append("Options:")
            for option, count in sorted(
                (stats.get("options") or {}).items(),
                key=lambda x: x[1],
                reverse=True,
            ):
                lines.append(f"  - {option}: {count} vote(s)")
            lines.append("")

    return "\n".join(lines).strip()


def parse_priorities_from_report(report_text):
    """Extract requirements grouped by priority when portal parsing fails."""
    buckets = {"high": [], "medium": [], "low": []}
    current_priority = "medium"
    skip_sections = (
        "MVP RECOMMENDATION",
        "SUMMARY",
        "MCQ",
        "INFERRED REQUIREMENTS",
    )

    for line in report_text.splitlines():
        stripped = line.strip()
        if not stripped or set(stripped) <= {"-", "=", "*", "#"}:
            continue

        upper = stripped.upper()
        if any(section in upper for section in skip_sections) and upper == stripped:
            continue

        if re.search(r"\bHIGH\s+PRIORITY\b", upper) or upper.startswith("HIGH:"):
            current_priority = "high"
            continue
        if re.search(r"\bMEDIUM\s+PRIORITY\b", upper) or upper.startswith("MEDIUM:"):
            current_priority = "medium"
            continue
        if re.search(r"\bLOW\s+PRIORITY\b", upper) or upper.startswith("LOW:"):
            current_priority = "low"
            continue

        req_match = re.match(
            r"^(?:\d+[.)]\s*|-\s*|\*\s*)?(The system shall .+)$",
            stripped,
            re.IGNORECASE,
        )
        if req_match:
            req_text = req_match.group(1).strip()
            if not req_text.endswith("."):
                req_text += "."
            buckets[current_priority].append(req_text)

    return buckets


def parse_report_to_categories(report_text):
    """Best-effort parse of Groq text report into categories for summary stats."""
    categories = {}
    current_portal = "General Requirements"
    current_priority = "medium"
    skip_sections = (
        "MVP RECOMMENDATION",
        "SUMMARY",
        "MCQ",
        "INFERRED REQUIREMENTS",
    )

    for line in report_text.splitlines():
        stripped = line.strip()
        if not stripped or set(stripped) <= {"-", "=", "*", "#"}:
            continue

        upper = stripped.upper()
        if any(section in upper for section in skip_sections) and upper == stripped:
            current_portal = None
            continue

        if "[HIGH PRIORITY]" in upper or re.search(r"\bHIGH\s+PRIORITY\b", upper) or upper.startswith("HIGH:"):
            current_priority = "high"
            continue
        if "[LOW PRIORITY]" in upper or re.search(r"\bLOW\s+PRIORITY\b", upper) or upper.startswith("LOW:"):
            current_priority = "low"
            continue
        if "[MEDIUM PRIORITY]" in upper or re.search(r"\bMEDIUM\s+PRIORITY\b", upper) or upper.startswith("MEDIUM:"):
            current_priority = "medium"
            continue

        req_match = re.match(
            r"^(?:\d+[.)]\s*|-\s*|\*\s*)?(The system shall .+)$",
            stripped,
            re.IGNORECASE,
        )
        if req_match:
            req_text = req_match.group(1).strip()
            if not req_text.endswith("."):
                req_text += "."
            portal = current_portal or "General Requirements"
            categories.setdefault(portal, {"high": [], "medium": [], "low": []})
            categories[portal][current_priority].append(req_text)
            continue

        is_heading = (
            (upper == stripped and len(stripped) > 3 and not stripped.startswith("-"))
            or re.search(r"\b(portal|module|management)\b", stripped, re.IGNORECASE)
        )
        if is_heading and not any(section in upper for section in skip_sections):
            current_portal = stripped.title()
            categories.setdefault(current_portal, {"high": [], "medium": [], "low": []})
            current_priority = "medium"

    return categories


def categories_have_requirements(categories):
    return bool(
        sum(
            len(priority_dict.get(level, []))
            for priority_dict in (categories or {}).values()
            for level in ("high", "medium", "low")
        )
    )


def ensure_categories_from_report(categories, report_text):
    """Fill categories from report text when portal parsing returns empty lists."""
    if categories_have_requirements(categories):
        return categories

    reparsed = parse_report_to_categories(report_text)
    if categories_have_requirements(reparsed):
        return reparsed

    priority_buckets = parse_priorities_from_report(report_text)
    if not any(priority_buckets.values()):
        return categories or {}

    merged = dict(categories or {})
    portal = "General Requirements"
    merged.setdefault(portal, {"high": [], "medium": [], "low": []})
    for level in ("high", "medium", "low"):
        merged[portal][level].extend(priority_buckets[level])
    return merged


def find_duplicate_requirements(categories):
    """Find exact duplicate requirements across all categories and priorities."""
    seen = {}
    duplicates = []

    for priority_dict in (categories or {}).values():
        for level in ("high", "medium", "low"):
            for req in priority_dict.get(level, []):
                key = re.sub(r"\s+", " ", str(req).lower().strip())
                if not key:
                    continue
                if key in seen:
                    duplicates.append(
                        {"req1": seen[key], "req2": req, "similarity": 1.0}
                    )
                else:
                    seen[key] = req

    return duplicates


def count_inferred_requirements(report_text):
    """Count vague responses converted in the inferred requirements section."""
    in_inferred = False
    count = 0

    for line in report_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        upper = stripped.upper()
        if "INFERRED REQUIREMENTS" in upper:
            in_inferred = True
            continue

        if in_inferred and upper == stripped and len(stripped) > 3:
            if any(
                marker in upper
                for marker in ("MVP", "SUMMARY", "MCQ", "PORTAL", "MODULE")
            ):
                in_inferred = False
                continue

        if in_inferred and re.match(
            r"^(?:\d+[.)]\s*|-\s*|\*\s*)?(The system shall .+)$",
            stripped,
            re.IGNORECASE,
        ):
            count += 1

    return count


def compute_summary(
    categories,
    mcq_statistics,
    fallback_used,
    report_text="",
    duplicates=None,
    low_quality_count=0,
):
    categories = ensure_categories_from_report(categories, report_text)

    total_reqs = sum(
        len(priority_dict.get(level, []))
        for priority_dict in categories.values()
        for level in ("high", "medium", "low")
    )
    high_count = sum(len(p.get("high", [])) for p in categories.values())
    medium_count = sum(len(p.get("medium", [])) for p in categories.values())
    low_count = sum(len(p.get("low", [])) for p in categories.values())

    if not total_reqs and report_text:
        total_reqs = len(
            re.findall(r"The system shall ", report_text, flags=re.IGNORECASE)
        )
        if total_reqs and not high_count and not medium_count and not low_count:
            medium_count = total_reqs

    duplicate_items = duplicates if duplicates is not None else find_duplicate_requirements(categories)

    return {
        "total_categories": len(categories) or (1 if total_reqs else 0),
        "total_requirements": total_reqs,
        "high_priority_count": high_count,
        "medium_priority_count": medium_count,
        "low_priority_count": low_count,
        "duplicates_found": len(duplicate_items),
        "low_quality_count": low_quality_count,
        "mcq_questions_count": len(mcq_statistics or {}),
        "spelling_corrections_count": 0,
        "fallback_used": fallback_used,
    }


class RunNLPView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
        except Job.DoesNotExist:
            return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

        forms = RequirementForm.objects.filter(job=job)
        if not forms.exists():
            return Response(
                {"error": "No forms found for this job"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submissions = RequirementSubmission.objects.filter(form__in=forms).select_related(
            "form"
        )
        if not submissions.exists():
            return Response(
                {"error": "No submissions found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Idempotency guard ───────────────────────────────────────────
        # Build a fingerprint of the current submission IDs.  If an
        # NLPResult already exists for this exact set of submissions,
        # return the cached result instead of re-running the (expensive)
        # Groq pipeline.
        import hashlib, json as _json
        submission_ids = sorted(submissions.values_list("id", flat=True))
        fingerprint = hashlib.md5(
            _json.dumps(submission_ids).encode()
        ).hexdigest()

        try:
            existing = NLPResult.objects.get(job=job, is_complete=True)
            stored_fp = (existing.statistics or {}).get("_submission_fingerprint")
            if stored_fp == fingerprint:
                # Nothing has changed — return the cached result
                polished = existing.polished_requirements or {}
                return Response(
                    {
                        "message": "NLP result is already up-to-date (no new submissions).",
                        "keywords": existing.keywords,
                        "clusters": existing.clusters,
                        "duplicates": existing.duplicates,
                        "priorities": existing.priorities,
                        "low_quality_requirements": existing.low_quality_requirements,
                        "mcq_statistics": existing.mcq_statistics,
                        "statistics": existing.statistics,
                        "spelling_corrections": getattr(existing, "spelling_corrections", {}),
                        "fallback_used": polished.get("fallback_used", False),
                        "polished_requirements": polished,
                        "is_complete": True,
                        "_cached": True,
                    },
                    status=status.HTTP_200_OK,
                )
        except NLPResult.DoesNotExist:
            pass
        # ── end idempotency guard ────────────────────────────────────────

        raw_data = collect_raw_responses(submissions)
        if not raw_data["raw_entries"]:
            return Response(
                {"error": "No answers found in submissions"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        groq_input = format_raw_for_groq(raw_data)
        fallback_used = False
        categories = {}

        try:
            report_text = groq_process(groq_input)
            categories = parse_report_to_categories(report_text)
        except Exception:
            logger.exception("Groq processing failed; using basic formatter")
            report_text, categories = basic_formatter(raw_data)
            fallback_used = True

        categories = ensure_categories_from_report(categories, report_text)
        duplicates = find_duplicate_requirements(categories)
        low_quality_count = count_inferred_requirements(report_text)

        polished_requirements = {
            "report_text": report_text,
            "fallback_used": fallback_used,
            "categories": categories,
        }

        mcq_statistics = raw_data["mcq_statistics"]
        summary = compute_summary(
            categories,
            mcq_statistics,
            fallback_used,
            report_text,
            duplicates=duplicates,
            low_quality_count=low_quality_count,
        )
        summary["total_submissions"] = submissions.count()
        summary["total_text_answers"] = len(raw_data["raw_entries"])
        summary["_submission_fingerprint"] = fingerprint

        priorities = {
            "high": [
                req
                for portal in categories.values()
                for req in portal.get("high", [])
            ],
            "medium": [
                req
                for portal in categories.values()
                for req in portal.get("medium", [])
            ],
            "low": [
                req
                for portal in categories.values()
                for req in portal.get("low", [])
            ],
        }

        NLPResult.objects.update_or_create(
            job=job,
            defaults={
                "keywords": [],
                "clusters": [],
                "duplicates": duplicates,
                "priorities": priorities,
                "low_quality_requirements": [],
                "mcq_statistics": mcq_statistics,
                "statistics": summary,
                "spelling_corrections": {},
                "polished_requirements": polished_requirements,
                "is_complete": True,
            },
        )

        return Response(
            {
                "message": "NLP analysis complete.",
                "keywords": [],
                "clusters": [],
                "duplicates": duplicates,
                "priorities": priorities,
                "low_quality_requirements": [],
                "mcq_statistics": mcq_statistics,
                "statistics": summary,
                "spelling_corrections": {},
                "fallback_used": fallback_used,
                "polished_requirements": polished_requirements,
                "is_complete": True,
            },
            status=status.HTTP_200_OK,
        )


class GetNLPResultView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def get(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
            nlp_result = NLPResult.objects.get(job=job)
        except Job.DoesNotExist:
            return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)
        except NLPResult.DoesNotExist:
            return Response(
                {"error": "NLP result not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        polished = nlp_result.polished_requirements or {}

        return Response(
            {
                "keywords": nlp_result.keywords,
                "clusters": nlp_result.clusters,
                "duplicates": nlp_result.duplicates,
                "priorities": nlp_result.priorities,
                "low_quality_requirements": nlp_result.low_quality_requirements,
                "mcq_statistics": nlp_result.mcq_statistics,
                "statistics": nlp_result.statistics,
                "spelling_corrections": getattr(nlp_result, "spelling_corrections", {}),
                "is_complete": nlp_result.is_complete,
                "processed_at": nlp_result.processed_at,
                "polished_requirements": polished,
                "fallback_used": polished.get("fallback_used", False),
            }
        )