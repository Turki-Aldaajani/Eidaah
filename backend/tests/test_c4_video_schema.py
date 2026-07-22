# C4 · PR 2 — schema tests for approved_channels + video_cache.
# Read-only over the migration SQL (same style as test_curriculum_schema.py):
# public read, service_role writes, non-empty checks, natural keys.
import os
import re

MIGRATION_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "supabase", "migrations",
    "20260722000000_c4_video_schema.sql",
)

with open(MIGRATION_PATH, encoding="utf-8") as f:
    SQL = f.read().lower()

TABLES = ["approved_channels", "video_cache"]


def _table_body(table):
    m = re.search(rf"create table if not exists public\.{table}\s*\((.*?)\);", SQL, re.S)
    assert m, f"{table} table not found"
    return m.group(1)


def test_migration_exists_and_creates_both_tables():
    assert len(SQL) > 0
    for table in TABLES:
        assert f"create table if not exists public.{table}" in SQL, table


def test_approved_channels_has_columns_from_spec():
    body = _table_body("approved_channels")
    for col in ["subject", "channel_name", "channel_handle", "channel_id",
                "nationality", "priority", "enabled"]:
        assert col in body, col


def test_approved_channels_enabled_defaults_true():
    body = _table_body("approved_channels")
    assert re.search(r"enabled\s+boolean\s+not null\s+default\s+true", body)


def test_approved_channels_unique_per_subject_handle():
    body = _table_body("approved_channels")
    assert re.search(r"unique\s*\(subject,\s*channel_handle\)", body)


def test_video_cache_has_columns_from_spec():
    body = _table_body("video_cache")
    for col in ["cache_key", "video_id", "title", "channel_title", "published_at",
                "duration_seconds", "view_count", "approved", "pinned", "payload",
                "expires_at"]:
        assert col in body, col


def test_video_cache_unique_per_key_and_video():
    body = _table_body("video_cache")
    assert re.search(r"unique\s*\(cache_key,\s*video_id\)", body)


def test_names_and_keys_cannot_be_empty():
    assert re.search(r"channel_name\s+text\s+not null\s+check\s*\(length\(btrim\(channel_name\)\)\s*>\s*0\)", SQL)
    assert re.search(r"cache_key\s+text\s+not null\s+check\s*\(length\(btrim\(cache_key\)\)\s*>\s*0\)", SQL)


def test_rls_enabled_on_both_tables():
    for table in TABLES:
        assert f"alter table public.{table} enable row level security" in SQL, table


def test_public_read_policy_on_both_tables():
    for table in TABLES:
        assert re.search(
            rf'create policy "{table}_public_read" on public\.{table}\s*'
            r"for select to anon, authenticated\s*using \(true\)",
            SQL,
        ), table


def test_no_public_write_policies():
    # writes go through service_role (bypasses RLS) — no public insert/update
    assert "for insert" not in SQL
    assert "for update to" not in SQL


def test_seed_channels_inserted_idempotently():
    assert "insert into public.approved_channels" in SQL
    assert "on conflict (subject, channel_handle) do nothing" in SQL
    assert "@saeedacademy50" in SQL and "@digital_skills" in SQL  # lowered
