# #109 · /slide_learning and slide-mode /generate_questions: content follows the
# slide (and topic) the student is on, is cached per slide, regenerates on
# demand, and reads the slide image only when the slide's own text is thin.
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import session_store  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app)

RICH = "شرح مفصل لفكرة الشريحة " * 40
LEARNING = {"explanation": "شرح الشريحة", "examples": ["مثال"], "notes": ["ملاحظة"]}
QUESTIONS = [{"q": "س؟", "o": ["أ", "ب", "ج", "د"], "a": 0, "e": "لأنها الصحيحة"}] * 3


def deck():
    return [
        {"slide_number": 1, "text": "مقدمة " + RICH},
        {"slide_number": 2, "text": "النموذج العلائقي " + RICH},
        {"slide_number": 3, "text": "استعلامات SQL " + RICH},
    ]


def make_session(slides, topics=None, images=()):
    session = session_store.create_session(filename="deck.pdf", slides=slides)
    session.topics = topics or []
    session.indexing_complete = True
    for n in images:
        with open(os.path.join(session.slide_images_dir, f"{n}.jpg"), "wb") as f:
            f.write(b"\xff\xd8fake-jpeg")
        session.slide_images.append(f"{n}.jpg")
    return session


def learn(session, **body):
    return client.post(f"/api/session/{session.session_id}/slide_learning", json={"language": "ar", **body})


def ask_quiz(session, **body):
    return client.post("/api/generate_questions", json={"session_id": session.session_id, "language": "ar", **body})


class Recorder:
    """Stands in for generate_slide_learning, recording what each call was grounded on."""

    def __init__(self, *results):
        self.calls = []
        self.results = list(results)

    def __call__(self, context_text, call_fn, language, topic_label=None):
        self.calls.append({"context": context_text, "language": language, "topic_label": topic_label})
        return self.results.pop(0) if self.results else dict(LEARNING)


def test_each_slide_is_grounded_on_itself_with_earlier_slides_as_context():
    session = make_session(deck())
    gen = Recorder()
    with patch("main.generate_slide_learning", side_effect=gen):
        first = learn(session, slide_number=1)
        third = learn(session, slide_number=3)

    assert first.status_code == 200 and third.status_code == 200
    assert first.json()["context_slides"] == [1]
    assert third.json()["context_slides"] == [2, 3]
    assert "مقدمة" in gen.calls[0]["context"].split("CURRENT SLIDE")[1]
    assert "استعلامات SQL" in gen.calls[1]["context"].split("CURRENT SLIDE")[1]
    assert "مقدمة" not in gen.calls[1]["context"]
    assert third.json()["explanation"] == "شرح الشريحة"
    assert third.json()["notes"] == ["ملاحظة"]


def test_generated_content_is_cached_per_slide_topic_and_language():
    session = make_session(deck(), topics=[{"topic_id": 0, "label": "المقدمة", "slides": [1, 2]}])
    gen = Recorder()
    with patch("main.generate_slide_learning", side_effect=gen):
        fresh = learn(session, slide_number=2)
        repeat = learn(session, slide_number=2)
        learn(session, slide_number=2, topic_id=0)
        learn(session, slide_number=2, language="en")

    assert fresh.json()["cached"] is False
    assert repeat.json()["cached"] is True
    assert len(gen.calls) == 3


def test_refresh_regenerates_and_replaces_the_cached_explanation():
    session = make_session(deck())
    gen = Recorder(dict(LEARNING), {**LEARNING, "explanation": "شرح جديد"})
    with patch("main.generate_slide_learning", side_effect=gen):
        learn(session, slide_number=1)
        regenerated = learn(session, slide_number=1, refresh=True)
        cached = learn(session, slide_number=1)

    assert regenerated.json()["explanation"] == "شرح جديد"
    assert regenerated.json()["cached"] is False
    assert cached.json()["explanation"] == "شرح جديد"
    assert len(gen.calls) == 2


def test_selected_topic_label_reaches_the_generator():
    session = make_session(deck(), topics=[{"topic_id": 1, "label": "التطبيقات", "slides": [3]}])
    gen = Recorder()
    with patch("main.generate_slide_learning", side_effect=gen):
        res = learn(session, slide_number=3, topic_id=1)

    assert gen.calls[0]["topic_label"] == "التطبيقات"
    assert res.json()["topic_id"] == 1
    assert res.json()["topic_label"] == "التطبيقات"


def test_thin_slide_reads_its_image_once_and_uses_it_as_context():
    slides = deck() + [{"slide_number": 4, "text": "مثال ٢"}]
    session = make_session(slides, images=[4])
    gen = Recorder()
    with patch("main.generate_slide_learning", side_effect=gen), \
         patch("main.describe_slide_visual", return_value="رسم يوضح جدولين مرتبطين بمفتاح") as vision:
        first = learn(session, slide_number=4)
        learn(session, slide_number=4, language="en")  # another key, same slide image

    assert first.json()["used_visual"] is True
    assert "رسم يوضح جدولين مرتبطين بمفتاح" in gen.calls[0]["context"]
    assert vision.call_count == 1


def test_rich_slide_does_not_call_vision():
    session = make_session(deck(), images=[1, 2, 3])
    with patch("main.generate_slide_learning", side_effect=Recorder()), \
         patch("main.describe_slide_visual") as vision:
        res = learn(session, slide_number=2)

    assert res.json()["used_visual"] is False
    vision.assert_not_called()


def test_slow_image_reading_is_abandoned_at_the_deadline():
    session = make_session([{"slide_number": 1, "text": "عنوان فقط"}], images=[1])
    gen = Recorder()

    def slow(*_args):
        time.sleep(1)
        return "وصف متأخر"

    with patch("main.VISION_DEADLINE_SECONDS", 0.05), \
         patch("main.generate_slide_learning", side_effect=gen), \
         patch("main.describe_slide_visual", side_effect=slow):
        res = learn(session, slide_number=1)

    assert res.status_code == 200
    assert res.json()["used_visual"] is False
    assert "وصف متأخر" not in gen.calls[0]["context"]


def test_unknown_slide_or_session_is_404():
    session = make_session(deck())
    with patch("main.generate_slide_learning", side_effect=Recorder()):
        assert learn(session, slide_number=99).status_code == 404
    assert client.post("/api/session/nope/slide_learning", json={"slide_number": 1}).status_code == 404


def test_failed_generation_is_502_and_not_cached():
    session = make_session(deck())
    gen = Recorder(None)
    with patch("main.generate_slide_learning", side_effect=gen):
        failed = learn(session, slide_number=1)
        retried = learn(session, slide_number=1)

    assert failed.status_code == 502
    assert retried.status_code == 200 and retried.json()["cached"] is False
    assert len(gen.calls) == 2


def test_quiz_for_a_slide_uses_that_slide_not_the_whole_document():
    session = make_session(deck())
    captured = []

    def fake_questions(content, call_fn, language):
        captured.append(content)
        return QUESTIONS

    with patch("main.generate_review_questions", side_effect=fake_questions):
        res = ask_quiz(session, slide_number=3)
        again = ask_quiz(session, slide_number=3)

    assert res.status_code == 200
    assert res.json()["questions"] == QUESTIONS
    assert res.json()["context_slides"] == [2, 3]
    assert "استعلامات SQL" in captured[0] and "مقدمة" not in captured[0]
    assert again.json()["cached"] is True
    assert len(captured) == 1


def test_quiz_is_built_on_the_explanation_the_student_read():
    session = make_session(deck(), topics=[{"topic_id": 0, "label": "المقدمة", "slides": [1, 2]}])
    captured = []

    def fake_questions(content, call_fn, language):
        captured.append(content)
        return QUESTIONS

    with patch("main.generate_slide_learning", side_effect=Recorder()), \
         patch("main.generate_review_questions", side_effect=fake_questions):
        learn(session, slide_number=1, topic_id=0)
        ask_quiz(session, slide_number=1, topic_id=0)

    assert "TOPIC: المقدمة" in captured[0]
    assert "شرح الشريحة" in captured[0]


def test_quiz_refresh_regenerates_and_a_failure_is_502():
    session = make_session(deck())
    with patch("main.generate_review_questions", side_effect=[QUESTIONS, None]) as gen:
        ask_quiz(session, slide_number=1)
        failed = ask_quiz(session, slide_number=1, refresh=True)

    assert failed.status_code == 502
    assert gen.call_count == 2


def test_quiz_without_a_slide_keeps_the_whole_document_behaviour():
    session = make_session(deck())
    captured = []

    def fake_questions(content, call_fn, language):
        captured.append(content)
        return QUESTIONS

    with patch("main.generate_review_questions", side_effect=fake_questions):
        res = ask_quiz(session)

    assert res.json() == {"questions": QUESTIONS}
    assert "مقدمة" in captured[0] and "استعلامات SQL" in captured[0]
