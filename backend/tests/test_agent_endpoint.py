import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from contextlib import ExitStack
from unittest.mock import patch
from fastapi.testclient import TestClient

import session_store
from main import app

client = TestClient(app)

QUIZ = [
    {"q": "q1", "o": ["a", "b", "c", "d"], "a": 0, "e": "because a"},
    {"q": "q2", "o": ["a", "b", "c", "d"], "a": 1, "e": "because b"},
    {"q": "q3", "o": ["a", "b", "c", "d"], "a": 2, "e": "because c"},
]
CORRECT = [0, 1, 2]
ALL_WRONG = [1, 2, 3]

PLAN_TWO = {
    "intro": "your plan",
    "steps": [
        {"topic_id": 0, "label": "T0", "focus": "f0"},
        {"topic_id": 1, "label": "T1", "focus": "f1"},
    ],
}
REPORT = {"readiness": "done", "strengths": [], "weaknesses": [],
          "overall_ratio": 0.0, "topics": []}


def make_session(topics):
    s = session_store.create_session(
        filename="demo.pdf",
        slides=[{"slide_number": 1, "text": "محتوى"}],
    )
    s.topics = topics
    s.chunks = [{"text": "محتوى", "slides": [1]}]
    s.summary = "ملخص"
    s.indexing_complete = True
    return s


def agent_patches(plan=PLAN_TWO):
    stack = ExitStack()
    stack.enter_context(patch("main.plan_study", return_value=plan))
    stack.enter_context(patch("main.generate_topic_analysis",
                              return_value={"explanation": "شرح", "examples": ["مثال"]}))
    stack.enter_context(patch("main.generate_review_questions", return_value=list(QUIZ)))
    stack.enter_context(patch("main.build_report", return_value=REPORT))
    return stack


# ---- guards ----
def test_start_requires_goal():
    s = make_session([{"topic_id": 0, "label": "T0"}])
    res = client.post("/api/agent/start", json={"session_id": s.session_id, "goal": "   "})
    assert res.status_code == 400


def test_start_unknown_session():
    res = client.post("/api/agent/start", json={"session_id": "nope", "goal": "g"})
    assert res.status_code == 404


def test_start_202_when_indexing_incomplete():
    s = make_session([{"topic_id": 0, "label": "T0"}])
    s.indexing_complete = False
    res = client.post("/api/agent/start", json={"session_id": s.session_id, "goal": "g"})
    assert res.status_code == 202


def test_start_422_when_no_topics():
    s = make_session([])
    res = client.post("/api/agent/start", json={"session_id": s.session_id, "goal": "g"})
    assert res.status_code == 422


# ---- happy path: master every topic, no remediation ----
def test_start_returns_plan_and_first_step_without_answer_key():
    s = make_session([{"topic_id": 0, "label": "T0"}, {"topic_id": 1, "label": "T1"}])
    with agent_patches():
        res = client.post("/api/agent/start", json={"session_id": s.session_id, "goal": "جهزني"})
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "awaiting_answers"
    assert len(body["plan"]["steps"]) == 2
    q0 = body["step"]["questions"][0]
    assert set(q0.keys()) == {"q", "o"}   # answer key withheld
    assert body["step"]["explanation"] == "شرح"


def test_full_run_all_correct_reaches_report():
    s = make_session([{"topic_id": 0, "label": "T0"}, {"topic_id": 1, "label": "T1"}])
    with agent_patches():
        start = client.post("/api/agent/start",
                            json={"session_id": s.session_id, "goal": "g"}).json()
        run_id = start["run_id"]

        r1 = client.post(f"/api/agent/{run_id}/answer", json={"answers": CORRECT}).json()
        assert r1["graded"]["mastered"] is True
        assert r1["graded"]["feedback"][0]["correct_index"] == 0
        assert r1["next"]["status"] == "awaiting_answers"      # advanced to T1

        r2 = client.post(f"/api/agent/{run_id}/answer", json={"answers": CORRECT}).json()
        assert r2["next"]["status"] == "complete"              # no weak topics
        assert r2["next"]["report"] == REPORT


# ---- remediation path ----
def test_weak_topic_triggers_one_remediation_pass():
    s = make_session([{"topic_id": 0, "label": "T0"}, {"topic_id": 1, "label": "T1"}])
    with agent_patches():
        run_id = client.post("/api/agent/start",
                             json={"session_id": s.session_id, "goal": "g"}).json()["run_id"]

        # T0 failed -> weak; advance to T1
        r1 = client.post(f"/api/agent/{run_id}/answer", json={"answers": ALL_WRONG}).json()
        assert r1["graded"]["mastered"] is False
        assert r1["next"]["step"]["topic_id"] == 1

        # T1 passed -> first pass done -> remediation opens on T0
        r2 = client.post(f"/api/agent/{run_id}/answer", json={"answers": CORRECT}).json()
        assert r2["next"]["phase"] == "remediation"
        assert r2["next"]["step"]["topic_id"] == 0

        # remediation T0 passed -> run completes
        r3 = client.post(f"/api/agent/{run_id}/answer", json={"answers": CORRECT}).json()
        assert r3["next"]["status"] == "complete"


def test_answer_on_unknown_run_404():
    res = client.post("/api/agent/nope/answer", json={"answers": []})
    assert res.status_code == 404


def test_status_endpoint_reports_progress():
    s = make_session([{"topic_id": 0, "label": "T0"}])
    with agent_patches(plan={"intro": "p", "steps": [{"topic_id": 0, "label": "T0", "focus": ""}]}):
        run_id = client.post("/api/agent/start",
                             json={"session_id": s.session_id, "goal": "g"}).json()["run_id"]
        res = client.get(f"/api/agent/{run_id}")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "awaiting_answers"
    assert body["goal"] == "g"
    assert "current" in body
