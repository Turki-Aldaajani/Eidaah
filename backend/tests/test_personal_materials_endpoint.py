# اختبار مهمة S1 (#43): معيار القبول عبر الـ API، الآن فوق Supabase (بعد
# إعادة الهيكلة لإعادة استخدام خط معالجة I3 الفعلي بدل الذاكرة المؤقتة):
#   • المادة الشخصية لا تظهر لغير صاحبها.
#   • التقدم يُحدَّث ويُقرأ عبر الـ API.
#
# لا شبكة حقيقية: عميل Supabase مزيّف محلي (FakeSupabase، بنفس نمط
# test_material_pipeline.py) محقون عبر personal_materials_store.get_service_client.
# process_material/generate_material_metadata (منطق I3/A4 نفسه) تُموَّه هنا
# لأن صحتهما مُختبرة في مكانها؛ هذا الملف يركّز على تكامل S1 معهما: هل
# يُستدعيان صح، وهل owner-scoping يمنع تسرّب مادة/تقدم بين المستخدمين.
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import uuid
from collections import defaultdict
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app
import personal_materials_store

client = TestClient(app)

SLIDES = [
    {"slide_number": 1, "text": "الشريحة الأولى"},
    {"slide_number": 2, "text": "الشريحة الثانية"},
    {"slide_number": 3, "text": "الشريحة الثالثة"},
    {"slide_number": 4, "text": "الشريحة الرابعة"},
]

FAKE_RESULT = {
    "summary": "تلخيص المادة", "language": "ar", "model": "test-model",
    "source_excerpt": "مقتطف", "slide_count": len(SLIDES),
    "topics": [{"topic_order": 0, "label": "موضوع", "explanation": "شرح", "example": "مثال"}],
}
FAKE_META = {"title": "عنوان ذكي", "description": "وصف ذكي", "auto_generated": True}


# ------------------------------------------------------------
# Supabase مزيّف: select/insert/upsert/update + eq/order(desc)/limit
# (نفس نمط tests/test_material_pipeline.py، مع دعم order(desc=True) الذي
# تحتاجه قائمة "موادي" الأحدث أولاً)
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
        self._desc = False
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

    def eq(self, col, val):
        self._filters.append((col, val))
        return self

    def order(self, col, desc=False, **k):
        self._order = col
        self._desc = desc
        return self

    def delete(self):
        self._op = "delete"
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
                rows.sort(key=lambda r: r.get(self._order, 0), reverse=self._desc)
            if self._limit is not None:
                rows = rows[: self._limit]
            return SimpleNamespace(data=rows)
        if self._op == "insert":
            out = []
            for r in self._payload:
                r = dict(r)
                r.setdefault("id", str(uuid.uuid4()))
                r.setdefault("created_at", "2026-07-22T00:00:00Z")
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


@pytest.fixture(autouse=True)
def fake_client():
    fake = FakeSupabase()
    with patch("personal_materials_store.get_service_client", return_value=fake):
        yield fake


def _seed(fake, owner_id, title="مادتي"):
    """Insert a personal materials row directly, as if already uploaded+processed."""
    row = fake.table("materials").insert({
        "title": title, "owner_id": owner_id, "scope": "personal",
        "processing_status": "processed",
    }).execute().data[0]
    fake.table("material_content").insert({
        "material_id": row["id"], "summary": "ملخص", "language": "ar",
        "slide_count": len(SLIDES),
    }).execute()
    return row


async def _fake_pages(file, file_type, filename):
    return list(SLIDES)


# --------------------------------------------------------------------------
# Identity guard
# --------------------------------------------------------------------------
def test_endpoints_require_identity_header():
    assert client.get("/api/my/materials").status_code == 401
    assert client.post("/api/my/materials",
                       files={"file": ("a.pdf", b"x", "application/pdf")}).status_code == 401


# --------------------------------------------------------------------------
# Upload → owner-scoped row inserted, I3's pipeline reused in the background
# --------------------------------------------------------------------------
def test_upload_inserts_owner_scoped_row(fake_client):
    with patch("main.ai_logic.process_file_to_pages", new=_fake_pages), \
         patch("personal_materials_store.process_material", return_value=FAKE_RESULT), \
         patch("personal_materials_store.generate_material_metadata", return_value=FAKE_META):
        res = client.post(
            "/api/my/materials",
            files={"file": ("notes.pdf", b"%PDF-1.4 fake", "application/pdf")},
            headers={"X-User-Id": "alice"},
        )
    assert res.status_code == 201
    body = res.json()
    assert body["scope"] == "personal"
    assert body["material_id"]

    row = fake_client.tables["materials"].rows[0]
    assert row["owner_id"] == "alice"
    assert row["scope"] == "personal"


def test_upload_reuses_i3_pipeline_and_stores_result(fake_client):
    with patch("main.ai_logic.process_file_to_pages", new=_fake_pages), \
         patch("personal_materials_store.process_material", return_value=FAKE_RESULT) as mock_process, \
         patch("personal_materials_store.generate_material_metadata", return_value=FAKE_META):
        res = client.post(
            "/api/my/materials",
            files={"file": ("notes.pdf", b"%PDF-1.4 fake", "application/pdf")},
            headers={"X-User-Id": "alice"},
        )
        mid = res.json()["material_id"]

    # I3's process_material was called with the extracted slides
    mock_process.assert_called_once()
    assert mock_process.call_args[0][0] == SLIDES

    detail = client.get(f"/api/my/materials/{mid}", headers={"X-User-Id": "alice"}).json()
    assert detail["processing_status"] == "processed"      # set by upsert_material_content
    assert detail["title"] == "عنوان ذكي"                  # from generate_material_metadata (A4)
    assert detail["summary"] == "تلخيص المادة"
    assert detail["topics"] == FAKE_RESULT["topics"]

    # stored via I3's real upsert_material_content — content/topics tables populated
    assert len(fake_client.tables["material_content"].rows) == 1
    assert len(fake_client.tables["material_topics"].rows) == 1


def test_failed_processing_marks_material_failed(fake_client):
    with patch("main.ai_logic.process_file_to_pages", new=_fake_pages), \
         patch("personal_materials_store.process_material", return_value=None):
        res = client.post(
            "/api/my/materials",
            files={"file": ("empty.pdf", b"x", "application/pdf")},
            headers={"X-User-Id": "alice"},
        )
        mid = res.json()["material_id"]

    row = next(r for r in fake_client.tables["materials"].rows if r["id"] == mid)
    assert row["processing_status"] == "failed"


# --------------------------------------------------------------------------
# القبول (١): المادة الشخصية لا تظهر لغير صاحبها
# --------------------------------------------------------------------------
def test_personal_material_hidden_from_non_owner(fake_client):
    row = _seed(fake_client, "alice")
    mid = row["id"]

    # bob لا يراها في قائمته ولا يقدر يفتحها
    bob_list = client.get("/api/my/materials", headers={"X-User-Id": "bob"})
    assert bob_list.status_code == 200
    assert bob_list.json()["materials"] == []

    bob_detail = client.get(f"/api/my/materials/{mid}", headers={"X-User-Id": "bob"})
    assert bob_detail.status_code == 404

    # alice تراها
    alice_list = client.get("/api/my/materials", headers={"X-User-Id": "alice"})
    assert [m["material_id"] for m in alice_list.json()["materials"]] == [mid]
    alice_detail = client.get(f"/api/my/materials/{mid}", headers={"X-User-Id": "alice"})
    assert alice_detail.status_code == 200


def test_matching_titles_never_collide_across_owners(fake_client):
    # خلافاً لـ material_ingest.find_or_create_material (title+university)،
    # كل رفع شخصي صف جديد دائماً — حتى بعنوان متطابق بين طالبين مختلفين.
    with patch("main.ai_logic.process_file_to_pages", new=_fake_pages), \
         patch("personal_materials_store.process_material", return_value=FAKE_RESULT), \
         patch("personal_materials_store.generate_material_metadata", return_value=FAKE_META):
        r1 = client.post("/api/my/materials",
                         files={"file": ("chapter1.pdf", b"a", "application/pdf")},
                         headers={"X-User-Id": "alice"})
        r2 = client.post("/api/my/materials",
                         files={"file": ("chapter1.pdf", b"b", "application/pdf")},
                         headers={"X-User-Id": "bob"})
    mid_a, mid_b = r1.json()["material_id"], r2.json()["material_id"]
    assert mid_a != mid_b

    alice_ids = {m["material_id"] for m in
                 client.get("/api/my/materials", headers={"X-User-Id": "alice"}).json()["materials"]}
    bob_ids = {m["material_id"] for m in
               client.get("/api/my/materials", headers={"X-User-Id": "bob"}).json()["materials"]}
    assert alice_ids == {mid_a}
    assert bob_ids == {mid_b}


# --------------------------------------------------------------------------
# القبول (٢): التقدم يُحدَّث ويُقرأ عبر الـ API
# --------------------------------------------------------------------------
def test_progress_updated_then_read_back(fake_client):
    mid = _seed(fake_client, "alice")["id"]

    upd = client.put(
        f"/api/my/materials/{mid}/progress",
        json={"completed_slides": [1, 2], "avg_review_score": 0.75},
        headers={"X-User-Id": "alice"},
    )
    assert upd.status_code == 200
    prog = upd.json()["progress"]
    assert prog["completed_slides"] == [1, 2]
    assert prog["completed_count"] == 2
    assert prog["total_slides"] == 4        # from material_content.slide_count
    assert prog["percent"] == 50
    assert prog["avg_review_score"] == 0.75
    assert prog["last_activity"] is not None

    got = client.get(f"/api/my/materials/{mid}/progress", headers={"X-User-Id": "alice"})
    assert got.status_code == 200
    assert got.json()["progress"]["completed_slides"] == [1, 2]
    assert got.json()["progress"]["avg_review_score"] == 0.75


def test_progress_ignores_out_of_range_slides_and_clamps_score(fake_client):
    mid = _seed(fake_client, "alice")["id"]   # 4 slides total
    res = client.put(
        f"/api/my/materials/{mid}/progress",
        json={"completed_slides": [1, 1, 99], "avg_review_score": 5},
        headers={"X-User-Id": "alice"},
    )
    prog = res.json()["progress"]
    assert prog["completed_slides"] == [1]        # 99 out of range, duplicate collapsed
    assert prog["avg_review_score"] == 1.0        # clamped to [0, 1]


def test_non_owner_cannot_read_or_update_progress(fake_client):
    mid = _seed(fake_client, "alice")["id"]

    assert client.get(f"/api/my/materials/{mid}/progress",
                      headers={"X-User-Id": "bob"}).status_code == 404
    assert client.put(f"/api/my/materials/{mid}/progress",
                      json={"completed_slides": [1]},
                      headers={"X-User-Id": "bob"}).status_code == 404

    # alice's progress untouched by bob's attempts
    got = client.get(f"/api/my/materials/{mid}/progress", headers={"X-User-Id": "alice"})
    assert got.json()["progress"]["completed_slides"] == []
    assert got.json()["progress"]["last_activity"] is None
