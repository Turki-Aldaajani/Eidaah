import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
import session_store

client = TestClient(app)

SAMPLE = [{"q": "س؟", "o": ["أ", "ب", "ج", "د"], "a": 0, "e": "لأنها الصحيحة"}] * 3


def test_returns_questions_on_success_with_content():
    with patch("main.generate_review_questions", return_value=SAMPLE):
        res = client.post("/api/generate_questions", json={
            "content": "نص محتوى الشرائح", "language": "ar",
        })
    assert res.status_code == 200
    assert res.json() == {"questions": SAMPLE}


def test_uses_session_text_when_no_content():
    session = session_store.create_session(
        filename="demo.pdf",
        slides=[{"slide_number": 1, "text": "محتوى الشريحة الأولى"}],
    )
    captured = {}

    def fake_gen(content, call_fn, language):
        captured["content"] = content
        return SAMPLE

    with patch("main.generate_review_questions", side_effect=fake_gen):
        res = client.post("/api/generate_questions", json={
            "session_id": session.session_id, "language": "ar",
        })
    assert res.status_code == 200
    assert res.json() == {"questions": SAMPLE}
    assert "محتوى الشريحة الأولى" in captured["content"]


def test_rejects_when_no_content_and_no_session():
    res = client.post("/api/generate_questions", json={"language": "ar"})
    assert res.status_code == 400


def test_returns_404_for_unknown_session():
    res = client.post("/api/generate_questions", json={
        "session_id": "does-not-exist", "language": "ar",
    })
    assert res.status_code == 404


def test_returns_502_when_generation_fails():
    with patch("main.generate_review_questions", return_value=None):
        res = client.post("/api/generate_questions", json={
            "content": "نص", "language": "ar",
        })
    assert res.status_code == 502
    assert "detail" in res.json()
