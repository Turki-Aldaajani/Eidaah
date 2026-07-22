# اختبار مهمة S1 (#43): امتداد السكيما للمواد الشخصية وتتبّع التقدم
# يتحقق من ملف الهجرة: عمودا owner_id/scope في materials، جدول progress،
# وسياسات RLS التي تضمن أن المادة الشخصية لا تظهر لغير صاحبها.
import os
import re

MIGRATION_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "supabase", "migrations",
    "20260722000000_s1_personal_materials_progress.sql",
)

with open(MIGRATION_PATH, encoding="utf-8") as f:
    SQL = f.read().lower()


def test_migration_file_exists_and_not_empty():
    assert len(SQL) > 0


def test_materials_gets_owner_id_column():
    assert re.search(
        r"alter table public\.materials\s*"
        r"add column if not exists owner_id uuid references auth\.users",
        SQL,
    )


def test_materials_gets_scope_column_with_check():
    assert re.search(
        r"add column if not exists scope text not null default 'library'\s*"
        r"check \(scope in \('library',\s*'personal'\)\)",
        SQL,
    )


def test_progress_table_created_with_required_columns():
    body = re.search(
        r"create table if not exists public\.progress\s*\((.*?)\);", SQL, re.S
    )
    assert body, "progress table not found"
    for column in [
        "user_id", "material_id", "completed_slides",
        "avg_review_score", "last_activity",
    ]:
        assert column in body.group(1), column


def test_progress_one_row_per_user_material():
    body = re.search(
        r"create table if not exists public\.progress\s*\((.*?)\);", SQL, re.S
    )
    assert body
    assert re.search(r"unique \(user_id,\s*material_id\)", body.group(1))


def test_progress_rls_enabled_and_scoped_to_owner():
    assert "alter table public.progress enable row level security" in SQL
    for policy in ["progress_select_own", "progress_insert_own", "progress_update_own"]:
        assert f'create policy "{policy}"' in SQL, policy
    # التقدم مقيد بصاحبه عبر auth.uid()
    assert re.search(r"user_id = auth\.uid\(\)", SQL)


def test_personal_materials_hidden_from_non_owners():
    # القراءة العامة صارت مقصورة على مواد المكتبة فقط
    assert re.search(
        r'create policy "materials_public_read" on public\.materials\s*'
        r"for select to anon, authenticated\s*using \(scope = 'library'\)",
        SQL,
    )
    # والمادة الشخصية يراها صاحبها فقط
    assert re.search(
        r'create policy "materials_select_own_personal" on public\.materials\s*'
        r"for select to authenticated\s*"
        r"using \(scope = 'personal' and owner_id = auth\.uid\(\)\)",
        SQL,
    )


def test_personal_material_insert_needs_no_admin_approval():
    # الطالب يرفع مادته الشخصية مباشرة لنفسه (لا جدول طلبات، لا موافقة)
    assert re.search(
        r'create policy "materials_insert_own_personal" on public\.materials\s*'
        r"for insert to authenticated\s*"
        r"with check \(scope = 'personal' and owner_id = auth\.uid\(\)\)",
        SQL,
    )
