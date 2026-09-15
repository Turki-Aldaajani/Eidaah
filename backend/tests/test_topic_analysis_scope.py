# #109 · generate_topic_analysis explains a topic from ITS slides. Before, every
# topic got all chunks truncated to 4000 chars: in practice the opening slides.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from rag_generator import generate_topic_analysis  # noqa: E402

FIRST = "محتوى الموضوع الأول عن المقدمة"
SECOND = "محتوى الموضوع الثاني عن التطبيقات"
CHUNKS = [
    {"chunk_id": "c_0", "text": FIRST, "slides": [1, 2]},
    {"chunk_id": "c_1", "text": SECOND, "slides": [3]},
]


def recording_groq():
    prompts = []

    def call(prompt, max_tokens=0, temperature=0, system_prompt=None, reasoning_effort="medium"):
        prompts.append(prompt)
        return '{"explanation": "شرح", "example": "مثال"}'

    return call, prompts


def test_topic_is_explained_from_its_own_slides_only():
    call, prompts = recording_groq()
    generate_topic_analysis({"topic_id": 1, "label": "التطبيقات", "slides": [3]}, CHUNKS, "", call, "ar")
    assert SECOND in prompts[0]
    assert FIRST not in prompts[0]


def test_later_topic_is_not_cut_off_by_long_earlier_slides():
    call, prompts = recording_groq()
    chunks = [
        {"chunk_id": "c_0", "text": "ا" * 5000, "slides": [1]},
        {"chunk_id": "c_1", "text": SECOND, "slides": [2]},
    ]
    generate_topic_analysis({"topic_id": 1, "label": "التطبيقات", "slides": [2]}, chunks, "", call, "ar")
    assert SECOND in prompts[0]


def test_topic_without_slides_still_uses_every_chunk():
    call, prompts = recording_groq()
    generate_topic_analysis({"topic_id": 0, "label": "عام"}, CHUNKS, "", call, "ar")
    assert FIRST in prompts[0] and SECOND in prompts[0]
