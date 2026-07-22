import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, timezone, timedelta

from video_ranker import (
    score_video, rank_videos,
    W_LESSON, W_SUBJECT, W_APPROVED, W_RELEVANCE,
)

NOW = datetime(2026, 7, 22, tzinfo=timezone.utc)
RECENT = (NOW - timedelta(days=120)).strftime("%Y-%m-%dT%H:%M:%SZ")

CTX = {
    "lesson": "الأعداد النسبية",
    "subject_name": "رياضيات",
    "grade_name": "الصف الأول المتوسط",
    "primary_query": "الأعداد النسبية أول متوسط رياضيات",
    "now": NOW,
}


def vid(video_id="v", title="", channel_id="c", view_count=0):
    return {"video_id": video_id, "title": title, "channel_id": channel_id,
            "view_count": view_count, "published_at": RECENT}


def test_lesson_title_match_adds_lesson_weight():
    hit = score_video(vid(title="شرح الأعداد النسبية"), CTX)
    miss = score_video(vid(title="درس مختلف تماماً"), CTX)
    assert round(hit - miss, 6) == W_LESSON


def test_approved_channel_adds_approved_weight():
    v = vid(title="الأعداد النسبية", channel_id="cid")
    with_appr = score_video(v, CTX, approved_ids={"cid"})
    without = score_video(v, CTX, approved_ids=set())
    assert round(with_appr - without, 6) == W_APPROVED


def test_subject_presence_adds_subject_weight():
    base = score_video(vid(title="الأعداد النسبية"), CTX)
    with_subject = score_video(vid(title="الأعداد النسبية رياضيات"), CTX)
    assert round(with_subject - base, 6) == W_SUBJECT


def test_relevance_map_increases_score():
    v = vid(video_id="a", title="الأعداد النسبية")
    high = score_video(v, CTX, relevance={"a": 1.0})
    low = score_video(v, CTX, relevance={"a": 0.0})
    assert round(high - low, 6) == W_RELEVANCE


def test_in_app_rating_map_influences_score():
    v = vid(video_id="a", title="الأعداد النسبية")
    liked = score_video(v, CTX, ratings={"a": {"up": 9, "down": 1}})
    disliked = score_video(v, CTX, ratings={"a": {"up": 1, "down": 9}})
    assert liked > disliked


def test_rank_places_approved_first_even_with_lower_content_score():
    videos = [
        vid(video_id="general_strong", title="الأعداد النسبية أول متوسط رياضيات",
            channel_id="g", view_count=1_000_000),
        vid(video_id="approved_weak", title="الأعداد النسبية", channel_id="cid"),
    ]
    ranked = rank_videos(videos, CTX, approved_ids={"cid"})
    assert ranked[0]["video_id"] == "approved_weak"
    assert ranked[0]["approved"] is True
    assert all("score" in v for v in ranked)


def test_rank_uses_ratings_map_by_video_id():
    videos = [vid(video_id="a", title="الأعداد النسبية"),
              vid(video_id="b", title="الأعداد النسبية")]
    ranked = rank_videos(videos, CTX, ratings={"a": {"up": 20, "down": 0}})
    assert ranked[0]["video_id"] == "a"
