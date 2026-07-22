# approved_channels.py
# C4: the "approved channels" registry — the channels whose explanations we
# trust and surface first for each subject.
#
# For this first slice it is a seed list in code. It is intentionally shaped
# exactly like the future `approved_channels` Supabase table (subject / name /
# handle / priority / enabled) so phase 2 can swap this module for a DB read
# WITHOUT touching the recommender: keep `approved_channels_for(subject)` as the
# single accessor and only its body changes.

APPROVED_CHANNELS = [
    # الرياضيات
    {"subject": "math", "name": "منال التويجري رياضيات", "handle": "@منالالتويجريرياضيات", "priority": 100, "enabled": True},
    {"subject": "math", "name": "أكاديمية سعيد الشلوي", "handle": "@saeedacademy50", "priority": 90, "enabled": True},
    {"subject": "math", "name": "عين iEN", "handle": "@Ien4edu", "priority": 80, "enabled": True},
    {"subject": "math", "name": "أحمد الفديد", "handle": "@alfded11", "priority": 70, "enabled": True},
    # المهارات الرقمية
    {"subject": "dig", "name": "مهارات رقمية", "handle": "@Digital_Skills", "priority": 100, "enabled": True},
    {"subject": "dig", "name": "عين دروس", "handle": "@iendroos", "priority": 90, "enabled": True},
]


def approved_channels_for(subject, enabled_only=True):
    """Approved channels for a subject id (e.g. 'math'), highest priority first.

    This is the ONLY accessor the recommender uses — phase 2 replaces its body
    with a Supabase query and nothing downstream changes.
    """
    rows = [c for c in APPROVED_CHANNELS if c["subject"] == subject]
    if enabled_only:
        rows = [c for c in rows if c.get("enabled", True)]
    return sorted(rows, key=lambda c: c.get("priority", 0), reverse=True)


def approved_handles_for(subject, enabled_only=True):
    """Just the handles, priority-ordered."""
    return [c["handle"] for c in approved_channels_for(subject, enabled_only)]
