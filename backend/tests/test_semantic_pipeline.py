import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import session_store
from main import _run_semantic_pipeline, app

client = TestClient(app)

META = {
    "title": "عنوان مولّد",
    "description": "وصف مولّد",
    "auto_generated": True,
    "model": "test-model",
}


def make_session(slides):
    return session_store.create_session(filename="lesson.pdf", slides=slides)


def test_metadata_still_generated_when_chunks_are_empty():
    """
    A4 regression guard: a document that produces zero chunks (e.g.
    image-only slides / OCR extraction failure) hits the `if not chunks`
    early-exit in the pipeline. Title/description generation must still run
    — it must not be silently skipped along with topics/summary.
    """
    session = make_session([{"slide_number": 1, "text": "   "}])

    with patch("main.render_slides", return_value=[]), \
         patch("main.chunk_slides", return_value=[]), \
         patch("main.detect_topics") as mock_topics, \
         patch("main.generate_summary") as mock_summary, \
         patch("main.generate_material_metadata", return_value=META) as mock_meta:
        _run_semantic_pipeline(session.session_id, b"", "application/pdf", "lesson.pdf")

    mock_topics.assert_not_called()
    mock_summary.assert_not_called()
    assert mock_meta.called

    updated = session_store.get_session(session.session_id)
    assert updated.title == META["title"]
    assert updated.description == META["description"]
    assert updated.metadata_auto is True
    assert updated.indexing_complete is True


def test_metadata_still_generated_when_an_earlier_step_raises():
    """
    An exception in rendering/chunking/topics/summary must not prevent
    title/description generation from being attempted.
    """
    session = make_session([{"slide_number": 1, "text": "نص كافٍ للتحليل."}])

    with patch("main.render_slides", side_effect=RuntimeError("boom")), \
         patch("main.generate_material_metadata", return_value=META) as mock_meta:
        _run_semantic_pipeline(session.session_id, b"", "application/pdf", "lesson.pdf")

    assert mock_meta.called

    updated = session_store.get_session(session.session_id)
    assert updated.title == META["title"]
    assert updated.description == META["description"]
    assert updated.indexing_complete is True


def test_happy_path_still_generates_metadata_after_topics_and_summary():
    session = make_session([{"slide_number": 1, "text": "الأعداد النسبية هي أرقام يمكن كتابتها بصورة كسر."}])

    with patch("main.render_slides", return_value=[]), \
         patch("main.detect_topics", return_value=[{"topic_id": 0, "label": "موضوع"}]) as mock_topics, \
         patch("main.generate_summary", return_value="ملخص") as mock_summary, \
         patch("main.generate_material_metadata", return_value=META) as mock_meta:
        _run_semantic_pipeline(session.session_id, b"", "application/pdf", "lesson.pdf")

    assert mock_topics.called
    assert mock_summary.called
    assert mock_meta.called

    updated = session_store.get_session(session.session_id)
    assert updated.topics == [{"topic_id": 0, "label": "موضوع"}]
    assert updated.summary == "ملخص"
    assert updated.title == META["title"]
    assert updated.description == META["description"]
    assert updated.indexing_complete is True


@pytest.mark.parametrize("language", ["ar", "en"])
def test_summary_and_metadata_are_generated_in_the_upload_language(language):
    """
    #105 regression guard: the summary and title/description shown
    automatically after upload must follow the UI language sent with the
    upload — not the document's own language (summary) or a hardcoded "ar"
    (metadata). An English document is used so both directions are exercised.
    """
    session = make_session([{"slide_number": 1, "text": "Rational numbers can be written as a fraction."}])

    with patch("main.render_slides", return_value=[]), \
         patch("main.detect_topics", return_value=[{"topic_id": 0, "label": "topic"}]), \
         patch("main.generate_summary", return_value="summary") as mock_summary, \
         patch("main.generate_material_metadata", return_value=META) as mock_meta:
        _run_semantic_pipeline(session.session_id, b"", "application/pdf", "lesson.pdf", language)

    assert mock_summary.call_args.args[2] == language
    assert mock_meta.call_args.args[3] == language


async def _fake_pages(file, file_type, filename):
    return [{"slide_number": 1, "text": "Rational numbers can be written as a fraction."}]


@pytest.mark.parametrize("sent, expected", [("ar", "ar"), ("en", "en"), (None, "ar"), ("fr", "ar")])
def test_upload_endpoint_hands_the_ui_language_to_the_pipeline(sent, expected):
    """#105: the `language` form field reaches the background pipeline; missing/unknown -> "ar"."""
    data = {} if sent is None else {"language": sent}
    with patch("main.ai_logic.process_file_to_pages", new=_fake_pages), \
         patch("main._run_semantic_pipeline") as mock_pipeline:
        res = client.post(
            "/api/upload_file",
            files={"file": ("deck.pdf", b"%PDF-1.4", "application/pdf")},
            data=data,
        )

    assert res.status_code == 200
    assert mock_pipeline.call_args.args[4] == expected
