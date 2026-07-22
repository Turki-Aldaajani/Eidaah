# video_filters.py
# C4 · Hard video filters. A video must clear ALL of these to be a candidate.
#
# Rules (from the C4 spec):
#   * duration strictly greater than 59 seconds  -> excludes Shorts
#   * published within the last N years (default 5; the recommender tries 3 first)
#   * not Live and not an upcoming Premiere
#   * not private / deleted / otherwise unavailable
#
# Works on the normalized video dict produced by video_provider (so it is
# provider-agnostic and unit-testable with plain dicts).

from datetime import datetime, timezone

MIN_DURATION_SECONDS = 60          # "> 59 ثانية"
PREFERRED_MAX_AGE_YEARS = 3
DEFAULT_MAX_AGE_YEARS = 5

# Statuses that mean the video cannot be watched.
_UNAVAILABLE_STATUSES = {"private", "deleted", "unlisted", "rejected", "failed"}
# liveBroadcastContent values that are not a normal on-demand video.
_LIVE_STATES = {"live", "upcoming"}


def _now(now=None):
    if now is None:
        return datetime.now(timezone.utc)
    if now.tzinfo is None:
        return now.replace(tzinfo=timezone.utc)
    return now


def parse_published(published_at):
    """Parse an ISO-8601 / RFC-3339 timestamp (YouTube 'publishedAt'). None on failure."""
    if not published_at:
        return None
    if isinstance(published_at, datetime):
        return published_at if published_at.tzinfo else published_at.replace(tzinfo=timezone.utc)
    s = str(published_at).strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def is_recent(published_at, now=None, max_age_years=DEFAULT_MAX_AGE_YEARS):
    dt = parse_published(published_at)
    if dt is None:
        return False
    age_days = (_now(now) - dt).days
    return 0 <= age_days <= max_age_years * 365 + 2  # small leap-day slack


def passes_filters(video, now=None, min_duration=MIN_DURATION_SECONDS,
                   max_age_years=DEFAULT_MAX_AGE_YEARS):
    """True if the video clears every hard filter."""
    # duration
    dur = video.get("duration_seconds")
    if dur is None or dur < min_duration:
        return False
    # live / premiere
    if (video.get("live_broadcast_content") or "none") in _LIVE_STATES:
        return False
    # availability
    status = (video.get("status") or "public").lower()
    if status in _UNAVAILABLE_STATUSES:
        return False
    if video.get("is_public") is False:
        return False
    # recency
    if not is_recent(video.get("published_at"), now=now, max_age_years=max_age_years):
        return False
    return True


def filter_videos(videos, now=None, min_duration=MIN_DURATION_SECONDS,
                  max_age_years=DEFAULT_MAX_AGE_YEARS):
    """Keep only videos that pass every hard filter (order preserved)."""
    return [v for v in videos if passes_filters(v, now, min_duration, max_age_years)]
