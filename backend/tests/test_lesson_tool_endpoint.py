import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_rejects_unknown_tool():
    res = client.post("/api/lesson_tool", json={
        "stage": "m1", "subject": "math", "lesson_title": "القوى والأسس",
        "tool": "not-a-real-tool", "language": "ar",
    })
    assert res.status_code == 400


def test_returns_sum_content_on_success():
    with patch("main.generate_lesson_tool_content", return_value={"points": ["a", "b"]}):
        res = client.post("/api/lesson_tool", json={
            "stage": "m1", "subject": "math", "lesson_title": "القوى والأسس",
            "tool": "sum", "language": "ar",
        })
    assert res.status_code == 200
    assert res.json() == {"tool": "sum", "points": ["a", "b"]}


def test_returns_quiz_questions_on_success():
    questions = [{"q": "س؟", "o": ["أ", "ب", "ج", "د"], "a": 0}] * 5
    with patch("main.generate_lesson_tool_content", return_value=questions):
        res = client.post("/api/lesson_tool", json={
            "stage": "m1", "subject": "math", "lesson_title": "القوى والأسس",
            "tool": "quiz", "language": "ar",
        })
    assert res.status_code == 200
    assert res.json() == {"tool": "quiz", "questions": questions}


def test_returns_502_when_generation_fails():
    with patch("main.generate_lesson_tool_content", return_value=None):
        res = client.post("/api/lesson_tool", json={
            "stage": "m1", "subject": "math", "lesson_title": "القوى والأسس",
            "tool": "notes", "language": "ar",
        })
    assert res.status_code == 502
    assert "detail" in res.json()


def test_rejects_missing_required_field():
    res = client.post("/api/lesson_tool", json={"stage": "m1", "tool": "sum"})
    assert res.status_code == 422
