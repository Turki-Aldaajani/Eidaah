import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
from datetime import datetime, timezone, timedelta

from video_provider import StaticVideoProvider
from video_recommender import recommend_videos, to_public_video, APPROVED_BADGE

NOW = datetime(2026, 7, 22, tzinfo=timezone.utc)
LESSON = "الأعداد النسبية"
SUBJECT = "رياضيات"
GRADE = "الصف الأول المتوسط"

# @saeedacademy50 is an approved math channel in the seed registry.
APPROVED_HANDLE = "@saeedacademy50"
APPROVED_CID = "cid_appr"


def make_video(video_id, channel_id, days_ago=120, duration=600, views=1000,
               title="شرح الأعداد النسبية أول متوسط رياضيات"):
    return {
        "video_id": video_id, "title": title, "description": "",
        "channel_id": channel_id, "channel_title": "قناة",
        "published_at": (NOW - timedelta(days=days_ago)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "duration_seconds": duration, "view_count": views,
        "live_broadcast_content": "none", "status": "public", "is_public": True,
    }


def provider_with(videos, resolve_approved=True):
    handle_map = {APPROVED_HANDLE: APPROVED_CID} if resolve_approved else {}
    return StaticVideoProvider(videos=videos, handle_to_channel=handle_map)


def recommend(provider, **kw):
    return recommend_videos(LESSON, subject_id="math", subject_name=SUBJECT,
                            grade_name=GRADE, provider=provider, now=NOW, **kw)


def test_approved_channel_results_win_and_general_is_suppressed():
    provider = provider_with([
        make_video("appr1", APPROVED_CID),
        make_video("gen1", "cid_general", views=5_000_000),  # popular but not approved
    ])
    out = recommend(provider)
    ids = [v["video_id"] for v in out]
    assert "appr1" in ids
    assert "gen1" not in ids                       # MVP: approved present -> hide general
    assert out[0]["approved"] is True
    assert out[0]["badge"] == APPROVED_BADGE


def test_falls_back_to_general_when_no_approved_results():
    provider = provider_with([make_video("gen1", "cid_general")], resolve_approved=False)
    out = recommend(provider)
    ids = [v["video_id"] for v in out]
    assert ids == ["gen1"]
    assert out[0]["approved"] is False
    assert out[0]["badge"] is None


def test_hard_filters_drop_short_videos_within_approved_pool():
    provider = provider_with([
        make_video("appr_short", APPROVED_CID, duration=30),   # Short -> dropped
        make_video("appr_ok", APPROVED_CID, duration=600),
    ])
    out = recommend(provider)
    ids = [v["video_id"] for v in out]
    assert ids == ["appr_ok"]


def test_live_and_old_videos_are_excluded():
    provider = provider_with([
        {**make_video("live1", "cid_general"), "live_broadcast_content": "live"},
        {**make_video("old1", "cid_general", days_ago=6 * 365)},
        make_video("ok1", "cid_general"),
    ], resolve_approved=False)
    out = recommend(provider)
    assert [v["video_id"] for v in out] == ["ok1"]


def test_relevance_scoring_runs_once_and_stays_hidden():
    calls = {"n": 0}

    def fake_groq(prompt=None, **k):
        calls["n"] += 1
        return json.dumps({"appr1": 95})

    provider = provider_with([make_video("appr1", APPROVED_CID)])
    out = recommend(provider, call_groq_fn=fake_groq)
    assert calls["n"] == 1                          # one hidden call for all candidates
    public = to_public_video(out[0])
    assert "relevance" not in public and "score" not in public
    assert public["approved"] is True and public["badge"] == APPROVED_BADGE
    # match_score is the final composite ranking score (used by the frontend's
    # "video rating" filter) -- distinct from the raw hidden relevance number.
    assert public["match_score"] == out[0]["score"]


def test_empty_lesson_returns_nothing():
    provider = provider_with([make_video("x", "cid_general")], resolve_approved=False)
    assert recommend_videos("", subject_id="math", provider=provider, now=NOW) == []
