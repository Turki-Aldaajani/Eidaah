# video_relevance.py
# C4 · LLM relevance scoring (the "make it smarter than YouTube search" idea).
#
# After candidates are fetched, ONE Groq call rates how well each video's TITLE
# + DESCRIPTION matches the specific lesson/grade/subject. The score is used in
# ranking ONLY and is never shown to the student. Cheap (short text, one call),
# but it disambiguates videos whose titles look alike across grades/curricula.
#
# Dependency-injected: takes call_groq_fn, so it is fully offline-testable with
# a fake — same pattern as topic_detector / question_generator / metadata_generator.

import json

_MAX_VIDEOS = 15          # cap what we send in one call
_DESC_CAP = 200           # chars of description per video


def _strip_code_fences(raw):
    cleaned = (raw or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    return cleaned.strip()


def score_relevance(context, videos, call_groq_fn):
    """
    Return a dict {video_id -> relevance in 0..1}. On any failure returns {}
    (the ranker then treats relevance as neutral). Never raises.

    context: {"lesson", "subject_name", "grade_name"}
    videos:  normalized dicts with video_id / title / description.
    """
    if not videos or call_groq_fn is None:
        return {}

    items = []
    for v in videos[:_MAX_VIDEOS]:
        vid = v.get("video_id")
        if not vid:
            continue
        desc = (v.get("description") or "").strip().replace("\n", " ")[:_DESC_CAP]
        items.append({"id": vid, "title": v.get("title", ""), "desc": desc})

    if not items:
        return {}

    lesson = context.get("lesson_title") or context.get("lesson") or ""
    grade = context.get("grade_name", "")
    subject = context.get("subject_name", "")

    prompt = (
        "You rate how well each YouTube video matches a specific school lesson, "
        "using ONLY the title and description.\n"
        f"Lesson: {lesson}\nالسنة/الصف: {grade}\nSubject: {subject}\n\n"
        "For every video below, give an integer relevance from 0 (unrelated) to "
        "100 (an exact match for THIS lesson, grade and subject). Penalise videos "
        "that are for a different grade or a different topic even if the words look similar.\n"
        "Respond ONLY with a JSON object mapping id -> integer, nothing else. "
        'Example: {"abc123": 92, "def456": 20}\n\n'
        "Videos:\n"
        + "\n".join(f'- id={it["id"]} | {it["title"]} | {it["desc"]}' for it in items)
    )

    known = {it["id"] for it in items}

    try:
        # reasoning_effort="low": see metadata_generator.py for the full
        # explanation — at the default "medium" effort, gpt-oss-120b's hidden
        # reasoning tokens intermittently consumed the whole max_tokens budget
        # on this JSON-only prompt, returning empty content and silently
        # dropping relevance from ranking. Reproduced live against this exact
        # call; "low" effort + more headroom eliminated it.
        raw = call_groq_fn(prompt=prompt, max_tokens=500, temperature=0.0, reasoning_effort="low")
        data = json.loads(_strip_code_fences(raw))
        if not isinstance(data, dict):
            return {}
        out = {}
        for vid, val in data.items():
            if vid not in known:            # ignore ids the model invented
                continue
            if isinstance(val, bool):        # bool is not a valid score
                continue
            try:
                out[vid] = max(0.0, min(1.0, float(val) / 100.0))
            except (TypeError, ValueError):
                continue
        return out
    except Exception as e:
        print(f"⚠️  Relevance scoring failed ({e}); ranking without it.")
        return {}
