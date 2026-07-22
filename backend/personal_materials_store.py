# personal_materials_store.py
# S1 (#43) — Personal materials + progress, persisted in Supabase.
#
# Reuses I3's pure analysis step (material_ingest.process_material) and its
# write path (upsert_material_content — service_role, bypasses RLS) UNCHANGED.
# Does NOT reuse find_or_create_material / fetch_material_content: those are
# built for public library materials —
#   * find_or_create_material matches existing rows by (title, university)
#     only, with no owner_id filter. Reusing it for personal uploads would let
#     two different students collide onto the same material_id whenever their
#     titles happen to match.
#   * fetch_material_content has no owner filter either, and until the S1
#     privacy migration existed, material_content/material_topics were
#     readable by anyone regardless of scope.
# So personal materials always INSERT a new materials row (never title-matched
# across owners) and every read filters by owner_id in the query itself —
# defense in depth on top of the owner/scope-aware RLS added in
#   supabase/migrations/20260722000001_s1_material_content_privacy.sql
# A non-owner (or unknown id) gets None from every read/update here — a
# personal material must never leak to anyone but its owner.
#
# `progress` is S1's own table (not I3's) — plain Supabase reads/writes, no AI
# involved.

import time

from material_ingest import process_material, upsert_material_content
from material_service import build_material_view
from metadata_generator import generate_material_metadata
from supabase_client import get_service_client

SCOPE_PERSONAL = "personal"


# ---------------------------------------------------------
# Materials — create, process (background), read
# ---------------------------------------------------------
def create_personal_material(owner_id: str, title: str) -> dict:
    """Insert a new personal materials row. Always a fresh row — unlike I3's
    find_or_create_material, never matched/reused across owners by title."""
    client = get_service_client()
    inserted = client.table("materials").insert({
        "title": title,
        "owner_id": owner_id,
        "scope": SCOPE_PERSONAL,
        "processing_status": "processing",
    }).execute()
    return inserted.data[0]


def run_personal_pipeline(material_id: str, slides: list, filename: str, call_groq_fn, language: str = "ar"):
    """
    Background (blocking — run via executor, like I3's own endpoint): analyze
    via I3's exact pipeline, generate title/description (A4 — process_material
    has no equivalent, it only returns summary+topics), then persist.

    Runs with no HTTP caller listening (the upload response already went out),
    so nothing else can report a failure here. Without the try/except, any
    crash (a transient Supabase error, a malformed topic dict, ...) left the
    row stuck at processing_status='processing' forever with no error visible
    anywhere except a server log line — reproduced live. On any exception the
    material is now marked 'failed', same as the "no extractable text" case.
    """
    client = get_service_client()
    try:
        result = process_material(slides, call_groq_fn, language)
        if result is None:
            client.table("materials").update({"processing_status": "failed"}).eq("id", material_id).execute()
            return

        all_text = "\n\n".join(s["text"] for s in slides)
        meta = generate_material_metadata(all_text, filename, call_groq_fn)

        upsert_material_content(client, material_id, result)  # marks processing_status='processed'
        client.table("materials").update({
            "title": meta["title"],
            "description": meta["description"],
        }).eq("id", material_id).execute()
    except Exception as e:
        print(f"❌ [{material_id}] Personal material pipeline crashed: {e}")
        import traceback
        traceback.print_exc()
        try:
            client.table("materials").update({"processing_status": "failed"}).eq("id", material_id).execute()
        except Exception as mark_failed_error:
            print(f"❌ [{material_id}] Also failed to mark the material as failed: {mark_failed_error}")


def get_personal_material(material_id: str, owner_id: str):
    """Owner-scoped read. Returns None for non-owners/unknown ids — never
    another student's material. Reuses material_service.build_material_view
    for the assembly logic (I3's pure, storage-agnostic part)."""
    client = get_service_client()
    rows = (
        client.table("materials")
        .select("id, title, description, processing_status, created_at")
        .eq("id", material_id).eq("owner_id", owner_id).eq("scope", SCOPE_PERSONAL)
        .limit(1).execute()
    ).data or []
    if not rows:
        return None

    content = (
        client.table("material_content")
        .select("summary, language, slide_count")
        .eq("material_id", material_id).limit(1).execute()
    ).data or []
    topics = (
        client.table("material_topics")
        .select("topic_order, label, explanation, example")
        .eq("material_id", material_id).order("topic_order").execute()
    ).data or []

    view = build_material_view(rows[0], content[0] if content else None, topics)
    view["created_at"] = rows[0]["created_at"]
    return view


def list_personal_materials(owner_id: str) -> list:
    """All personal materials owned by owner_id, newest first."""
    client = get_service_client()
    rows = (
        client.table("materials")
        .select("id, title, description, processing_status, created_at")
        .eq("owner_id", owner_id).eq("scope", SCOPE_PERSONAL)
        .order("created_at", desc=True).execute()
    ).data or []
    return rows


# ---------------------------------------------------------
# Progress — owner-scoped reads/writes on S1's own `progress` table
# ---------------------------------------------------------
def _owns_material(client, material_id: str, owner_id: str) -> bool:
    rows = (
        client.table("materials").select("id")
        .eq("id", material_id).eq("owner_id", owner_id).eq("scope", SCOPE_PERSONAL)
        .limit(1).execute()
    ).data or []
    return bool(rows)


def _material_slide_count(client, material_id: str) -> int:
    rows = (
        client.table("material_content").select("slide_count")
        .eq("material_id", material_id).limit(1).execute()
    ).data or []
    return rows[0]["slide_count"] if rows else 0


def get_progress(material_id: str, owner_id: str):
    """Returns the owner's progress row, or an empty default if none recorded
    yet. None if the material isn't owned by owner_id (never another
    student's progress)."""
    client = get_service_client()
    if not _owns_material(client, material_id, owner_id):
        return None
    rows = (
        client.table("progress").select("*")
        .eq("material_id", material_id).eq("user_id", owner_id)
        .limit(1).execute()
    ).data or []
    if rows:
        return rows[0]
    return {
        "completed_slides": [], "total_slides": _material_slide_count(client, material_id),
        "avg_review_score": 0.0, "last_activity": None,
    }


def update_progress(material_id: str, owner_id: str, completed_slides=None, avg_review_score=None):
    """Upsert the owner's progress. None if the material isn't owned by
    owner_id — a non-owner can never touch someone else's progress.
    completed_slides is deduplicated/sorted; avg_review_score clamped to
    [0, 1]. total_slides is refreshed from the material's own slide_count."""
    client = get_service_client()
    if not _owns_material(client, material_id, owner_id):
        return None

    total_slides = _material_slide_count(client, material_id)
    payload = {
        "user_id": owner_id, "material_id": material_id,
        "total_slides": total_slides,
        "last_activity": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if completed_slides is not None:
        valid = range(1, total_slides + 1)
        payload["completed_slides"] = sorted({int(n) for n in completed_slides if int(n) in valid})
    if avg_review_score is not None:
        payload["avg_review_score"] = max(0.0, min(1.0, float(avg_review_score)))

    client.table("progress").upsert([payload], on_conflict="user_id,material_id").execute()
    rows = (
        client.table("progress").select("*")
        .eq("material_id", material_id).eq("user_id", owner_id).limit(1).execute()
    ).data or []
    return rows[0] if rows else payload
