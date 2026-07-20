# اختبار مهمة C2 (#50): سكيما المناهج + المحتوى المعالج وسياسات RLS.
# القراءة عامة لمحتوى المنهج، والكتابة عبر service_role (docs/HACKATHON_PLAN.md).
import os
import re

MIGRATION_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "supabase", "migrations",
    "20260720000000_c2_curriculum_schema.sql",
)

with open(MIGRATION_PATH, encoding="utf-8") as f:
    SQL = f.read().lower()

TABLES = ["curriculum_units", "curriculum_lessons", "curriculum_lesson_content"]


def _table_body(table):
    m = re.search(
        rf"create table if not exists public\.{table}\s*\((.*?)\);", SQL, re.S)
    assert m, f"{table} table not found"
    return m.group(1)


def test_migration_file_exists_and_not_empty():
    assert len(SQL) > 0


def test_all_three_tables_are_created():
    for table in TABLES:
        assert f"create table if not exists public.{table}" in SQL, table


def test_units_have_curriculum_columns_from_issue():
    # بطاقة #50: unit_name · subject · stage · semester · order
    body = _table_body("curriculum_units")
    for column in ["unit_name", "subject", "stage", "semester", "unit_order"]:
        assert column in body, column


def test_lessons_have_columns_from_issue():
    # بطاقة #50: lesson_title · unit_id · content_url · processed
    body = _table_body("curriculum_lessons")
    for column in ["lesson_title", "unit_id", "content_url", "processed"]:
        assert column in body, column


def test_lessons_link_to_units():
    body = _table_body("curriculum_lessons")
    assert re.search(r"unit_id\s+uuid\s+not null\s+references public\.curriculum_units", body)


def test_processed_defaults_false():
    body = _table_body("curriculum_lessons")
    assert re.search(r"processed\s+boolean\s+not null\s+default\s+false", body)


def test_lesson_content_holds_explanation_and_summary():
    # معيار القبول #2: محتوى معالج (شرح + تلخيص) مرتبط بالدرس
    body = _table_body("curriculum_lesson_content")
    assert re.search(r"lesson_id\s+uuid\s+primary key\s+references public\.curriculum_lessons", body)
    for column in ["explanation", "summary"]:
        assert column in body, column


def test_names_cannot_be_empty():
    # حارس ضد الأسماء الفارغة/placeholder على مستوى قاعدة البيانات
    assert re.search(r"unit_name\s+text\s+not null\s+check\s*\(length\(btrim\(unit_name\)\)\s*>\s*0\)", SQL)
    assert re.search(r"lesson_title\s+text\s+not null\s+check\s*\(length\(btrim\(lesson_title\)\)\s*>\s*0\)", SQL)


def test_rls_enabled_on_all_tables():
    for table in TABLES:
        assert f"alter table public.{table} enable row level security" in SQL, table


def test_public_read_policy_on_all_tables():
    for table in TABLES:
        policy = re.search(
            rf'create policy "{table}_public_read" on public\.{table}\s*'
            r"for select to anon, authenticated\s*using \(true\)",
            SQL,
        )
        assert policy, table


def test_no_public_write_policies():
    # الكتابة عبر service_role فقط (يتجاوز RLS) — لا سياسة insert/update عامة
    assert "for insert" not in SQL
    assert "for update to" not in SQL


def test_idempotent_upsert_keys_exist():
    # مفاتيح طبيعية فريدة تجعل إعادة تشغيل الإدخال بلا تكرار
    assert "unique (subject, stage, semester, unit_name)" in SQL
    assert "unique (unit_id, lesson_title)" in SQL
