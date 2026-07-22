import sys
import os
import time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

import main
from rate_limit import VIDEOS_LIMIT

client = TestClient(main.app)

# Parsed from the configured limit so the test tracks the real setting.
VIDEOS_LIMIT_PER_MINUTE = int(VIDEOS_LIMIT.split("/")[0])


def test_lesson_videos_maps_ranked_results_hides_internals_and_caches(monkeypatch):
    main._video_cache.clear()
    calls = {"n": 0}

    def fake_recommend(lesson, **kw):
        calls["n"] += 1
        return [{
            "video_id": "v1", "title": "شرح الأعداد النسبية", "url": "https://y/v1",
            "channel_title": "أكاديمية", "channel_id": "c1", "approved": True,
            "badge": "قناة معتمدة", "relevance": 0.96, "score": 187.5,
            "duration_seconds": 600, "view_count": 1000, "published_at": "2026-01-01T00:00:00Z",
        }]

    monkeypatch.setattr(main, "recommend_videos", fake_recommend)

    r1 = client.get("/api/lesson_videos", params={
        "lesson": "الأعداد النسبية", "subject_id": "math",
        "subject_name": "رياضيات", "grade_name": "الصف الأول المتوسط",
    })
    assert r1.status_code == 200
    body = r1.json()
    assert body["count"] == 1 and body["cached"] is False
    v = body["videos"][0]
    assert v["approved"] is True and v["badge"] == "قناة معتمدة"
    # hidden signals never reach the client
    assert "relevance" not in v and "score" not in v

    # identical request is served from cache — recommend runs only once
    r2 = client.get("/api/lesson_videos", params={
        "lesson": "الأعداد النسبية", "subject_id": "math",
        "subject_name": "رياضيات", "grade_name": "الصف الأول المتوسط",
    })
    assert r2.json()["cached"] is True
    assert calls["n"] == 1


def test_empty_results_are_cached_with_a_short_ttl(monkeypatch):
    """
    Regression guard: a misconfigured/rejected YOUTUBE_API_KEY, a transient
    network error, or a quota blip all make recommend_videos() return []
    exactly like a lesson with genuinely no good matches. Caching that with
    the full 6h TTL -- reproduced live in production -- meant the section
    stayed stuck on "no videos" for hours after the underlying cause was
    fixed. Empty results must get a much shorter TTL than real results.
    """
    main._video_cache.clear()
    monkeypatch.setattr(main, "recommend_videos", lambda lesson, **kw: [])

    r = client.get("/api/lesson_videos", params={"lesson": "درس بلا نتائج"})
    assert r.status_code == 200
    assert r.json() == {"videos": [], "count": 0, "cached": False}

    cache_key = ("درس بلا نتائج", "", "", "", 8)
    expires_at, payload = main._video_cache[cache_key]
    assert payload == []
    ttl = expires_at - time.time()
    assert ttl <= main._EMPTY_VIDEO_CACHE_TTL + 1          # short TTL, not the 6h one
    assert ttl < main._VIDEO_CACHE_TTL


def test_lesson_videos_requires_a_lesson():
    r = client.get("/api/lesson_videos", params={"lesson": "   "})
    assert r.status_code == 400


def test_lesson_videos_is_rate_limited(monkeypatch):
    """Each call can trigger a YouTube search + a Groq relevance call, so this
    endpoint gets a tighter per-client limit than the plain analysis endpoints."""
    main._video_cache.clear()
    monkeypatch.setattr(main, "recommend_videos", lambda lesson, **kw: [])

    def _get(i):
        # Vary the lesson so every request is a fresh (uncached) call — the
        # cache, not the limiter, would otherwise short-circuit repeats.
        return client.get("/api/lesson_videos", params={"lesson": f"درس {i}"})

    codes = [_get(i).status_code for i in range(VIDEOS_LIMIT_PER_MINUTE)]
    assert codes == [200] * VIDEOS_LIMIT_PER_MINUTE

    throttled = _get(VIDEOS_LIMIT_PER_MINUTE)
    assert throttled.status_code == 429
    assert "طلبات كثيرة" in throttled.json()["detail"]
