# #109 · detect_topics maps every topic to the slides it covers, so each topic
# is explained from its own slides and the UI can follow the current slide.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from topic_detector import detect_topics  # noqa: E402

CHUNKS = [
    {"chunk_id": "c_0", "text": "مقدمة عن قواعد البيانات", "slides": [1, 2]},
    {"chunk_id": "c_1", "text": "النموذج العلائقي والجداول", "slides": [3, 4]},
    {"chunk_id": "c_2", "text": "استعلامات SQL", "slides": [5]},
]


def fake_groq(response, captured=None):
    def call(prompt, max_tokens=0, temperature=0, system_prompt=None, reasoning_effort="medium"):
        if captured is not None:
            captured["prompt"] = prompt
        return response
    return call


def test_topics_carry_the_slides_they_cover():
    raw = '[{"label": "المقدمة", "slides": [1, 2]}, {"label": "SQL", "slides": [3, 4, 5]}]'
    assert detect_topics(CHUNKS, fake_groq(raw)) == [
        {"topic_id": 0, "label": "المقدمة", "slides": [1, 2]},
        {"topic_id": 1, "label": "SQL", "slides": [3, 4, 5]},
    ]


def test_invalid_slide_numbers_are_dropped_and_empty_topics_get_their_in_order_share():
    raw = '[{"label": "أ", "slides": [2, 99, "1", true, "x"]}, {"label": "ب", "slides": []}]'
    topics = detect_topics(CHUNKS, fake_groq(raw))
    assert topics[0]["slides"] == [1, 2]
    assert topics[1]["slides"] == [3, 4, 5]


def test_legacy_label_list_still_parses_with_in_order_slides():
    topics = detect_topics(CHUNKS, fake_groq('["أ", "ب", "ج"]'))
    assert [t["label"] for t in topics] == ["أ", "ب", "ج"]
    assert [t["slides"] for t in topics] == [[1], [2, 3], [4, 5]]


def test_more_topics_than_slides_still_gives_every_topic_a_slide():
    topics = detect_topics(CHUNKS[:1], fake_groq('["أ", "ب", "ج"]'))
    assert all(t["slides"] for t in topics)


def test_failure_falls_back_to_one_topic_over_the_whole_deck():
    assert detect_topics(CHUNKS, fake_groq("not json"), "en") == [
        {"topic_id": 0, "label": "General", "slides": [1, 2, 3, 4, 5]},
    ]


def test_prompt_asks_for_each_topics_slide_numbers():
    captured = {}
    detect_topics(CHUNKS, fake_groq('["أ"]', captured))
    assert captured["prompt"].startswith("Analyze this presentation")
    assert "[Slides 3, 4]" in captured["prompt"]
    assert '"slides"' in captured["prompt"]
