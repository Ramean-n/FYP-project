"""Rule-based report formatter used when Groq is unavailable."""

FALLBACK_NOTICE = (
    "Note: AI polishing unavailable. Showing raw formatted requirements."
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


def _format_requirement(text):
    text = str(text).strip()
    if not text:
        return ""
    lower = text.lower()
    if lower.startswith("the system shall"):
        return text if text.endswith(".") else text + "."
    return f"The system shall {text.rstrip('.')}."


def _build_categories(grouped_requirements):
    categories = {}
    for portal, reqs in grouped_requirements.items():
        categories[portal] = {"high": [], "medium": [], "low": []}
        for req in reqs:
            formal = _format_requirement(req["text"])
            if formal:
                categories[portal][req["priority"]].append(formal)
    return categories


def basic_formatter(raw_data):
    """
    Format raw form responses without AI.

    Returns:
        tuple[str, dict]: (report_text, categories dict for UI compatibility)
    """
    grouped = raw_data.get("grouped_requirements") or {}
    mcq_statistics = raw_data.get("mcq_statistics") or {}
    categories = _build_categories(grouped)

    lines = [FALLBACK_NOTICE, ""]

    for portal, reqs in grouped.items():
        lines.append(portal.upper())
        lines.append("-" * len(portal))
        for req in reqs:
            formal = _format_requirement(req["text"])
            if formal:
                lines.append(f"  [{req['priority'].upper()} PRIORITY] {formal}")
        lines.append("")

    if mcq_statistics:
        lines.append("MCQ / CHOICE QUESTION RESULTS")
        lines.append("-" * 30)
        for question, stats in mcq_statistics.items():
            lines.append(f"Q: {question}")
            lines.append(f"   Total responses: {stats.get('total_responses', 0)}")
            lines.append(f"   Top choice: {stats.get('top_choice', 'N/A')}")
            lines.append("   Breakdown:")
            for option, count in sorted(
                (stats.get("options") or {}).items(),
                key=lambda x: x[1],
                reverse=True,
            ):
                lines.append(f"     - {option}: {count} vote(s)")
            lines.append("")

    return "\n".join(lines).strip(), categories
