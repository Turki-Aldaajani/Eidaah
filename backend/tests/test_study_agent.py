import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json

from study_agent import plan_study, grade_answers, build_report


def fake_groq(response):
    def _call(prompt, max_tokens=300, temperature=0.3, system_prompt=None):
        return response
    return _call


def boom_groq(prompt, max_tokens=300, temperature=0.3, system_prompt=None):
    raise RuntimeError("LLM down")


TOPICS = [
    {"topic_id": 0, "label": "المشتقات"},
    {"topic_id": 1, "label": "التكامل"},
    {"topic_id": 2, "label": "النهايات"},
]


# ---- plan_study ----
def test_plan_orders_and_keeps_valid_topics():
    raw = json.dumps({
        "intro": "خطتك",
        "steps": [{"topic_id": 2, "focus": "ابدأ هنا"}, {"topic_id": 0, "focus": "ثم هذا"}],
    }, ensure_ascii=False)
    plan = plan_study("جهزني", TOPICS, "ملخص", fake_groq(raw), "ar")
    assert plan["intro"] == "خطتك"
    assert [s["topic_id"] for s in plan["steps"]] == [2, 0]
    assert plan["steps"][0]["label"] == "النهايات"
    assert plan["steps"][0]["focus"] == "ابدأ هنا"


def test_plan_drops_unknown_and_duplicate_ids():
    raw = json.dumps({
        "intro": "x",
        "steps": [{"topic_id": 1}, {"topic_id": 99}, {"topic_id": 1}],
    })
    plan = plan_study("g", TOPICS, "s", fake_groq(raw), "ar")
    assert [s["topic_id"] for s in plan["steps"]] == [1]


def test_plan_falls_back_to_all_topics_on_bad_json():
    plan = plan_study("g", TOPICS, "s", fake_groq("not json"), "ar")
    assert [s["topic_id"] for s in plan["steps"]] == [0, 1, 2]


def test_plan_falls_back_when_no_valid_ids():
    raw = json.dumps({"intro": "x", "steps": [{"topic_id": 42}]})
    plan = plan_study("g", TOPICS, "s", fake_groq(raw), "ar")
    assert [s["topic_id"] for s in plan["steps"]] == [0, 1, 2]


def test_plan_empty_topics_returns_empty():
    plan = plan_study("g", [], "s", fake_groq("{}"), "ar")
    assert plan["steps"] == []


# ---- grade_answers ----
QS = [
    {"q": "a", "o": ["1", "2", "3", "4"], "a": 0, "e": "x"},
    {"q": "b", "o": ["1", "2", "3", "4"], "a": 2, "e": "x"},
    {"q": "c", "o": ["1", "2", "3", "4"], "a": 1, "e": "x"},
]


def test_grade_all_correct():
    g = grade_answers(QS, [0, 2, 1])
    assert g == {"correct": 3, "total": 3, "ratio": 1.0, "wrong": []}


def test_grade_some_wrong():
    g = grade_answers(QS, [0, 0, 1])
    assert g["correct"] == 2
    assert g["wrong"] == [1]
    assert abs(g["ratio"] - 2 / 3) < 1e-9


def test_grade_missing_answers_count_wrong():
    g = grade_answers(QS, [0])
    assert g["correct"] == 1
    assert g["wrong"] == [1, 2]


def test_grade_empty_questions():
    assert grade_answers([], []) == {"correct": 0, "total": 0, "ratio": 0.0, "wrong": []}


# ---- build_report ----
def test_report_splits_strengths_and_weaknesses():
    results = [
        {"label": "قوي", "best_ratio": 1.0},
        {"label": "ضعيف", "best_ratio": 0.33},
        {"label": "حدّي", "best_ratio": 0.6},
    ]
    raw = json.dumps({"readiness": "أنت بخير"}, ensure_ascii=False)
    rep = build_report("جهزني", results, fake_groq(raw), "ar")
    assert rep["strengths"] == ["قوي", "حدّي"]  # 0.6 meets the threshold
    assert rep["weaknesses"] == ["ضعيف"]
    assert rep["readiness"] == "أنت بخير"
    assert rep["overall_ratio"] == round((1.0 + 0.33 + 0.6) / 3, 2)


def test_report_uses_fallback_when_llm_fails():
    results = [{"label": "T1", "best_ratio": 1.0}, {"label": "T2", "best_ratio": 0.0}]
    rep = build_report("goal", results, boom_groq, "en")
    assert rep["readiness"]  # non-empty fallback text
    assert "T1" in rep["readiness"]
    assert rep["strengths"] == ["T1"]
    assert rep["weaknesses"] == ["T2"]


def test_report_handles_none_ratio():
    rep = build_report("g", [{"label": "T", "best_ratio": None}], boom_groq, "ar")
    assert rep["topics"][0]["ratio"] == 0.0
    assert rep["weaknesses"] == ["T"]
