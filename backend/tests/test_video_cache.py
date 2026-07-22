import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timezone, timedelta

from fake_supabase import FakeSupabase
from video_cache import get_cached, set_cached, make_cache_key

NOW = datetime(2026, 7, 22, 12, 0, 0, tzinfo=timezone.utc)

VIDEOS = [
    {"video_id": "v1", "title": "شرح 1", "channel_title": "قناة", "approved": True,
     "duration_seconds": 600, "view_count": 1000, "published_at": "2026-01-01T00:00:00Z", "badge": "قناة معتمدة"},
    {"video_id": "v2", "title": "شرح 2", "channel_title": "قناة", "approved": False,
     "duration_seconds": 700, "view_count": 2000, "published_at": "2026-02-01T00:00:00Z", "badge": None},
]


def test_make_cache_key_is_stable_and_distinct():
    k1 = make_cache_key("الأعداد النسبية", "math", "الصف الأول المتوسط", 8)
    k2 = make_cache_key("الأعداد النسبية", "math", "الصف الأول المتوسط", 8)
    k3 = make_cache_key("الأعداد النسبية", "math", "الصف الثاني المتوسط", 8)
    assert k1 == k2 and k1 != k3


def test_set_then_get_round_trips_full_payload_in_rank_order():
    db = FakeSupabase()
    key = make_cache_key("درس", "math", "صف", 8)
    assert set_cached(key, VIDEOS, client=db, now=NOW) is True

    got = get_cached(key, client=db, now=NOW)
    assert got is not None
    assert [v["video_id"] for v in got] == ["v1", "v2"]     # rank preserved
    assert got[0]["badge"] == "قناة معتمدة"                  # full payload kept


def test_get_returns_none_on_miss():
    db = FakeSupabase()
    assert get_cached(make_cache_key("x", "math", "y", 8), client=db, now=NOW) is None


def test_expired_rows_are_not_returned():
    db = FakeSupabase()
    key = make_cache_key("درس", "math", "صف", 8)
    set_cached(key, VIDEOS, ttl_seconds=3600, client=db, now=NOW)

    later = NOW + timedelta(hours=2)  # past the 1h TTL
    assert get_cached(key, client=db, now=later) is None


def test_set_replaces_previous_rows_for_the_same_key():
    db = FakeSupabase()
    key = make_cache_key("درس", "math", "صف", 8)
    set_cached(key, VIDEOS, client=db, now=NOW)
    set_cached(key, [VIDEOS[0]], client=db, now=NOW)      # fewer results now

    got = get_cached(key, client=db, now=NOW)
    assert [v["video_id"] for v in got] == ["v1"]
    # no orphaned rows left behind
    assert len(db.rows("video_cache")) == 1


def test_no_client_is_a_graceful_noop():
    assert get_cached("k", client=None) is None
    assert set_cached("k", VIDEOS, client=None) is False
