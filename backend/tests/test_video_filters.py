import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, timezone, timedelta

from video_filters import passes_filters, filter_videos, is_recent, parse_published

NOW = datetime(2026, 7, 22, tzinfo=timezone.utc)


def make_video(**over):
    base = {
        "video_id": "v1",
        "duration_seconds": 600,
        "live_broadcast_content": "none",
        "status": "public",
        "published_at": (NOW - timedelta(days=200)).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    base.update(over)
    return base


def test_accepts_a_normal_recent_video():
    assert passes_filters(make_video(), now=NOW) is True


def test_rejects_short_videos_under_60s():
    assert passes_filters(make_video(duration_seconds=59), now=NOW) is False
    assert passes_filters(make_video(duration_seconds=60), now=NOW) is True
    assert passes_filters(make_video(duration_seconds=None), now=NOW) is False


def test_rejects_live_and_upcoming_premieres():
    assert passes_filters(make_video(live_broadcast_content="live"), now=NOW) is False
    assert passes_filters(make_video(live_broadcast_content="upcoming"), now=NOW) is False


def test_rejects_private_and_deleted():
    assert passes_filters(make_video(status="private"), now=NOW) is False
    assert passes_filters(make_video(status="deleted"), now=NOW) is False
    assert passes_filters(make_video(is_public=False), now=NOW) is False


def test_rejects_videos_older_than_max_age():
    old = (NOW - timedelta(days=6 * 365)).strftime("%Y-%m-%dT%H:%M:%SZ")
    assert passes_filters(make_video(published_at=old), now=NOW, max_age_years=5) is False
    within5 = (NOW - timedelta(days=4 * 365)).strftime("%Y-%m-%dT%H:%M:%SZ")
    assert passes_filters(make_video(published_at=within5), now=NOW, max_age_years=5) is True
    # but the same video fails the stricter 3-year window
    assert passes_filters(make_video(published_at=within5), now=NOW, max_age_years=3) is False


def test_missing_or_bad_publish_date_is_rejected():
    assert passes_filters(make_video(published_at=""), now=NOW) is False
    assert passes_filters(make_video(published_at="not-a-date"), now=NOW) is False


def test_filter_videos_preserves_order_of_survivors():
    vids = [
        make_video(video_id="a"),
        make_video(video_id="b", duration_seconds=10),   # dropped (short)
        make_video(video_id="c"),
    ]
    kept = [v["video_id"] for v in filter_videos(vids, now=NOW)]
    assert kept == ["a", "c"]


def test_parse_published_handles_z_and_offset():
    assert parse_published("2026-01-01T00:00:00Z").year == 2026
    assert parse_published("2026-01-01T00:00:00+03:00").tzinfo is not None
    assert parse_published(None) is None
