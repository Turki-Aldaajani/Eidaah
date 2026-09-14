# test_upload_language.py
# Issue #105: verify that the UI language flows from /api/upload_file
# through the background pipeline to every LLM call that produces
# user-visible text (summary, topics, title/description).

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, call
import session_store
from main import _run_semantic_pipeline

META_AR = {
    "title": "عنوان مولّد",
    "description": "وصف مولّد",
    "auto_generated": True,
    "model": "test-model",
}

META_EN = {
    "title": "Generated Title",
    "description": "Generated description",
    "auto_generated": True,
    "model": "test-model",
}


def _make_session(slides=None):
    return session_store.create_session(
        filename="lesson.pdf",
        slides=slides or [{"slide_number": 1, "text": "الأعداد النسبية"}],
    )


# ---------------------------------------------------------------
# Pipeline passes the language to every downstream LLM call
# ---------------------------------------------------------------

def test_pipeline_passes_arabic_to_all_llm_calls():
    """When language='ar', detect_topics, generate_summary, and
    generate_material_metadata all receive 'ar'."""
    session = _make_session()
    with patch("main.render_slides", return_value=[]), \
         patch("main.detect_topics", return_value=[{"topic_id": 0, "label": "موضوع"}]) as mock_topics, \
         patch("main.generate_summary", return_value="ملخص") as mock_summary, \
         patch("main.generate_material_metadata", return_value=META_AR) as mock_meta:

        _run_semantic_pipeline(session.session_id, b"", "application/pdf", "lesson.pdf", "ar")

        mock_topics.assert_called_once()
        assert mock_topics.call_args[0][2] == "ar"    # 3rd positional arg

        mock_summary.assert_called_once()
        assert mock_summary.call_args[0][2] == "ar"   # 3rd positional arg

        mock_meta.assert_called_once()
        assert mock_meta.call_args[1]["language"] == "ar"  # keyword arg


def test_pipeline_passes_english_to_all_llm_calls():
    """When language='en', all LLM helpers receive 'en'."""
    session = _make_session()
    with patch("main.render_slides", return_value=[]), \
         patch("main.detect_topics", return_value=[{"topic_id": 0, "label": "Topic"}]) as mock_topics, \
         patch("main.generate_summary", return_value="Summary") as mock_summary, \
         patch("main.generate_material_metadata", return_value=META_EN) as mock_meta:

        _run_semantic_pipeline(session.session_id, b"", "application/pdf", "lesson.pdf", "en")

        assert mock_topics.call_args[0][2] == "en"
        assert mock_summary.call_args[0][2] == "en"
        assert mock_meta.call_args[1]["language"] == "en"


def test_pipeline_defaults_to_arabic_when_language_omitted():
    """Backward compatibility: omitting the language arg defaults to 'ar'."""
    session = _make_session()
    with patch("main.render_slides", return_value=[]), \
         patch("main.detect_topics", return_value=[]) as mock_topics, \
         patch("main.generate_summary") as mock_summary, \
         patch("main.generate_material_metadata", return_value=META_AR) as mock_meta:

        # Call with only the original 4 positional args — no language
        _run_semantic_pipeline(session.session_id, b"", "application/pdf", "lesson.pdf")

        mock_meta.assert_called_once()
        assert mock_meta.call_args[1]["language"] == "ar"


# ---------------------------------------------------------------
# /api/upload_file endpoint sends language to the pipeline
# ---------------------------------------------------------------

def test_upload_endpoint_sends_language_to_pipeline():
    """POST /api/upload_file with language=en passes it to the background task."""
    from fastapi.testclient import TestClient
    from unittest.mock import AsyncMock
    from main import app
    import io

    client = TestClient(app)
    pdf_bytes = b"%PDF-1.4 dummy"

    with patch("main.ai_logic") as mock_ai, \
         patch("main._run_semantic_pipeline") as mock_pipeline:
        # ai_logic.process_file_to_pages is async — use a coroutine
        mock_ai.process_file_to_pages = AsyncMock(
            return_value=[{"slide_number": 1, "text": "hello"}]
        )

        resp = client.post(
            "/api/upload_file",
            files={"file": ("deck.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
            data={"language": "en"},
        )
        assert resp.status_code == 200
        # The background task should have been called with language="en"
        mock_pipeline.assert_called_once()
        args = mock_pipeline.call_args
        # language is the 5th positional arg
        assert args[0][4] == "en"


def test_upload_without_language_defaults_to_arabic():
    """POST /api/upload_file without a language field defaults to 'ar'."""
    from fastapi.testclient import TestClient
    from unittest.mock import AsyncMock
    from main import app
    import io

    client = TestClient(app)
    pdf_bytes = b"%PDF-1.4 dummy"

    with patch("main.ai_logic") as mock_ai, \
         patch("main._run_semantic_pipeline") as mock_pipeline:
        mock_ai.process_file_to_pages = AsyncMock(
            return_value=[{"slide_number": 1, "text": "hello"}]
        )

        resp = client.post(
            "/api/upload_file",
            files={"file": ("deck.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
            # no language field
        )
        assert resp.status_code == 200
        mock_pipeline.assert_called_once()
        assert mock_pipeline.call_args[0][4] == "ar"
