# اختبار مهمة C2 (#50): منطق خط إدخال المناهج بلا خدمات حية.
# fake_groq يحاكي Groq، وFakeSupabase يحاكي عميل قاعدة البيانات.
import os
import sys
import uuid
from collections import defaultdict
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from curriculum_ingest import (  # noqa: E402
    is_placeholder,
    assert_no_placeholders,
    _source_from_pages,
    normalize_ar_text,
    process_lesson_content,
    ingest_entry,
    upsert_curriculum,
)


# ------------------------------------------------------------
# Groq مزيّف يسجّل كل ما استُدعي به
# ------------------------------------------------------------
def make_fake_groq():
    prompts = []

    def call(prompt, max_tokens=0, temperature=0, system_prompt=None):
        prompts.append(prompt)
        if '"explanation"' in prompt:  # قالب التحليل (RAG) يطلب JSON
            return '{"explanation": "شرح مبني على نص الكتاب", "example": "مثال واقعي للطالب"}'
        return "تلخيص مركّز لهذا الدرس في ثلاث جمل."

    call.prompts = prompts
    return call


# ------------------------------------------------------------
# Supabase مزيّف: upsert بمفاتيح on_conflict (idempotent)
# ------------------------------------------------------------
class _FakeTable:
    def __init__(self, store):
        self.store = store

    def upsert(self, rows, on_conflict=None):
        self._rows = rows
        self._keys = [k.strip() for k in on_conflict.split(",")] if on_conflict else []
        return self

    def execute(self):
        returned = []
        for row in self._rows:
            key = tuple(row.get(k) for k in self._keys)
            existing = self.store.get(key)
            if existing:
                rid = existing["id"]
                existing.update(row)
                existing["id"] = rid
                stored = existing
            else:
                stored = {**row, "id": str(uuid.uuid4())}
                self.store[key] = stored
            returned.append(dict(stored))
        return SimpleNamespace(data=returned)


class FakeSupabase:
    def __init__(self):
        self.stores = defaultdict(dict)

    def table(self, name):
        return _FakeTable(self.stores[name])


# ------------------------------------------------------------
# عيّنة مدخل مادة (أسماء حقيقية + نطاقات صفحات)
# ------------------------------------------------------------
def sample_entry():
    return {
        "subject": "math", "stage": "m1", "semester": 1,
        "units": [{
            "unit_name": "الأعداد الصحيحة والعمليات عليها",
            "lessons": [
                {"lesson_title": "جمع الأعداد الصحيحة", "pages": [10, 12]},
                {"lesson_title": "طرح الأعداد الصحيحة", "pages": [13, 15]},
            ],
        }],
    }


def dict_provider(mapping):
    def provider(lesson):
        return mapping.get(lesson["lesson_title"], "")
    return provider


# ============================================================
# حارس الأسماء الوهمية
# ============================================================
@pytest.mark.parametrize("name", [
    "", "   ", None, "placeholder", "TODO", "Lorem ipsum",
    "درس تجريبي", "عنوان الدرس", "اسم الوحدة",
])
def test_is_placeholder_true_for_fake_names(name):
    assert is_placeholder(name) is True


@pytest.mark.parametrize("name", [
    "الأعداد الصحيحة", "جمع الكسور الاعتيادية", "المبتدأ والخبر",
    "أساسيات جهاز الحاسب",
])
def test_is_placeholder_false_for_real_names(name):
    assert is_placeholder(name) is False


def test_assert_no_placeholders_rejects_fake_and_accepts_real():
    good = {"units": [{"unit_name": "الكسور", "lessons": [{"lesson_title": "جمع الكسور"}]}]}
    assert_no_placeholders(good)  # لا يرفع

    bad = {"units": [{"unit_name": "الكسور", "lessons": [{"lesson_title": "عنوان الدرس"}]}]}
    with pytest.raises(ValueError):
        assert_no_placeholders(bad)


# ============================================================
# استخراج نص نطاق الصفحات
# ============================================================
def test_normalize_ar_reverses_visual_arabic():
    # النص المستخرج بترتيب معكوس -> الترتيب المنطقي الصحيح
    assert normalize_ar_text("سرهفلا") == "الفهرس"
    assert normalize_ar_text("بلاطلا") == "الطالب"


def test_normalize_ar_keeps_numbers_and_latin_readable():
    # مقاطع الأرقام/اللاتيني تُقرأ طبيعية بعد التطبيع (لا تنعكس)
    assert normalize_ar_text("12 نوثياب") == "بايثون 12"
    assert normalize_ar_text("3 نوثياب") == "بايثون 3"
    # يعالج كل سطر على حدة
    assert normalize_ar_text("سرهفلا\nبلاطلا") == "الفهرس\nالطالب"


def test_normalize_ar_handles_empty():
    assert normalize_ar_text("") == ""
    assert normalize_ar_text(None) is None


def test_source_from_pages_joins_range_inclusive():
    pages = [
        {"page": 9, "text": "قبل"}, {"page": 10, "text": "أ"},
        {"page": 11, "text": "ب"}, {"page": 12, "text": "ج"},
        {"page": 13, "text": "بعد"},
    ]
    assert _source_from_pages(pages, 10, 12) == "أ\n\nب\n\nج"
    assert _source_from_pages(pages, None, None) == ""


# ============================================================
# معالجة الدرس تعيد استخدام I3 وتعيد شرحاً + تلخيصاً
# ============================================================
def test_process_lesson_content_returns_explanation_and_summary():
    fake = make_fake_groq()
    source = "الأعداد الصحيحة تشمل الموجبة والسالبة والصفر، وتُجمع وتُطرح على خط الأعداد."
    content = process_lesson_content("جمع الأعداد الصحيحة", source, fake, "ar")

    assert content["explanation"]
    assert content["summary"] == "تلخيص مركّز لهذا الدرس في ثلاث جمل."
    assert content["example"]
    assert content["source_excerpt"].startswith("الأعداد الصحيحة")
    assert content["model"]
    # يثبت أن نص الكتاب مرّ فعلاً عبر خط المعالجة (I3)
    assert any(source[:20] in p for p in fake.prompts)


def test_process_lesson_content_returns_none_without_source():
    fake = make_fake_groq()
    assert process_lesson_content("درس", "", fake, "ar") is None
    assert fake.prompts == []  # لا استدعاء Groq بلا نص مصدر


# ============================================================
# إدخال مادة كامل: كل درس مرتبط بمحتوى معالج
# ============================================================
def test_ingest_entry_links_every_lesson_to_processed_content():
    fake = make_fake_groq()
    provider = dict_provider({
        "جمع الأعداد الصحيحة": "نص الدرس الأول من الكتاب.",
        "طرح الأعداد الصحيحة": "نص الدرس الثاني من الكتاب.",
    })
    result = ingest_entry(sample_entry(), fake, provider, "ar")

    assert len(result["units"]) == 1
    lessons = result["units"][0]["lessons"]
    assert len(lessons) == 2
    for lesson in lessons:
        assert lesson["processed"] is True
        assert lesson["content"]["explanation"]
        assert lesson["content"]["summary"]


def test_ingest_entry_raises_on_placeholder_name():
    fake = make_fake_groq()
    entry = sample_entry()
    entry["units"][0]["lessons"][0]["lesson_title"] = "عنوان الدرس"
    with pytest.raises(ValueError):
        ingest_entry(entry, fake, dict_provider({}), "ar")


# ============================================================
# الإدخال إلى Supabase: مرتبط وidempotent
# ============================================================
def test_upsert_curriculum_links_and_is_idempotent():
    fake = make_fake_groq()
    provider = dict_provider({
        "جمع الأعداد الصحيحة": "نص الدرس الأول.",
        "طرح الأعداد الصحيحة": "نص الدرس الثاني.",
    })
    result = ingest_entry(sample_entry(), fake, provider, "ar")

    client = FakeSupabase()
    counts1 = upsert_curriculum(client, result)
    assert counts1 == {"units": 1, "lessons": 2, "contents": 2}

    units = list(client.stores["curriculum_units"].values())
    lessons = list(client.stores["curriculum_lessons"].values())
    contents = list(client.stores["curriculum_lesson_content"].values())

    # كل درس مرتبط بوحدة موجودة، وكل محتوى مرتبط بدرس موجود
    unit_ids = {u["id"] for u in units}
    lesson_ids = {l["id"] for l in lessons}
    assert all(l["unit_id"] in unit_ids for l in lessons)
    assert all(c["lesson_id"] in lesson_ids for c in contents)
    assert all(c.get("explanation") and c.get("summary") for c in contents)

    # إعادة التشغيل لا تُكرّر الصفوف (idempotent)
    upsert_curriculum(client, result)
    assert len(client.stores["curriculum_units"]) == 1
    assert len(client.stores["curriculum_lessons"]) == 2
    assert len(client.stores["curriculum_lesson_content"]) == 2
