"""B2 (#27): per-client rate limits on the endpoints that cost us Groq calls."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import rate_limit
from main import app
from rate_limit import ANALYZE_LIMIT, client_key

client = TestClient(app)

# Parsed from the configured limit so the test tracks the real setting.
LIMIT_PER_MINUTE = int(ANALYZE_LIMIT.split("/")[0])

SAMPLE = [{"q": "س؟", "o": ["أ", "ب", "ج", "د"], "a": 0, "e": "لأنها الصحيحة"}] * 3


def _post():
    return client.post(
        "/api/generate_questions", json={"content": "نص", "language": "ar"}
    )


def test_requests_under_the_limit_all_succeed():
    with patch("main.generate_review_questions", return_value=SAMPLE):
        codes = [_post().status_code for _ in range(LIMIT_PER_MINUTE)]

    assert codes == [200] * LIMIT_PER_MINUTE


def test_over_limit_returns_429_without_calling_groq():
    """The core acceptance criterion: throttled requests must not reach Groq."""
    with patch("main.generate_review_questions", return_value=SAMPLE) as generate:
        for _ in range(LIMIT_PER_MINUTE):
            assert _post().status_code == 200

        calls_before = generate.call_count
        throttled = _post()

        assert throttled.status_code == 429
        # The whole point of limiting: no extra paid round-trip.
        assert generate.call_count == calls_before


def test_429_body_is_actionable_arabic():
    with patch("main.generate_review_questions", return_value=SAMPLE):
        for _ in range(LIMIT_PER_MINUTE):
            _post()
        response = _post()

    assert response.status_code == 429
    detail = response.json()["detail"]
    assert "طلبات كثيرة" in detail
    assert "انتظر دقيقة" in detail
    assert response.headers["Retry-After"] == "60"


def test_limit_is_per_client_not_global():
    """One noisy student must not lock everyone else out."""
    with patch.object(rate_limit, "TRUST_PROXY", True):
        with patch("main.generate_review_questions", return_value=SAMPLE):
            for _ in range(LIMIT_PER_MINUTE):
                client.post(
                    "/api/generate_questions",
                    json={"content": "نص", "language": "ar"},
                    headers={"X-Forwarded-For": "10.0.0.1"},
                )

            exhausted = client.post(
                "/api/generate_questions",
                json={"content": "نص", "language": "ar"},
                headers={"X-Forwarded-For": "10.0.0.1"},
            )
            other_student = client.post(
                "/api/generate_questions",
                json={"content": "نص", "language": "ar"},
                headers={"X-Forwarded-For": "10.0.0.2"},
            )

    assert exhausted.status_code == 429
    assert other_student.status_code == 200


class _Req:
    """Minimal stand-in for a Starlette Request."""

    def __init__(self, headers=None, host="1.2.3.4"):
        self.headers = headers or {}
        self.client = type("C", (), {"host": host})() if host else None


def test_proxy_header_is_ignored_when_untrusted():
    """Otherwise anyone could mint a fresh quota by varying the header."""
    with patch.object(rate_limit, "TRUST_PROXY", False):
        key = client_key(_Req({"x-forwarded-for": "9.9.9.9"}, host="1.2.3.4"))

    assert key == "1.2.3.4"


def test_leftmost_forwarded_ip_is_used_when_trusted():
    """Render appends to X-Forwarded-For; the original client is first."""
    with patch.object(rate_limit, "TRUST_PROXY", True):
        key = client_key(_Req({"x-forwarded-for": "9.9.9.9, 10.0.0.5"}, host="1.2.3.4"))

    assert key == "9.9.9.9"
