import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json

from metadata_generator import (
    generate_material_metadata,
    fallback_title_from_filename,
    MAX_TITLE_LEN,
    MAX_DESC_LEN,
)


def fake_groq(response):
    """A stand-in for Model.call_groq that returns a fixed string."""
    def _call(prompt=None, max_tokens=300, temperature=0.3, system_prompt=None, **kwargs):
        return response
    return _call


def boom_groq(*_args, **_kwargs):
    """A call_groq that raises — simulates an API/network failure."""
    raise RuntimeError("Groq is down")


ARABIC_TEXT = "الأعداد النسبية هي أرقام يمكن كتابتها بصورة كسر p/q حيث p وq عددان صحيحان."


# --------------------------------------------------------------------------
# Happy path
# --------------------------------------------------------------------------
def test_generates_title_and_description_from_valid_json():
    raw = json.dumps(
        {"title": "شرح الأعداد النسبية", "description": "درس يوضّح مفهوم الأعداد النسبية وكيفية تمثيلها."},
        ensure_ascii=False,
    )
    result = generate_material_metadata(ARABIC_TEXT, "lesson.pdf", fake_groq(raw))
    assert result["title"] == "شرح الأعداد النسبية"
    assert result["description"].startswith("درس")
    assert result["auto_generated"] is True
    assert result["model"]  # a model label is recorded


def test_strips_markdown_code_fences():
    inner = json.dumps({"title": "عنوان", "description": "وصف مختصر"}, ensure_ascii=False)
    raw = "```json\n" + inner + "\n```"
    result = generate_material_metadata(ARABIC_TEXT, "x.pdf", fake_groq(raw))
    assert result["title"] == "عنوان"
    assert result["auto_generated"] is True


def test_strips_surrounding_quotes_in_title():
    raw = json.dumps({"title": "'العنوان'", "description": "وصف"}, ensure_ascii=False)
    result = generate_material_metadata(ARABIC_TEXT, "x.pdf", fake_groq(raw))
    assert result["title"] == "العنوان"


def test_english_language_metadata():
    raw = json.dumps({"title": "Rational Numbers", "description": "A short lesson on rational numbers."})
    result = generate_material_metadata("Rational numbers can be written as p/q.", "x.pdf",
                                        fake_groq(raw), language="en")
    assert result["title"] == "Rational Numbers"
    assert result["auto_generated"] is True


# --------------------------------------------------------------------------
# Length guards
# --------------------------------------------------------------------------
def test_title_and_description_are_length_capped():
    raw = json.dumps({"title": "ع" * 200, "description": "و" * 800}, ensure_ascii=False)
    result = generate_material_metadata(ARABIC_TEXT, "x.pdf", fake_groq(raw))
    assert len(result["title"]) == MAX_TITLE_LEN
    assert len(result["description"]) == MAX_DESC_LEN


# --------------------------------------------------------------------------
# Fallback behaviour — never raises, always returns a usable title
# --------------------------------------------------------------------------
def test_fallback_on_invalid_json():
    result = generate_material_metadata(ARABIC_TEXT, "my_homework.pdf", fake_groq("not json at all"))
    assert result["auto_generated"] is False
    assert result["title"] == "my homework"      # derived from filename
    assert result["description"] == ""


def test_fallback_on_empty_title_from_model():
    raw = json.dumps({"title": "   ", "description": "وصف موجود"}, ensure_ascii=False)
    result = generate_material_metadata(ARABIC_TEXT, "report-final.pdf", fake_groq(raw))
    assert result["auto_generated"] is False
    assert result["title"] == "report final"


def test_fallback_when_model_raises():
    result = generate_material_metadata(ARABIC_TEXT, "notes.pdf", boom_groq)
    assert result["auto_generated"] is False
    assert result["title"] == "notes"


def test_fallback_on_empty_text_does_not_call_model():
    calls = {"n": 0}

    def counting(*_a, **_k):
        calls["n"] += 1
        return "{}"

    result = generate_material_metadata("   ", "quiz.pdf", counting)
    assert result["auto_generated"] is False
    assert result["title"] == "quiz"
    assert calls["n"] == 0  # empty text short-circuits — no LLM call


def test_generate_is_a_single_llm_call():
    """Acceptance: metadata is produced in exactly one call ('generate once')."""
    calls = {"n": 0}

    def counting(*_a, **_k):
        calls["n"] += 1
        return json.dumps({"title": "عنوان", "description": "وصف"}, ensure_ascii=False)

    generate_material_metadata(ARABIC_TEXT, "x.pdf", counting)
    assert calls["n"] == 1


# --------------------------------------------------------------------------
# fallback_title_from_filename
# --------------------------------------------------------------------------
def test_fallback_title_strips_extension_and_separators():
    assert fallback_title_from_filename("math_lesson-1.pdf") == "math lesson 1"


def test_fallback_title_handles_path_and_empty():
    assert fallback_title_from_filename("/tmp/uploads/deck.pptx") == "deck"
    assert fallback_title_from_filename("") == "مستند بدون عنوان"
    assert fallback_title_from_filename(None) == "مستند بدون عنوان"
