import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json

from question_generator import generate_review_questions


def fake_groq(response):
    def _call(prompt, max_tokens=300, temperature=0.3, system_prompt=None):
        return response
    return _call


def make_questions(n):
    return [
        {"q": f"سؤال {i}؟", "o": ["أ", "ب", "ج", "د"], "a": i % 4, "e": "التعليل"}
        for i in range(n)
    ]


CONTENT = "الطاقة الحركية هي طاقة الحركة. تزداد بزيادة السرعة والكتلة."


def test_returns_questions_on_valid_json():
    raw = json.dumps(make_questions(4), ensure_ascii=False)
    result = generate_review_questions(CONTENT, fake_groq(raw), "ar")
    assert isinstance(result, list)
    assert len(result) == 4
    assert result[0]["q"] == "سؤال 0؟"
    assert result[0]["e"] == "التعليل"


def test_accepts_minimum_three_questions():
    raw = json.dumps(make_questions(3), ensure_ascii=False)
    result = generate_review_questions(CONTENT, fake_groq(raw), "ar")
    assert result is not None and len(result) == 3


def test_strips_markdown_code_fences():
    raw = "```json\n" + json.dumps(make_questions(3), ensure_ascii=False) + "\n```"
    result = generate_review_questions(CONTENT, fake_groq(raw), "ar")
    assert result is not None and len(result) == 3


def test_trims_whitespace_in_fields():
    q = [{"q": "  سؤال؟  ", "o": [" أ ", "ب", "ج", "د"], "a": 0, "e": "  تعليل  "}] * 3
    result = generate_review_questions(CONTENT, fake_groq(json.dumps(q, ensure_ascii=False)), "ar")
    assert result[0]["q"] == "سؤال؟"
    assert result[0]["o"][0] == "أ"
    assert result[0]["e"] == "تعليل"


def test_rejects_too_few_questions():
    raw = json.dumps(make_questions(2), ensure_ascii=False)
    assert generate_review_questions(CONTENT, fake_groq(raw), "ar") is None


def test_rejects_too_many_questions():
    raw = json.dumps(make_questions(6), ensure_ascii=False)
    assert generate_review_questions(CONTENT, fake_groq(raw), "ar") is None


def test_rejects_option_count_not_four():
    q = [{"q": "س؟", "o": ["أ", "ب", "ج"], "a": 0, "e": "ت"}] * 3
    assert generate_review_questions(CONTENT, fake_groq(json.dumps(q, ensure_ascii=False)), "ar") is None


def test_rejects_out_of_range_answer_index():
    q = [{"q": "س؟", "o": ["أ", "ب", "ج", "د"], "a": 9, "e": "ت"}] * 3
    assert generate_review_questions(CONTENT, fake_groq(json.dumps(q, ensure_ascii=False)), "ar") is None


def test_rejects_boolean_answer_index():
    q = [{"q": "س؟", "o": ["أ", "ب", "ج", "د"], "a": True, "e": "ت"}] * 3
    assert generate_review_questions(CONTENT, fake_groq(json.dumps(q, ensure_ascii=False)), "ar") is None


def test_rejects_missing_explanation():
    q = [{"q": "س؟", "o": ["أ", "ب", "ج", "د"], "a": 0}] * 3
    assert generate_review_questions(CONTENT, fake_groq(json.dumps(q, ensure_ascii=False)), "ar") is None


def test_returns_none_on_invalid_json():
    assert generate_review_questions(CONTENT, fake_groq("not json at all"), "ar") is None


def test_returns_none_on_empty_content():
    raw = json.dumps(make_questions(3), ensure_ascii=False)
    assert generate_review_questions("   ", fake_groq(raw), "ar") is None
