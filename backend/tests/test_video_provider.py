import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from video_provider import (
    iso8601_duration_to_seconds, normalize_video,
    StaticVideoProvider, YouTubeProvider, build_provider,
)


# ---- ISO-8601 duration ----------------------------------------------------
def test_iso8601_duration_parsing():
    assert iso8601_duration_to_seconds("PT4M13S") == 253
    assert iso8601_duration_to_seconds("PT59S") == 59
    assert iso8601_duration_to_seconds("PT1H2M3S") == 3723
    assert iso8601_duration_to_seconds("P1DT2H") == 93600
    assert iso8601_duration_to_seconds("") == 0
    assert iso8601_duration_to_seconds("garbage") == 0


def test_normalize_video_fills_defaults_and_url():
    v = normalize_video(video_id="abc", title="t")
    assert v["url"] == "https://www.youtube.com/watch?v=abc"
    assert v["live_broadcast_content"] == "none"
    assert v["status"] == "public"
    assert v["is_public"] is True
    assert v["view_count"] == 0


# ---- StaticVideoProvider --------------------------------------------------
def test_static_provider_filters_by_channel_and_records_calls():
    p = StaticVideoProvider(
        videos=[
            {"video_id": "a", "channel_id": "c1"},
            {"video_id": "b", "channel_id": "c2"},
        ],
        handle_to_channel={"@x": "c1"},
    )
    assert p.resolve_channel_id("@x") == "c1"
    assert p.resolve_channel_id("@nope") is None
    got = p.search("q", channel_id="c1")
    assert [v["video_id"] for v in got] == ["a"]
    assert p.calls == [("q", "c1")]


# ---- YouTubeProvider (live adapter, exercised offline via a fake client) ---
class _FakeResp:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        pass

    def json(self):
        return self._data


class _FakeHTTP:
    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def get(self, url, params):
        self.calls.append((url, params))
        for key, payload in self.routes.items():
            if url.endswith("/" + key):
                return _FakeResp(payload)
        return _FakeResp({})


def test_youtube_provider_search_maps_search_plus_videos():
    http = _FakeHTTP({
        "search": {"items": [{"id": {"videoId": "vid1"}}]},
        "videos": {"items": [{
            "id": "vid1",
            "snippet": {"title": "شرح", "description": "d", "channelId": "chn",
                        "channelTitle": "قناة", "publishedAt": "2026-01-01T00:00:00Z",
                        "liveBroadcastContent": "none",
                        "thumbnails": {"high": {"url": "http://t/high.jpg"}}},
            "contentDetails": {"duration": "PT5M"},
            "statistics": {"viewCount": "1234"},
            "status": {"privacyStatus": "public"},
        }]},
    })
    prov = YouTubeProvider("key", http=http)
    out = prov.search("الأعداد النسبية", channel_id="chn")
    assert len(out) == 1
    v = out[0]
    assert v["video_id"] == "vid1"
    assert v["duration_seconds"] == 300
    assert v["view_count"] == 1234
    assert v["channel_id"] == "chn"
    assert v["thumbnail_url"] == "http://t/high.jpg"
    # channelId param was forwarded to the search call
    search_params = next(p for (u, p) in http.calls if u.endswith("/search"))
    assert search_params["channelId"] == "chn"


def test_youtube_provider_resolve_channel_id_is_cached():
    http = _FakeHTTP({"channels": {"items": [{"id": "resolved"}]}})
    prov = YouTubeProvider("key", http=http)
    assert prov.resolve_channel_id("@handle") == "resolved"
    assert prov.resolve_channel_id("@handle") == "resolved"
    # only one network call despite two lookups
    assert sum(1 for (u, _) in http.calls if u.endswith("/channels")) == 1


def test_build_provider_falls_back_without_key(monkeypatch):
    monkeypatch.delenv("YOUTUBE_API_KEY", raising=False)
    assert isinstance(build_provider(), StaticVideoProvider)
