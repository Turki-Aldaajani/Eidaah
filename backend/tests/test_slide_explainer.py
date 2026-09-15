# #109 · slide_explainer: one LLM call → explanation + example + notes for a
# slide in context, and a vision reading of a thin slide's image. Offline.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from slide_explainer import MAX_NOTES, describe_slide_visual, generate_slide_learning  # noqa: E402

GOOD = '{"explanation": "شرح الفكرة", "example": "مثال من الواقع", "notes": ["نقطة أولى", "نقطة ثانية"]}'


def fake_groq(response, captured=None):
    def call(prompt, max_tokens=0, temperature=0, system_prompt=None, reasoning_effort="medium"):
        if captured is not None:
            captured.update(prompt=prompt, system=system_prompt, max_tokens=max_tokens)
        return response
    return call


def test_returns_explanation_example_and_notes():
    assert generate_slide_learning("سياق", fake_groq(GOOD), "ar") == {
        "explanation": "شرح الفكرة",
        "examples": ["مثال من الواقع"],
        "notes": ["نقطة أولى", "نقطة ثانية"],
    }


def test_strips_code_fences():
    out = generate_slide_learning("سياق", fake_groq(f"```json\n{GOOD}\n```"))
    assert out["explanation"] == "شرح الفكرة"


def test_prompt_carries_context_topic_and_language():
    captured = {}
    generate_slide_learning("CURRENT SLIDE: نص الشريحة", fake_groq(GOOD, captured), "en", topic_label="التطبيقات")
    assert "CURRENT SLIDE: نص الشريحة" in captured["prompt"]
    assert "TOPIC: التطبيقات" in captured["prompt"]
    assert "ENTIRELY in English" in captured["system"]
    assert captured["max_tokens"] <= 1000


def test_asks_to_explain_the_idea_instead_of_paraphrasing_the_slide():
    captured = {}
    generate_slide_learning("سياق", fake_groq(GOOD, captured))
    assert "Do not paraphrase" in captured["prompt"]
    assert "previous slides" in captured["prompt"]


def test_empty_context_skips_the_llm():
    def must_not_run(**_):
        raise AssertionError("the LLM should not be called")
    assert generate_slide_learning("   ", must_not_run) is None


def test_unusable_output_returns_none():
    assert generate_slide_learning("سياق", fake_groq("ليس JSON")) is None
    assert generate_slide_learning("سياق", fake_groq('{"explanation": "", "example": "x"}')) is None
    assert generate_slide_learning("سياق", fake_groq('["not", "an object"]')) is None


def test_llm_error_returns_none():
    def failing(**_):
        raise RuntimeError("provider down")
    assert generate_slide_learning("سياق", failing) is None


def test_bad_notes_are_dropped_and_capped():
    many = ", ".join(f'"نقطة {i}"' for i in range(10))
    out = generate_slide_learning("سياق", fake_groq('{"explanation": "شرح", "notes": [' + many + ', 5, ""]}'))
    assert out["notes"] == [f"نقطة {i}" for i in range(MAX_NOTES)]
    assert out["examples"] == []

    out = generate_slide_learning("سياق", fake_groq('{"explanation": "شرح", "notes": "نص وليس قائمة"}'))
    assert out["notes"] == []


def test_visual_description_drops_inline_thinking():
    captured = {}

    def vision(prompt, image_bytes, max_tokens=0):
        captured.update(prompt=prompt, image=image_bytes, max_tokens=max_tokens)
        return "<think>أفكر</think>\n رسم يوضح دورة الماء "

    assert describe_slide_visual(b"jpeg", vision, "ar") == "رسم يوضح دورة الماء"
    assert captured["image"] == b"jpeg"
    assert "in Arabic" in captured["prompt"]
    assert captured["max_tokens"] <= 1000


def test_visual_description_is_empty_on_failure_or_without_an_image():
    def failing(*_args, **_kwargs):
        raise TimeoutError("slow")
    assert describe_slide_visual(b"jpeg", failing) == ""
    assert describe_slide_visual(b"", failing) == ""
