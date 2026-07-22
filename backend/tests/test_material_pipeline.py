# اختبار مهمة I3 (#14): خط المعالجة المسبقة لمواد المكتبة بلا خدمات حية.
# fake_groq يحاكي Groq ويعدّ الاستدعاءات، وFakeSupabase يحاكي قاعدة البيانات.
# الاختبار المحوري: فتح مادة معالجة لا يزيد عدد استدعاءات Groq إطلاقاً.
import os
import sys
import uuid
from collections import defaultdict
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from material_ingest import (  # noqa: E402
    is_placeholder,
    assert_material_title_real,
    slides_from_text,
    process_material,
    upsert_material_content,
    find_or_create_material,
)
from material_service import build_material_view, fetch_material_content  # noqa: E402


# ------------------------------------------------------------
# Groq مزيّف يعدّ كل استدعاء ويجيب حسب نوع القالب
# ------------------------------------------------------------
def make_fake_groq():
    prompts = []

    def call(prompt, max_tokens=0, temperature=0, system_prompt=None, reasoning_effort="medium"):
        prompts.append(prompt)
        if prompt.strip().startswith("Analyze this presentation"):  # detect_topics
            return '["النموذج العلائقي", "لغة SQL"]'
        if '"explanation"' in prompt:  # generate_topic_analysis (JSON)
            return '{"explanation": "شرح مبني على نص المادة", "example": "مثال واقعي للطالب"}'
        return "تلخيص مركّز للمادة في ثلاث جمل."

    call.prompts = prompts
    return call


# ------------------------------------------------------------
# Supabase مزيّف: select/insert/upsert/update/delete + eq/order/limit
# ------------------------------------------------------------
class _FakeTable:
    def __init__(self):
        self.rows = []


class _FakeQuery:
    def __init__(self, table):
        self.t = table
        self._op = None
        self._payload = None
        self._on_conflict = None
        self._filters = []
        self._order = None
        self._limit = None

    def select(self, *a, **k):
        if self._op is None:
            self._op = "select"
        return self

    def insert(self, rows):
        self._op = "insert"
        self._payload = rows if isinstance(rows, list) else [rows]
        return self

    def upsert(self, rows, on_conflict=None):
        self._op = "upsert"
        self._payload = rows if isinstance(rows, list) else [rows]
        self._on_conflict = on_conflict
        return self

    def update(self, values):
        self._op = "update"
        self._payload = values
        return self

    def delete(self):
        self._op = "delete"
        return self

    def eq(self, col, val):
        self._filters.append((col, val))
        return self

    def order(self, col, **k):
        self._order = col
        return self

    def limit(self, n):
        self._limit = n
        return self

    def _match(self, row):
        return all(row.get(c) == v for c, v in self._filters)

    def execute(self):
        if self._op == "select":
            rows = [dict(r) for r in self.t.rows if self._match(r)]
            if self._order is not None:
                rows.sort(key=lambda r: r.get(self._order, 0))
            if self._limit is not None:
                rows = rows[: self._limit]
            return SimpleNamespace(data=rows)
        if self._op == "insert":
            out = []
            for r in self._payload:
                r = dict(r)
                r.setdefault("id", str(uuid.uuid4()))
                self.t.rows.append(r)
                out.append(dict(r))
            return SimpleNamespace(data=out)
        if self._op == "upsert":
            keys = [k.strip() for k in self._on_conflict.split(",")] if self._on_conflict else ["id"]
            out = []
            for r in self._payload:
                key = tuple(r.get(k) for k in keys)
                existing = next(
                    (x for x in self.t.rows if tuple(x.get(k) for k in keys) == key), None
                )
                if existing:
                    existing.update(r)
                    out.append(dict(existing))
                else:
                    r = dict(r)
                    r.setdefault("id", str(uuid.uuid4()))
                    self.t.rows.append(r)
                    out.append(dict(r))
            return SimpleNamespace(data=out)
        if self._op == "update":
            for r in self.t.rows:
                if self._match(r):
                    r.update(self._payload)
            return SimpleNamespace(data=[])
        if self._op == "delete":
            self.t.rows[:] = [r for r in self.t.rows if not self._match(r)]
            return SimpleNamespace(data=[])
        raise AssertionError(f"unknown op {self._op}")


class FakeSupabase:
    def __init__(self):
        self.tables = defaultdict(_FakeTable)

    def table(self, name):
        return _FakeQuery(self.tables[name])


REAL_TEXT = (
    "قاعدة البيانات مجموعة منظمة من البيانات المترابطة تُخزَّن إلكترونياً.\n"
    "---\n"
    "النموذج العلائقي يمثّل البيانات في جداول من صفوف وأعمدة، ويربطها بالمفاتيح.\n"
    "---\n"
    "لغة SQL هي اللغة القياسية للاستعلام عن البيانات وتعديلها في قواعد البيانات العلائقية."
)


# ============================================================
# حارس العناوين الوهمية
# ============================================================
@pytest.mark.parametrize("name", ["", "   ", None, "placeholder", "TODO", "مادة تجريبية", "عنوان المادة"])
def test_is_placeholder_true_for_fake_titles(name):
    assert is_placeholder(name) is True


@pytest.mark.parametrize("name", ["مقدمة في قواعد البيانات العلائقية", "أساسيات التفاضل"])
def test_is_placeholder_false_for_real_titles(name):
    assert is_placeholder(name) is False


def test_assert_material_title_real_rejects_placeholder():
    assert_material_title_real("مقدمة في قواعد البيانات")  # لا يرفع
    with pytest.raises(ValueError):
        assert_material_title_real("عنوان المادة")


# ============================================================
# تقسيم النص إلى شرائح
# ============================================================
def test_slides_from_text_splits_on_separators():
    slides = slides_from_text(REAL_TEXT)
    assert len(slides) == 3
    assert slides[0]["slide_number"] == 1
    assert "قاعدة البيانات" in slides[0]["text"]
    assert all(s["text"].strip() for s in slides)


def test_slides_from_text_empty():
    assert slides_from_text("") == []
    assert slides_from_text(None) == []


# ============================================================
# المعالجة تعيد استخدام خط التحليل وتنتج تلخيصاً ومواضيع
# ============================================================
def test_process_material_returns_summary_and_topics():
    fake = make_fake_groq()
    result = process_material(slides_from_text(REAL_TEXT), fake, "ar")

    assert result["summary"] == "تلخيص مركّز للمادة في ثلاث جمل."
    assert result["slide_count"] == 3
    assert result["language"] == "ar"
    assert result["model"]
    assert len(result["topics"]) == 2
    for t in result["topics"]:
        assert t["label"]
        assert t["explanation"]
        assert t["example"]
    # نص المادة مرّ فعلاً عبر خط المعالجة (Groq استُدعي)
    assert len(fake.prompts) > 0


def test_process_material_none_without_text():
    fake = make_fake_groq()
    assert process_material([], fake, "ar") is None
    assert process_material([{"slide_number": 1, "text": "   "}], fake, "ar") is None
    assert fake.prompts == []  # لا استدعاء Groq بلا نص


# ============================================================
# التخزين مرتبط وidempotent، ويعلّم المادة processed
# ============================================================
def _seed_material(client, title="مقدمة في قواعد البيانات العلائقية"):
    return find_or_create_material(client, {
        "title": title, "university": "جامعة الإمام محمد بن سعود الإسلامية",
        "college": "كلية علوم الحاسب", "major": "علوم حاسب", "level": 3,
    })


def test_upsert_stores_content_marks_processed_and_is_idempotent():
    fake = make_fake_groq()
    result = process_material(slides_from_text(REAL_TEXT), fake, "ar")
    client = FakeSupabase()
    mid = _seed_material(client)

    counts = upsert_material_content(client, mid, result)
    assert counts == {"topics": 2, "has_summary": True}

    # المادة صارت processed
    materials = client.tables["materials"].rows
    assert materials[0]["processing_status"] == "processed"
    # صف محتوى واحد ومواضيع مخزّنة
    assert len(client.tables["material_content"].rows) == 1
    assert len(client.tables["material_topics"].rows) == 2

    # إعادة التشغيل لا تُكرّر الصفوف (idempotent)
    upsert_material_content(client, mid, result)
    assert len(client.tables["material_content"].rows) == 1
    assert len(client.tables["material_topics"].rows) == 2


def test_find_or_create_material_is_idempotent():
    client = FakeSupabase()
    mid1 = _seed_material(client)
    mid2 = _seed_material(client)
    assert mid1 == mid2
    assert len(client.tables["materials"].rows) == 1


# ============================================================
# تجميع العرض نقيّ ومرتّب
# ============================================================
def test_build_material_view_orders_topics_and_merges_content():
    material = {"id": "m1", "title": "مادة", "university": "جامعة", "level": 3, "processing_status": "processed"}
    content = {"summary": "تلخيص", "language": "ar", "slide_count": 3}
    topics = [
        {"topic_order": 1, "label": "ب", "explanation": "شرح ب", "example": "مثال ب"},
        {"topic_order": 0, "label": "أ", "explanation": "شرح أ", "example": "مثال أ"},
    ]
    view = build_material_view(material, content, topics)
    assert view["summary"] == "تلخيص"
    assert view["slide_count"] == 3
    assert [t["label"] for t in view["topics"]] == ["أ", "ب"]  # مرتّبة بـ topic_order


def test_build_material_view_none_for_missing_material():
    assert build_material_view(None, None, []) is None


# ============================================================
# المحوري: فتح مادة معالجة لا يستدعي Groq إطلاقاً
# ============================================================
def test_opening_processed_material_calls_groq_zero_times():
    fake = make_fake_groq()
    result = process_material(slides_from_text(REAL_TEXT), fake, "ar")
    calls_after_processing = len(fake.prompts)
    assert calls_after_processing > 0  # المعالجة استخدمت Groq (مرة واحدة)

    client = FakeSupabase()
    mid = _seed_material(client)
    upsert_material_content(client, mid, result)

    # فتح المادة عبر مسار القراءة
    view = fetch_material_content(client, mid)

    assert view is not None
    assert view["processing_status"] == "processed"
    assert view["summary"] == "تلخيص مركّز للمادة في ثلاث جمل."
    assert len(view["topics"]) == 2
    assert view["topics"][0]["explanation"]
    # جوهر I3: القراءة لم تزد عدد استدعاءات Groq إطلاقاً
    assert len(fake.prompts) == calls_after_processing


def test_fetch_material_content_none_when_missing():
    client = FakeSupabase()
    assert fetch_material_content(client, "does-not-exist") is None
