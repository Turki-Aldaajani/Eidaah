"""B1 (#26): blocking work must not stall the asyncio event loop.

Every Groq call and every PDF/PPTX parse is synchronous. When those ran directly
inside an `async def`, a single slow request froze the entire server. These tests
pin that down two ways: concurrent requests must overlap, and the event loop must
stay responsive while the blocking work is in flight.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import asyncio
import time
from unittest.mock import patch

import httpx
import pytest

import ai_logic
from main import app

# Long enough to dwarf scheduling jitter, short enough to keep the suite fast.
BLOCK_SECONDS = 0.5


def _slow_analyze(text, language=None):
    """Stand-in for the real Groq round-trip: blocking, and slow."""
    time.sleep(BLOCK_SECONDS)
    return "شرح", "مثال"


def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    )


def test_two_concurrent_analyze_requests_overlap():
    """Two in-flight requests should finish in ~one round-trip, not two."""

    async def scenario():
        async with _client() as client:
            started = time.perf_counter()
            responses = await asyncio.gather(
                client.post("/api/analyze_slide", json={"text": "نص أول"}),
                client.post("/api/analyze_slide", json={"text": "نص ثانٍ"}),
            )
            return time.perf_counter() - started, responses

    with patch.object(ai_logic, "generate_explanation_and_example", _slow_analyze):
        elapsed, responses = asyncio.run(scenario())

    assert all(r.status_code == 200 for r in responses)
    # Serialized would be ~2x BLOCK_SECONDS; overlapped stays near 1x.
    assert elapsed < BLOCK_SECONDS * 1.6, (
        f"requests serialized ({elapsed:.2f}s) — the Groq call is still blocking the loop"
    )


def test_event_loop_stays_responsive_during_analyze():
    """A background coroutine must keep getting scheduled mid-request."""

    async def scenario():
        ticks = 0

        async def heartbeat():
            nonlocal ticks
            while True:
                await asyncio.sleep(0.01)
                ticks += 1

        beat = asyncio.create_task(heartbeat())
        async with _client() as client:
            response = await client.post("/api/analyze_slide", json={"text": "نص"})
        beat.cancel()
        return ticks, response

    with patch.object(ai_logic, "generate_explanation_and_example", _slow_analyze):
        ticks, response = asyncio.run(scenario())

    assert response.status_code == 200
    # A blocked loop would starve the heartbeat entirely.
    assert ticks > 5, f"event loop was starved during the request (only {ticks} ticks)"


@pytest.mark.parametrize(
    "extractor, wrapper",
    [
        ("_extract_pages_from_pdf_sync", ai_logic.extract_pages_from_pdf),
        ("_extract_pages_from_pptx_sync", ai_logic.extract_pages_from_pptx),
    ],
)
def test_file_parsing_runs_off_the_event_loop(extractor, wrapper):
    """pdfplumber / python-pptx parsing must be offloaded, not run inline."""
    pages = [{"slide_number": 1, "text": "محتوى"}]

    def _slow_parse(file_stream):
        time.sleep(BLOCK_SECONDS)
        return pages

    async def scenario():
        ticks = 0

        async def heartbeat():
            nonlocal ticks
            while True:
                await asyncio.sleep(0.01)
                ticks += 1

        beat = asyncio.create_task(heartbeat())
        result = await wrapper(b"fake-bytes")
        beat.cancel()
        return ticks, result

    with patch.object(ai_logic, extractor, _slow_parse):
        ticks, result = asyncio.run(scenario())

    assert result == pages
    assert ticks > 5, f"parsing blocked the event loop (only {ticks} ticks)"
