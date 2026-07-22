# video_ranker.py
# C4 · Ranking Engine.
#
# Every candidate video gets a numeric score; results are sorted descending, and
# approved-channel videos ALWAYS rank above non-approved ones (spec requirement)
# regardless of raw score — enforced by a two-key sort.
#
# Score weights (C4 spec) + the hidden LLM-relevance bonus:
#   lesson name in title .......... +40
#   grade in title ................ +35
#   subject in title .............. +20
#   from an approved channel ...... +100
#   exact match with the query .... +25
#   view count (normalized) ....... +10
#   in-app rating (phase 2) ....... +30
#   recency ....................... +15
#   LLM relevance (0..1) .......... x 50   (hidden from the user, ranking only)
#
# Pure functions over the normalized video dict. approved_ids / relevance /
# ratings are passed in as (set / map / map); no I/O — fully unit-testable.

import math
import re
from datetime import datetime, timezone

from video_filters import parse_published
from video_query_builder import short_grade

W_LESSON = 40
W_GRADE = 35
W_SUBJECT = 20
W_APPROVED = 100
W_EXACT_QUERY = 25
W_VIEWS = 10
W_RATING = 30
W_RECENCY = 15
W_RELEVANCE = 50


def _norm(s):
    return re.sub(r"\s+", " ", (s or "").strip()).lower()


def _contains_all_tokens(haystack, phrase):
    """True if every token of `phrase` appears in `haystack` (order-independent)."""
    h = _norm(haystack)
    toks = [t for t in _norm(phrase).split() if t]
    return bool(toks) and all(t in h for t in toks)


def _grade_tokens(grade_name):
    """Identifying tokens from both the full and short grade forms."""
    toks = set()
    for form in (grade_name, short_grade(grade_name)):
        for t in _norm(form).split():
            if t and t != "الصف":
                toks.add(t)
    return toks


def _views_score(view_count):
    if not view_count or view_count <= 0:
        return 0.0
    # log scale: ~10k -> ~4, ~100k -> ~5, ~1M -> ~6 ; capped at W_VIEWS
    return min(W_VIEWS, math.log10(view_count) * (W_VIEWS / 6.0))


def _recency_score(published_at, now=None):
    dt = parse_published(published_at)
    if dt is None:
        return 0.0
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    age_years = max(0.0, (now - dt).days / 365.0)
    return max(0.0, W_RECENCY * (1 - age_years / 5.0))


def _rating_score(video_id, ratings):
    """In-app 👍/👎 signal. `ratings` maps video_id -> {"up","down"}. Phase-2 data."""
    if not ratings:
        return 0.0
    r = ratings.get(video_id) or {}
    up, down = r.get("up", 0), r.get("down", 0)
    total = up + down
    if total == 0:
        return 0.0
    return W_RATING * (up - down) / total  # in [-W_RATING, +W_RATING]


def score_video(video, context, approved_ids=None, relevance=None, ratings=None):
    """
    Compute the ranking score for one normalized video dict.

    context: {"lesson", "subject_name", "grade_name", "primary_query", "now"}
    approved_ids: set of approved channel_ids (or video carries approved=True).
    relevance:    map video_id -> float 0..1 (LLM), optional.
    ratings:      map video_id -> {"up","down"}, optional.
    """
    approved_ids = approved_ids or set()
    title = video.get("title", "")
    vid = video.get("video_id")

    score = 0.0
    if context.get("lesson") and _contains_all_tokens(title, context["lesson"]):
        score += W_LESSON
    grade_toks = _grade_tokens(context.get("grade_name"))
    if grade_toks and all(t in _norm(title) for t in grade_toks):
        score += W_GRADE
    if context.get("subject_name") and _norm(context["subject_name"]) in _norm(title):
        score += W_SUBJECT

    if bool(video.get("approved")) or (video.get("channel_id") in approved_ids):
        score += W_APPROVED

    if context.get("primary_query") and _norm(context["primary_query"]) in _norm(title):
        score += W_EXACT_QUERY

    score += _views_score(video.get("view_count"))
    score += _rating_score(vid, ratings)
    score += _recency_score(video.get("published_at"), now=context.get("now"))

    if relevance and vid in relevance:
        try:
            score += W_RELEVANCE * max(0.0, min(1.0, float(relevance[vid])))
        except (TypeError, ValueError):
            pass

    return score


def rank_videos(videos, context, approved_ids=None, relevance=None, ratings=None):
    """
    Return a new list of videos sorted best-first. Each video is annotated with
    `score` and `approved`. Approved channels always rank above non-approved.
    """
    approved_ids = approved_ids or set()
    out = []
    for v in videos:
        v = dict(v)
        v["approved"] = bool(v.get("approved")) or (v.get("channel_id") in approved_ids)
        v["score"] = round(score_video(v, context, approved_ids, relevance, ratings), 3)
        out.append(v)
    out.sort(key=lambda v: (1 if v["approved"] else 0, v["score"]), reverse=True)
    return out
