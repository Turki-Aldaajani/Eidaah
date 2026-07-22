import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from fake_supabase import FakeSupabase
from approved_channels import approved_channels_for, approved_handles_for, SEED_CHANNELS


def test_reads_from_supabase_when_available_priority_ordered():
    db = FakeSupabase(seed={"approved_channels": [
        {"subject": "math", "channel_name": "قناة أ", "channel_handle": "@a",
         "channel_id": "ca", "nationality": "sa", "priority": 50, "enabled": True},
        {"subject": "math", "channel_name": "قناة ب", "channel_handle": "@b",
         "channel_id": "cb", "nationality": "eg", "priority": 90, "enabled": True},
        {"subject": "dig", "channel_name": "أخرى", "channel_handle": "@z",
         "channel_id": "cz", "nationality": "sa", "priority": 10, "enabled": True},
    ]})
    got = approved_channels_for("math", client=db)
    assert [c["handle"] for c in got] == ["@b", "@a"]     # priority desc
    assert got[0]["name"] == "قناة ب" and got[0]["channel_id"] == "cb"
    assert got[0]["nationality"] == "eg"


def test_enabled_only_filters_disabled_channels():
    db = FakeSupabase(seed={"approved_channels": [
        {"subject": "math", "channel_name": "مفعّلة", "channel_handle": "@on",
         "priority": 10, "enabled": True},
        {"subject": "math", "channel_name": "معطّلة", "channel_handle": "@off",
         "priority": 99, "enabled": False},
    ]})
    got = approved_channels_for("math", client=db)
    assert [c["handle"] for c in got] == ["@on"]


def test_falls_back_to_seed_when_no_client():
    got = approved_channels_for("math", client=None)
    # matches the in-code seed (Supabase unavailable path uses it directly)
    seed_math = sorted([c for c in SEED_CHANNELS if c["subject"] == "math"],
                       key=lambda c: c["priority"], reverse=True)
    assert [c["handle"] for c in got] == [c["handle"] for c in seed_math]
    assert got[0]["handle"] == "@منالالتويجريرياضيات"


def test_falls_back_to_seed_when_table_empty():
    db = FakeSupabase(seed={"approved_channels": []})
    got = approved_channels_for("dig", client=db)
    assert [c["handle"] for c in got] == ["@Digital_Skills", "@iendroos"]


def test_approved_handles_for_returns_ordered_handles():
    db = FakeSupabase(seed={"approved_channels": [
        {"subject": "math", "channel_name": "x", "channel_handle": "@x", "priority": 1, "enabled": True},
        {"subject": "math", "channel_name": "y", "channel_handle": "@y", "priority": 2, "enabled": True},
    ]})
    assert approved_handles_for("math", client=db) == ["@y", "@x"]
