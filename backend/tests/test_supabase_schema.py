# اختبار مهمة G1: اكتمال سكيما Supabase وسياسات RLS المتفق عليها
# (القراءة عامة للمواد المعتمدة، والكتابة للمسجلين — docs/HACKATHON_PLAN.md)
import os
import re

MIGRATION_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "supabase", "migrations",
    "20260716000000_g1_init_schema.sql",
)

with open(MIGRATION_PATH, encoding="utf-8") as f:
    SQL = f.read().lower()

TABLES = ["profiles", "materials", "material_requests", "points_ledger"]


def test_migration_file_exists_and_not_empty():
    assert len(SQL) > 0


def test_all_four_tables_are_created():
    for table in TABLES:
        assert f"create table if not exists public.{table}" in SQL, table


def test_rls_enabled_on_all_tables():
    for table in TABLES:
        assert f"alter table public.{table} enable row level security" in SQL, table


def test_profiles_has_onboarding_columns():
    body = re.search(r"create table if not exists public\.profiles\s*\((.*?)\);", SQL, re.S)
    assert body, "profiles table not found"
    for column in ["university", "college", "major", "level"]:
        assert column in body.group(1), column


def test_material_requests_status_governance_values():
    assert re.search(
        r"status\s+text\s+not\s+null\s+default\s+'pending'\s*"
        r"check\s*\(status in \('pending',\s*'approved',\s*'rejected'\)\)",
        SQL,
    )


def test_materials_tracks_processing_status():
    assert re.search(
        r"check\s*\(processing_status in "
        r"\('pending',\s*'processing',\s*'processed',\s*'failed'\)\)",
        SQL,
    )


def test_points_ledger_records_user_points_and_reason():
    body = re.search(r"create table if not exists public\.points_ledger\s*\((.*?)\);", SQL, re.S)
    assert body, "points_ledger table not found"
    for column in ["user_id", "points", "reason"]:
        assert column in body.group(1), column


def test_materials_public_read_policy():
    # القراءة عامة للمواد المعتمدة: تشمل الزوار (anon)
    policy = re.search(
        r'create policy "materials_public_read" on public\.materials\s*'
        r"for select to anon, authenticated\s*using \(true\)",
        SQL,
    )
    assert policy


def test_materials_write_requires_registered_users():
    # الكتابة للمسجلين: insert/update على materials لدور authenticated فقط
    assert re.search(
        r'create policy "materials_authenticated_insert" on public\.materials\s*'
        r"for insert to authenticated",
        SQL,
    )
    assert re.search(
        r'create policy "materials_authenticated_update" on public\.materials\s*'
        r"for update to authenticated",
        SQL,
    )


def test_private_tables_scoped_to_owner():
    # profiles وmaterial_requests وpoints_ledger مقيدة بصاحبها عبر auth.uid()
    for policy in [
        "profiles_select_own",
        "profiles_update_own",
        "material_requests_insert_own",
        "material_requests_select_own",
        "points_ledger_select_own",
        "points_ledger_insert_own",
    ]:
        assert f'create policy "{policy}"' in SQL, policy
    assert "auth.uid()" in SQL


def test_profile_auto_created_on_signup():
    assert "create trigger on_auth_user_created" in SQL
    assert re.search(r"after insert on auth\.users", SQL)
