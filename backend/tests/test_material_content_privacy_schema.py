# اختبار: هجرة خصوصية محتوى المواد الشخصية فوق جداول I3 (Closes #43)
# يتحقق أن سياسات القراءة على material_content/material_topics صارت واعية
# بـ scope/owner_id (بدل "using (true)" العامة في I3) — المادة الشخصية لا
# يقرأ ملخصها/مواضيعها إلا صاحبها؛ مواد المكتبة تبقى عامة كما هي.
import os
import re

MIGRATION_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "supabase", "migrations",
    "20260722000001_s1_material_content_privacy.sql",
)

with open(MIGRATION_PATH, encoding="utf-8") as f:
    SQL = f.read().lower()


def test_migration_file_exists_and_not_empty():
    assert len(SQL) > 0


def test_library_materials_stay_publicly_readable():
    assert "m.scope = 'library'" in SQL


def test_personal_material_content_restricted_to_owner():
    assert re.search(r"m\.scope = 'personal'\s*and m\.owner_id = auth\.uid\(\)", SQL)


def test_both_content_tables_get_scope_aware_policy():
    for table in ["material_content", "material_topics"]:
        policy = re.search(
            rf'create policy "{table}_public_read" on public\.{table}\s*'
            rf"for select to anon, authenticated\s*using \(",
            SQL,
        )
        assert policy, table
        # كل سياسة تتحقق عبر join مع materials على نفس material_id
        section = SQL[policy.end():policy.end() + 400]
        assert f"m.id = {table}.material_id" in section, table
