"""Shared structured model consumed by PDF, DOCX, and CSV renderers."""

import re
from datetime import datetime, timezone

PRIORITY_LABELS = {"high": "HIGH", "medium": "MEDIUM", "low": "LOW"}
FEATURE_COL_WIDTH = 52
PRIORITY_COL_WIDTH = 8


def sanitize_description(text):
    if not text:
        return ""
    cleaned = re.sub(r"\s+", " ", str(text).strip())
    cleaned = re.sub(
        r"\b(um+|uh+|like|you know|kind of|sort of)\b",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,.;")
    if cleaned and cleaned[0].islower():
        cleaned = cleaned[0].upper() + cleaned[1:]
    if cleaned and cleaned[-1] not in ".!?":
        cleaned += "."
    return cleaned


def _format_timestamp(generated_at):
    if generated_at is None:
        ts = datetime.now(timezone.utc)
    elif hasattr(generated_at, "strftime"):
        ts = generated_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
    else:
        ts = datetime.now(timezone.utc)
    return ts.strftime("%B %d, %Y %H:%M UTC")


def _parse_report_text_requirements(report_text):
    groups = {}
    current_category = "General Requirements"
    current_priority = "MEDIUM"
    req_id = 0
    skip_markers = ("MVP RECOMMENDATION", "SUMMARY", "MCQ", "INFERRED REQUIREMENTS")

    for line in report_text.splitlines():
        stripped = line.strip()
        if not stripped or set(stripped) <= {"-", "=", "*", "#"}:
            continue

        upper = stripped.upper()
        if any(marker in upper for marker in skip_markers) and upper == stripped:
            continue

        if re.search(r"\bHIGH\s+PRIORITY\b", upper) or upper.startswith("HIGH:"):
            current_priority = "HIGH"
            continue
        if re.search(r"\bMEDIUM\s+PRIORITY\b", upper) or upper.startswith("MEDIUM:"):
            current_priority = "MEDIUM"
            continue
        if re.search(r"\bLOW\s+PRIORITY\b", upper) or upper.startswith("LOW:"):
            current_priority = "LOW"
            continue

        req_match = re.match(
            r"^(?:\d+[.)]\s*|-\s*|\*\s*)?(The system shall .+)$",
            stripped,
            re.IGNORECASE,
        )
        if req_match:
            req_id += 1
            text = req_match.group(1).strip()
            if not text.endswith("."):
                text += "."
            groups.setdefault(current_category, [])
            groups[current_category].append(
                {
                    "id": req_id,
                    "text": text,
                    "priority": current_priority,
                    "category": current_category,
                }
            )
            continue

        is_heading = (
            upper == stripped
            and len(stripped) > 3
            and not stripped.startswith("-")
            and not stripped.startswith("The system shall")
        )
        if is_heading and not any(marker in upper for marker in skip_markers):
            current_category = stripped.title()
            current_priority = "MEDIUM"

    return [
        {"title": title, "items": items}
        for title, items in groups.items()
        if items
    ]


def _collect_requirement_groups(content, polished, report_text):
    polished_cats = polished.get("categories") or {}
    groups = []
    req_id = 0

    if polished_cats:
        for cat_name, priority_dict in polished_cats.items():
            items = []
            for level in ("high", "medium", "low"):
                for req in priority_dict.get(level) or []:
                    req_id += 1
                    items.append(
                        {
                            "id": req_id,
                            "text": str(req).strip(),
                            "priority": PRIORITY_LABELS[level],
                            "category": cat_name,
                        }
                    )
            if items:
                groups.append({"title": cat_name, "items": items})
        return groups

    if report_text:
        parsed = _parse_report_text_requirements(report_text)
        if parsed:
            return parsed

    priorities = content.get("priorities") or {}
    for cat in content.get("categorized_requirements") or []:
        items = []
        cat_name = cat.get("category", "Category")
        for req in cat.get("requirements") or []:
            req_id += 1
            priority = "MEDIUM"
            if req in priorities.get("high", []):
                priority = "HIGH"
            elif req in priorities.get("low", []):
                priority = "LOW"
            items.append(
                {
                    "id": req_id,
                    "text": str(req).strip(),
                    "priority": priority,
                    "category": cat_name,
                }
            )
        if items:
            groups.append({"title": cat_name, "items": items})

    return groups


def format_priority_row(feature, priority):
    feature_part = str(feature)[:FEATURE_COL_WIDTH].rjust(FEATURE_COL_WIDTH)
    priority_part = str(priority)[:PRIORITY_COL_WIDTH].ljust(PRIORITY_COL_WIDTH)
    return f"{feature_part}  {priority_part}"


def build_export_model(content, generated_at=None):
    if not isinstance(content, dict):
        content = {}

    polished = content.get("polished_requirements") or {}
    report_text = (polished.get("report_text") or "").strip()
    requirement_groups = _collect_requirement_groups(content, polished, report_text)
    narrative_text = report_text if report_text and not requirement_groups else ""

    summary = content.get("summary") or {}
    summary_rows = [
        ("Total categories", summary.get("total_categories", 0)),
        ("Total requirements", summary.get("total_requirements", 0)),
        ("High priority", summary.get("high_priority_count", 0)),
        ("Medium priority", summary.get("medium_priority_count", 0)),
        ("Low priority", summary.get("low_priority_count", 0)),
        ("Duplicates found", summary.get("duplicates_found", 0)),
        ("Low quality / vague", summary.get("low_quality_count", 0)),
        ("MCQ questions analysed", summary.get("mcq_questions_count", 0)),
    ]

    mcq_sections = []
    for question, data in (content.get("mcq_statistics") or {}).items():
        total = data.get("total_responses") or 0
        options = []
        for option, count in sorted(
            (data.get("options") or {}).items(),
            key=lambda item: item[1],
            reverse=True,
        ):
            pct = round((count / total) * 100) if total else 0
            options.append({"option": option, "count": count, "percent": pct})
        mcq_sections.append(
            {
                "question": question,
                "total_responses": total,
                "top_choice": data.get("top_choice") or "N/A",
                "options": options,
            }
        )

    return {
        "title": "Requirements Report",
        "project_name": content.get("job_title") or "Untitled Project",
        "description": sanitize_description(content.get("job_description")),
        "generated_at": _format_timestamp(generated_at),
        "summary_rows": summary_rows,
        "narrative_text": narrative_text,
        "requirement_groups": requirement_groups,
        "mcq_sections": mcq_sections,
        "keywords": [str(k) for k in (content.get("keywords") or []) if k],
        "low_quality": [str(v) for v in (content.get("low_quality_requirements") or []) if v],
        "spelling_corrections": [
            {"original": str(k), "corrected": str(v)}
            for k, v in (content.get("spelling_corrections") or {}).items()
        ],
        "duplicates": content.get("duplicates_removed") or [],
    }


def iter_csv_records(model):
    yield ("Header", "", "Project", model["project_name"])
    yield ("Header", "", "Description", model["description"])
    yield ("Header", "", "Generated", model["generated_at"])

    for index, (label, value) in enumerate(model["summary_rows"], start=1):
        yield ("Summary", str(index), label, str(value))

    for group in model["requirement_groups"]:
        for item in group["items"]:
            yield ("Requirements", str(item["id"]), "Category", item["category"])
            yield ("Requirements", str(item["id"]), "Priority", item["priority"])
            yield ("Requirements", str(item["id"]), "Requirement", item["text"])

    if model["narrative_text"]:
        yield ("Narrative", "1", "Report Text", model["narrative_text"])

    mcq_id = 0
    for section in model["mcq_sections"]:
        mcq_id += 1
        prefix = str(mcq_id)
        yield ("MCQ", prefix, "Question", section["question"])
        yield ("MCQ", prefix, "Total Responses", str(section["total_responses"]))
        yield ("MCQ", prefix, "Top Choice", section["top_choice"])
        for option in section["options"]:
            yield (
                "MCQ",
                prefix,
                option["option"],
                f'{option["count"]} votes ({option["percent"]}%)',
            )

    for index, keyword in enumerate(model["keywords"], start=1):
        yield ("Keywords", str(index), "Keyword", keyword)

    for index, item in enumerate(model["low_quality"], start=1):
        yield ("Low Quality", str(index), "Response", item)

    for index, item in enumerate(model["spelling_corrections"], start=1):
        yield ("Spelling", str(index), "Original", item["original"])
        yield ("Spelling", str(index), "Corrected", item["corrected"])

    for index, dup in enumerate(model["duplicates"], start=1):
        prefix = str(index)
        yield ("Duplicates", prefix, "Requirement", dup.get("req1", ""))
        similarity = round(float(dup.get("similarity", 0)) * 100)
        yield (
            "Duplicates",
            prefix,
            "Similar To",
            f'{dup.get("req2", "")} ({similarity}% similar)',
        )
