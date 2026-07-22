# video_cache.py
# C4 · PR 2 — Supabase-backed recommendation cache (replaces the in-memory dict).
#
# One row per cached video, keyed by (cache_key, video_id). The full frontend
# payload is stored as JSONB so a cache hit is a pure read with NO YouTube/Groq
# calls. Degrades gracefully: when Supabase is not configured, get_cached returns
# None and set_cached is a no-op, so the endpoint just recomputes each time.

from datetime import datetime, timezone, timedelta

from supabase_client import get_client

TABLE = "video_cache"
DEFAULT_TTL_SECONDS = 6 * 3600  # 6 hours


def make_cache_key(lesson, subject_id=None, grade_name=None, limit=8):
    """Stable string identity for a recommendation query."""
    parts = [(subject_id or "").strip(), (grade_name or "").strip(),
             (lesson or "").strip(), str(limit)]
    return "|".join(parts)


def _now(now=None):
    return now or datetime.now(timezone.utc)


def get_cached(cache_key, client=None, now=None):
    """Return the cached list of video payloads for a key, or None on miss/no-DB."""
    client = client if client is not None else get_client()
    if client is None:
        return None
    try:
        rows = (client.table(TABLE).select("*")
                .eq("cache_key", cache_key)
                .gt("expires_at", _now(now).isoformat())
                .order("rank")
                .execute().data) or []
        if not rows:
            return None
        return [r["payload"] for r in rows]
    except Exception as e:
        print(f"⚠️  video_cache read failed ({e}); treating as a miss.")
        return None


def set_cached(cache_key, videos, ttl_seconds=DEFAULT_TTL_SECONDS, client=None, now=None):
    """Store the ranked videos for a key (replacing any previous rows). No-op without a DB."""
    client = client if client is not None else get_client()
    if client is None:
        return False
    try:
        expires_at = (_now(now) + timedelta(seconds=ttl_seconds)).isoformat()
        # replace any stale rows for this query
        client.table(TABLE).delete().eq("cache_key", cache_key).execute()
        rows = [{
            "cache_key": cache_key,
            "video_id": v.get("video_id"),
            "rank": i,
            "title": v.get("title"),
            "channel_title": v.get("channel_title"),
            "published_at": v.get("published_at") or None,
            "duration_seconds": v.get("duration_seconds"),
            "view_count": v.get("view_count"),
            "approved": bool(v.get("approved")),
            "pinned": False,
            "payload": v,
            "expires_at": expires_at,
        } for i, v in enumerate(videos) if v.get("video_id")]
        if rows:
            client.table(TABLE).insert(rows).execute()
        return True
    except Exception as e:
        print(f"⚠️  video_cache write failed ({e}); continuing without caching.")
        return False
