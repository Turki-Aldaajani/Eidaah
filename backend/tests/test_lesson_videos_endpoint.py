import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


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


def test_lesson_videos_requires_a_lesson():
    r = client.get("/api/lesson_videos", params={"lesson": "   "})
    assert r.status_code == 400
