# supabase_client.py
# C4 (PR 2): one lazy, shared Supabase client for the video subsystem
# (approved_channels + video_cache). Mirrors the lazy create_client pattern in
# curriculum_ingest.py, but centralized so both modules degrade the same way.
#
# Returns None (never raises) when Supabase is not configured — the .env.example
# placeholders count as "not configured" — so the whole feature keeps working
# in-memory/offline and in tests without a live database.

import os

_client = None
_resolved = False

# Substrings that mark the .env.example placeholders as "not a real config".
_PLACEHOLDERS = ("your-project", "your_supabase", "your-project-ref")


def _looks_configured(url, key):
    if not url or not key:
        return False
    return not any(p in url or p in key for p in _PLACEHOLDERS)


def get_client():
    """Return a cached Supabase client, or None if it isn't configured/available."""
    global _client, _resolved
    if _resolved:
        return _client
    _resolved = True

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not _looks_configured(url, key):
        return None
    try:
        from supabase import create_client
        _client = create_client(url, key)
    except Exception as e:  # missing package, bad URL, etc.
        print(f"⚠️  Supabase client unavailable ({e}); video subsystem stays in-memory.")
        _client = None
    return _client


def reset_client():
    """Test hook: forget the cached client so env/monkeypatch changes take effect."""
    global _client, _resolved
    _client, _resolved = None, False
