import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json

from video_relevance import score_relevance

CTX = {"lesson": "الأعداد النسبية", "subject_name": "رياضيات", "grade_name": "الصف الأول المتوسط"}
VIDS = [{"video_id": "a", "title": "شرح الأعداد النسبية", "description": "درس"},
        {"video_id": "b", "title": "فيديو غير متعلق", "description": "طبخ"}]


def fake_groq(response):
    def _call(prompt=None, max_tokens=400, temperature=0.0, **k):
        return response
    return _call


def test_parses_scores_and_normalizes_to_unit_interval():
    out = score_relevance(CTX, VIDS, fake_groq(json.dumps({"a": 96, "b": 10})))
    assert out == {"a": 0.96, "b": 0.10}


def test_strips_code_fences():
    raw = "```json\n" + json.dumps({"a": 80, "b": 0}) + "\n```"
    out = score_relevance(CTX, VIDS, fake_groq(raw))
    assert out["a"] == 0.80


def test_clamps_out_of_range_scores():
    out = score_relevance(CTX, VIDS, fake_groq(json.dumps({"a": 150, "b": -5})))
    assert out == {"a": 1.0, "b": 0.0}


def test_skips_non_numeric_scores():
    out = score_relevance(CTX, VIDS, fake_groq(json.dumps({"a": "high", "b": 30})))
    assert "a" not in out and out["b"] == 0.30


def test_invalid_json_returns_empty():
    assert score_relevance(CTX, VIDS, fake_groq("not json at all")) == {}


def test_no_call_groq_returns_empty():
    assert score_relevance(CTX, VIDS, None) == {}


def test_empty_videos_returns_empty_without_calling():
    calls = {"n": 0}

    def counting(*a, **k):
        calls["n"] += 1
        return "{}"

    assert score_relevance(CTX, [], counting) == {}
    assert calls["n"] == 0


def test_single_llm_call_for_all_videos():
    calls = {"n": 0}

    def counting(*a, **k):
        calls["n"] += 1
        return json.dumps({"a": 90, "b": 20})

    score_relevance(CTX, VIDS, counting)
    assert calls["n"] == 1
