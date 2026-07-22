# video_query_builder.py
# C4 · Smart Query Builder.
#
# Builds YouTube search queries from CURRICULUM context (lesson + subject +
# grade) rather than a naive lesson name. Teachers rarely write "المنهج
# السعودي" in titles, but they DO write the grade + subject, e.g.
# "الأعداد النسبية أول متوسط رياضيات". We return several ordered candidate
# queries so the recommender can try the next one when a query is too narrow.

import re

# Arabic-Indic / Eastern-Arabic digits are irrelevant here; queries are words.
_AL_PREFIX = "ال"


def short_grade(grade_name):
    """
    Turn a full grade name into the short form teachers actually type.
    "الصف الأول المتوسط" -> "أول متوسط"
    "الصف الثالث المتوسط" -> "ثالث متوسط"
    Returns "" for an empty input.
    """
    if not grade_name:
        return ""
    g = grade_name.replace("الصف", " ").strip()
    words = []
    for w in g.split():
        # drop a leading "ال" definite article ("الأول" -> "أول", "المتوسط" -> "متوسط")
        if w.startswith(_AL_PREFIX) and len(w) > len(_AL_PREFIX):
            w = w[len(_AL_PREFIX):]
        words.append(w)
    return " ".join(words).strip()


def _norm(s):
    return re.sub(r"\s+", " ", (s or "").strip())


def build_queries(lesson_title, subject_name=None, grade_name=None):
    """
    Return an ordered, de-duplicated list of candidate search queries.

    Ordering (most specific / most likely to match a real teacher upload first):
      1. lesson + short grade + subject   -> "الأعداد النسبية أول متوسط رياضيات"
      2. lesson + full grade              -> "الأعداد النسبية الصف الأول المتوسط"
      3. "درس " + lesson + short grade    -> "درس الأعداد النسبية أول متوسط"
      4. subject + short grade + lesson   -> "رياضيات أول متوسط الأعداد النسبية"
    Missing pieces are skipped; the lesson title is always required.
    """
    lesson = _norm(lesson_title)
    if not lesson:
        return []
    subject = _norm(subject_name)
    grade_full = _norm(grade_name)
    grade_short = short_grade(grade_full)

    candidates = [
        " ".join(p for p in [lesson, grade_short, subject] if p),
        " ".join(p for p in [lesson, grade_full] if p),
    ]
    # The "درس …" and subject-led variants only add value when they carry the
    # grade / subject context — otherwise they just duplicate the lesson.
    if grade_short:
        candidates.append(_norm(f"درس {lesson} {grade_short}"))
    if subject:
        candidates.append(" ".join(p for p in [subject, grade_short, lesson] if p))

    seen = set()
    out = []
    for q in candidates:
        q = _norm(q)
        if q and q not in seen:
            seen.add(q)
            out.append(q)
    return out


def primary_query(lesson_title, subject_name=None, grade_name=None):
    """The single best query — the first candidate, or "" if none."""
    qs = build_queries(lesson_title, subject_name, grade_name)
    return qs[0] if qs else ""
