# #109 · slide_context: a slide is explained with earlier slides as context,
# reaching further back the thinner the current slide is.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from slide_context import (  # noqa: E402
    MAX_PREVIOUS_SLIDES,
    build_slide_context,
    format_slide_context,
    is_thin_slide,
)

RICH = "شرح مفصل لفكرة الشريحة " * 40  # ~760 meaningful chars
THIN = "مثال ٢"


def deck(*texts):
    return [{"slide_number": i + 1, "text": text} for i, text in enumerate(texts)]


def test_unknown_slide_returns_none():
    assert build_slide_context(deck(RICH), 7) is None


def test_first_slide_has_no_previous_context():
    ctx = build_slide_context(deck(RICH, RICH), 1)
    assert ctx["previous"] == []
    assert ctx["context_slides"] == [1]


def test_rich_slide_still_gets_the_previous_slide_as_continuity():
    ctx = build_slide_context(deck(RICH, RICH, RICH, RICH), 4)
    assert ctx["thin"] is False
    assert ctx["context_slides"] == [3, 4]


def test_thin_slide_reaches_back_up_to_three_slides():
    ctx = build_slide_context(deck("قصير أ", "قصير ب", "قصير ج", "قصير د", THIN), 5)
    assert ctx["thin"] is True
    assert ctx["context_slides"] == [2, 3, 4, 5]
    assert len(ctx["previous"]) == MAX_PREVIOUS_SLIDES


def test_thin_slide_stops_once_it_has_enough_context():
    ctx = build_slide_context(deck(RICH, RICH, THIN), 3)
    assert ctx["context_slides"] == [2, 3]


def test_slide_numbers_with_gaps_in_any_order():
    slides = [
        {"slide_number": 5, "text": THIN},
        {"slide_number": 1, "text": "أول"},
        {"slide_number": 2, "text": "ثاني"},
    ]
    assert build_slide_context(slides, 5)["context_slides"] == [1, 2, 5]


def test_thinness_ignores_bullets_and_punctuation():
    assert is_thin_slide("• • • — ... ٣")
    assert not is_thin_slide(RICH)


def test_prompt_marks_the_current_slide_as_focus_after_its_context():
    ctx = build_slide_context(deck("سياق سابق عن المفهوم", THIN), 2)
    text = format_slide_context(ctx, "رسم بياني يوضح العلاقة")
    assert text.index("سياق سابق عن المفهوم") < text.index("CURRENT SLIDE")
    assert "[Slide 2]" in text and THIN in text
    assert "رسم بياني يوضح العلاقة" in text


def test_prompt_without_a_visual_has_no_image_section():
    ctx = build_slide_context(deck(RICH), 1)
    assert "IMAGE" not in format_slide_context(ctx)
