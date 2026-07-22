# approved_channels.py
# C4: the "approved channels" registry — the channels whose explanations we
# trust and surface first for each subject.
#
# PR 2: Supabase is the primary store (table `approved_channels`, admin-managed).
# The seed list below stays as the offline/degraded fallback and as the source
# the migration seeds the table from. `approved_channels_for(subject)` remains
# the single accessor the recommender uses — its body reads the DB first, then
# falls back to the seed, so nothing downstream changed.

from supabase_client import get_client

# subject / name / handle / nationality / priority / enabled — mirrors the table.
SEED_CHANNELS = [
    # الرياضيات
    {"subject": "math", "name": "منال التويجري رياضيات", "handle": "@منالالتويجريرياضيات", "channel_id": None, "nationality": "sa", "priority": 100, "enabled": True},
    {"subject": "math", "name": "أكاديمية سعيد الشلوي", "handle": "@saeedacademy50", "channel_id": None, "nationality": "sa", "priority": 90, "enabled": True},
    {"subject": "math", "name": "عين iEN", "handle": "@Ien4edu", "channel_id": None, "nationality": "sa", "priority": 80, "enabled": True},
    {"subject": "math", "name": "أحمد الفديد", "handle": "@alfded11", "channel_id": None, "nationality": "sa", "priority": 70, "enabled": True},
    # المهارات الرقمية
    {"subject": "dig", "name": "مهارات رقمية", "handle": "@Digital_Skills", "channel_id": None, "nationality": "sa", "priority": 100, "enabled": True},
    {"subject": "dig", "name": "عين دروس", "handle": "@iendroos", "channel_id": None, "nationality": "sa", "priority": 90, "enabled": True},
]

# Backwards-compatible alias (some earlier code/tests referenced APPROVED_CHANNELS).
APPROVED_CHANNELS = SEED_CHANNELS


def _row_to_channel(row):
    """Map a Supabase approved_channels row to the dict shape the recommender uses."""
    return {
        "subject": row.get("subject"),
        "name": row.get("channel_name"),
        "handle": row.get("channel_handle"),
        "channel_id": row.get("channel_id"),
        "nationality": row.get("nationality", "sa"),
        "priority": row.get("priority", 0),
        "enabled": row.get("enabled", True),
    }


def _from_seed(subject, enabled_only):
    rows = [c for c in SEED_CHANNELS if c["subject"] == subject]
    if enabled_only:
        rows = [c for c in rows if c.get("enabled", True)]
    return sorted(rows, key=lambda c: c.get("priority", 0), reverse=True)


def approved_channels_for(subject, enabled_only=True, client=None):
    """Approved channels for a subject id (e.g. 'math'), highest priority first.

    Reads Supabase first; on any failure or when Supabase is not configured,
    falls back to the in-code seed so the engine keeps working offline.
    """
    client = client if client is not None else get_client()
    if client is not None:
        try:
            query = client.table("approved_channels").select("*").eq("subject", subject)
            if enabled_only:
                query = query.eq("enabled", True)
            rows = query.execute().data or []
            if rows:
                channels = [_row_to_channel(r) for r in rows]
                return sorted(channels, key=lambda c: c.get("priority", 0), reverse=True)
        except Exception as e:
            print(f"⚠️  approved_channels Supabase read failed ({e}); using seed.")
    return _from_seed(subject, enabled_only)


def approved_handles_for(subject, enabled_only=True, client=None):
    """Just the handles, priority-ordered."""
    return [c["handle"] for c in approved_channels_for(subject, enabled_only, client)]
