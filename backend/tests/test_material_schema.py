# اختبار مهمة I3 (#14): اكتمال سكيما محتوى المواد وسياسات RLS.
import os
import re

MIGRATION_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "supabase", "migrations",
    "20260721000000_i3_material_content.sql",
)

with open(MIGRATION_PATH, encoding="utf-8") as f:
    SQL = f.read().lower()

TABLES = ["material_content", "material_topics"]


def test_migration_file_exists_and_not_empty():
    assert len(SQL) > 0


def test_both_tables_created():
    for table in TABLES:
        assert f"create table if not exists public.{table}" in SQL, table


def test_rls_enabled_on_both_tables():
    for table in TABLES:
        assert f"alter table public.{table} enable row level security", table
        assert f"alter table public.{table} enable row level security" in SQL, table


def test_content_is_one_to_one_with_materials():
    # material_content.material_id مفتاح أساسي يشير إلى materials (1:1)
    assert re.search(
        r"material_id\s+uuid\s+primary key\s+references public\.materials",
        SQL,
    )


def test_topics_reference_material_and_are_ordered():
    assert re.search(
        r"material_id uuid not null references public\.materials", SQL
    )
    assert "topic_order" in SQL
    assert "unique (material_id, topic_order)" in SQL


def test_public_read_policies_for_both_tables():
    for table in TABLES:
        assert re.search(
            rf'create policy "{table}_public_read" on public\.{table}\s*'
            rf"for select to anon, authenticated\s*using \(true\)",
            SQL,
        ), table


def test_no_write_policies_writes_via_service_role_only():
    # لا سياسات insert/update/delete: الكتابة عبر service_role (يتجاوز RLS)
    assert "for insert" not in SQL
    assert "for update" not in SQL
    assert "for delete" not in SQL
