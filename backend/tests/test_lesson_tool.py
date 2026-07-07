import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from lesson_tool import generate_lesson_tool_content


def fake_groq(response):
    def _call(prompt, max_tokens=300, temperature=0.3, system_prompt=None):
        return response
    return _call


def test_sum_returns_points_list_on_valid_json():
    raw = '{"points": ["نقطة أولى", "نقطة ثانية", "نقطة ثالثة", "نقطة رابعة"]}'
    result = generate_lesson_tool_content("m1", "math", "القوى والأسس", "sum", fake_groq(raw), "ar")
    assert result == {"points": ["نقطة أولى", "نقطة ثانية", "نقطة ثالثة", "نقطة رابعة"]}


def test_sum_strips_markdown_code_fences():
    raw = '```json\n{"points": ["a", "b"]}\n```'
    result = generate_lesson_tool_content("m1", "math", "القوى والأسس", "sum", fake_groq(raw), "ar")
    assert result == {"points": ["a", "b"]}


def test_ex_returns_heading_and_paragraphs():
    raw = '{"heading": "مثال من الحياة", "paragraphs": ["فقرة أولى", "فقرة ثانية"]}'
    result = generate_lesson_tool_content("m1", "math", "القوى والأسس", "ex", fake_groq(raw), "ar")
    assert result == {"heading": "مثال من الحياة", "paragraphs": ["فقرة أولى", "فقرة ثانية"]}


def test_notes_returns_laws_defs_exam():
    raw = '{"laws": ["قانون ١"], "defs": ["تعريف ١"], "exam": ["نصيحة ١"]}'
    result = generate_lesson_tool_content("m1", "math", "القوى والأسس", "notes", fake_groq(raw), "ar")
    assert result == {"laws": ["قانون ١"], "defs": ["تعريف ١"], "exam": ["نصيحة ١"]}


def test_quiz_returns_five_questions_on_valid_json():
    question = {"q": "سؤال؟", "o": ["أ", "ب", "ج", "د"], "a": 1}
    raw = "[" + ", ".join([str(question).replace("'", '"')] * 5) + "]"
    result = generate_lesson_tool_content("m1", "math", "القوى والأسس", "quiz", fake_groq(raw), "ar")
    assert isinstance(result, list)
    assert len(result) == 5
    assert result[0] == question


def test_quiz_rejects_wrong_question_count():
    raw = '[{"q": "س؟", "o": ["أ", "ب", "ج", "د"], "a": 0}]'
    result = generate_lesson_tool_content("m1", "math", "القوى والأسس", "quiz", fake_groq(raw), "ar")
    assert result is None


def test_quiz_rejects_option_count_not_four():
    q = {"q": "س؟", "o": ["أ", "ب", "ج"], "a": 0}
    raw = "[" + ", ".join([str(q).replace("'", '"')] * 5) + "]"
    result = generate_lesson_tool_content("m1", "math", "القوى والأسس", "quiz", fake_groq(raw), "ar")
    assert result is None


def test_quiz_rejects_out_of_range_answer_index():
    q = {"q": "س؟", "o": ["أ", "ب", "ج", "د"], "a": 9}
    raw = "[" + ", ".join([str(q).replace("'", '"')] * 5) + "]"
    result = generate_lesson_tool_content("m1", "math", "القوى والأسس", "quiz", fake_groq(raw), "ar")
    assert result is None


def test_returns_none_on_invalid_json():
    result = generate_lesson_tool_content("m1", "math", "القوى والأسس", "sum", fake_groq("not json at all"), "ar")
    assert result is None


def test_returns_none_when_shape_does_not_match_tool():
    raw = '{"points": "not a list"}'
    result = generate_lesson_tool_content("m1", "math", "القوى والأسس", "sum", fake_groq(raw), "ar")
    assert result is None
