# video_recommender.py
# C4 · Recommendation orchestrator. Provider- and LLM-agnostic (both injected),
# so the whole pipeline is unit-testable offline.
#
# Pipeline:
#   1. Smart Query Builder            -> ordered candidate queries
#   2. Approved-channels-first search -> if ANY approved result survives the
#      filters, use ONLY those (MVP policy); otherwise fall back to general.
#   3. Hard filters (duration/recency/live/availability), 3y preferred -> 5y.
#   4. LLM relevance (one hidden call) -> relevance map fed into ranking.
#   5. Ranking Engine -> top N, approved always on top, with a badge flag.

from video_query_builder import build_queries, primary_query
from video_filters import filter_videos, PREFERRED_MAX_AGE_YEARS, DEFAULT_MAX_AGE_YEARS
from video_ranker import rank_videos
from video_relevance import score_relevance
from approved_channels import approved_channels_for

APPROVED_BADGE = "قناة معتمدة"


def _dedupe(videos):
    seen, out = set(), []
    for v in videos:
        vid = v.get("video_id")
        if vid and vid not in seen:
            seen.add(vid)
            out.append(v)
    return out


def _filter_with_relax(videos, now, min_results):
    """Prefer the last 3 years; widen to 5 only if that yields too few."""
    strict = filter_videos(videos, now=now, max_age_years=PREFERRED_MAX_AGE_YEARS)
    if len(strict) >= min_results:
        return strict
    relaxed = filter_videos(videos, now=now, max_age_years=DEFAULT_MAX_AGE_YEARS)
    return relaxed if len(relaxed) > len(strict) else strict


def _search_approved(provider, queries, approved, published_after):
    """Search each approved channel (priority order) with the primary query."""
    approved_ids = {}
    pool = []
    q = queries[0]
    for ch in approved:
        cid = provider.resolve_channel_id(ch["handle"])
        if not cid:
            continue
        approved_ids[cid] = ch["priority"]
        pool.extend(provider.search(q, channel_id=cid, max_results=10,
                                    published_after=published_after))
    return pool, approved_ids


def _search_general(provider, queries, published_after, target):
    """Try queries in order, accumulating until we have enough raw results."""
    pool = []
    for q in queries:
        pool.extend(provider.search(q, max_results=10, published_after=published_after))
        if len(_dedupe(pool)) >= target:
            break
    return pool


def recommend_videos(lesson_title, subject_id=None, subject_name=None, grade_name=None,
                     provider=None, call_groq_fn=None, ratings=None, now=None,
                     limit=8, min_results=3, published_after=None):
    """Return up to `limit` ranked, filtered, badge-annotated video dicts."""
    if provider is None:
        return []
    queries = build_queries(lesson_title, subject_name, grade_name)
    if not queries:
        return []

    context = {
        "lesson": lesson_title,
        "subject_name": subject_name or "",
        "grade_name": grade_name or "",
        "primary_query": primary_query(lesson_title, subject_name, grade_name),
        "now": now,
    }

    approved = approved_channels_for(subject_id) if subject_id else []

    # 1) approved-channels-first
    raw, approved_ids = _search_approved(provider, queries, approved, published_after)
    pool = _filter_with_relax(_dedupe(raw), now, min_results)

    # 2) general fallback ONLY when approved yields nothing (MVP policy)
    if not pool:
        raw = _search_general(provider, queries, published_after, target=limit * 2)
        pool = _filter_with_relax(_dedupe(raw), now, min_results)

    if not pool:
        return []

    # annotate each candidate with the approved flag + badge (for the payload)
    approved_id_set = set(approved_ids)
    for v in pool:
        v["approved"] = v.get("channel_id") in approved_id_set
        v["badge"] = APPROVED_BADGE if v["approved"] else None

    # 4) hidden LLM relevance (one call) -> {video_id: 0..1} map fed into ranking
    relevance = score_relevance(context, pool, call_groq_fn) if call_groq_fn else {}

    # 5) rank: approved always first; relevance + ratings maps keyed by video_id
    ranked = rank_videos(pool, context, approved_ids=approved_id_set,
                         relevance=relevance, ratings=ratings)
    return ranked[:limit]


def to_public_video(v):
    """Trim a ranked video to the fields the frontend needs (the raw LLM
    relevance number stays hidden; match_score is the final composite ranking
    score, already used to order results, so exposing it isn't a new leak)."""
    return {
        "video_id": v.get("video_id"),
        "title": v.get("title", ""),
        "url": v.get("url", ""),
        "thumbnail_url": v.get("thumbnail_url", ""),
        "channel_title": v.get("channel_title", ""),
        "channel_id": v.get("channel_id", ""),
        "published_at": v.get("published_at", ""),
        "duration_seconds": v.get("duration_seconds", 0),
        "view_count": v.get("view_count", 0),
        "approved": bool(v.get("approved")),
        "badge": v.get("badge"),
        "source": v.get("source", "youtube"),
        "match_score": v.get("score", 0),
    }
