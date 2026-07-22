# video_provider.py
# C4 · Video Provider abstraction.
#
# The recommender talks ONLY to this interface, so YouTube is just one provider
# behind it. Adding Vimeo / iEN / مدرستي / Khan later means writing another
# provider — the query builder, filters and ranking never change ("Future Ready").
#
# A provider exposes:
#   resolve_channel_id(handle) -> str | None
#   search(query, channel_id=None, max_results=..., published_after=None) -> list[dict]
# where each dict is the normalized video shape below.
#
#   video_id, title, description, channel_id, channel_title, published_at (ISO),
#   duration_seconds (int), view_count (int), live_broadcast_content
#   ("none"/"live"/"upcoming"), status ("public"/"private"/...), is_public (bool),
#   url, thumbnail_url
#
# StaticVideoProvider serves canned data (offline tests + graceful fallback when
# no API key is configured). YouTubeProvider is the live adapter.

import os
import re

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
_HTTP_TIMEOUT = 8.0

_ISO_DUR = re.compile(
    r"P(?:(?P<days>\d+)D)?T?(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?"
)


def iso8601_duration_to_seconds(duration):
    """'PT4M13S' -> 253 ; 'PT59S' -> 59 ; 'P1DT2H' -> 93600. 0 if unparseable."""
    if not duration:
        return 0
    m = _ISO_DUR.fullmatch(duration.strip())
    if not m:
        return 0
    parts = {k: int(v) if v else 0 for k, v in m.groupdict().items()}
    return parts["days"] * 86400 + parts["hours"] * 3600 + parts["minutes"] * 60 + parts["seconds"]


def normalize_video(**kw):
    """Build a normalized video dict, filling sensible defaults."""
    return {
        "video_id": kw.get("video_id"),
        "title": kw.get("title", ""),
        "description": kw.get("description", ""),
        "channel_id": kw.get("channel_id"),
        "channel_title": kw.get("channel_title", ""),
        "published_at": kw.get("published_at"),
        "duration_seconds": int(kw.get("duration_seconds") or 0),
        "view_count": int(kw.get("view_count") or 0),
        "live_broadcast_content": kw.get("live_broadcast_content") or "none",
        "status": kw.get("status") or "public",
        "is_public": kw.get("is_public", True),
        "url": kw.get("url") or (f"https://www.youtube.com/watch?v={kw.get('video_id')}" if kw.get("video_id") else None),
        "thumbnail_url": kw.get("thumbnail_url"),
    }


class StaticVideoProvider:
    """In-memory provider for tests and for graceful fallback without an API key."""

    def __init__(self, videos=None, handle_to_channel=None):
        self.videos = [normalize_video(**v) if "duration_seconds" not in v or "url" not in v else dict(v)
                       for v in (videos or [])]
        self.handle_to_channel = handle_to_channel or {}
        self.calls = []  # records (query, channel_id) for assertions in tests

    def resolve_channel_id(self, handle):
        return self.handle_to_channel.get(handle)

    def search(self, query, channel_id=None, max_results=10, published_after=None):
        self.calls.append((query, channel_id))
        results = self.videos
        if channel_id is not None:
            results = [v for v in results if v.get("channel_id") == channel_id]
        return results[:max_results]


class YouTubeProvider:
    """Live YouTube Data API v3 adapter. Requires an API key + `httpx`."""

    def __init__(self, api_key, http=None, region_code="SA", language="ar"):
        self.api_key = api_key
        self.region_code = region_code
        self.language = language
        self._http = http
        self._channel_cache = {}

    @property
    def http(self):
        if self._http is None:
            import httpx
            self._http = httpx.Client(timeout=_HTTP_TIMEOUT)
        return self._http

    def _get(self, path, params):
        params = {**params, "key": self.api_key}
        r = self.http.get(f"{YOUTUBE_API_BASE}/{path}", params=params)
        r.raise_for_status()
        return r.json()

    def resolve_channel_id(self, handle):
        if handle in self._channel_cache:
            return self._channel_cache[handle]
        cid = None
        try:
            data = self._get("channels", {"part": "id", "forHandle": handle.lstrip("@")})
            items = data.get("items") or []
            if items:
                cid = items[0].get("id")
        except Exception as e:
            print(f"⚠️  channel resolve failed for {handle}: {e}")
        self._channel_cache[handle] = cid
        return cid

    def search(self, query, channel_id=None, max_results=10, published_after=None):
        try:
            params = {
                "part": "snippet",
                "type": "video",
                "q": query,
                "maxResults": min(max_results, 25),
                "order": "relevance",
                "relevanceLanguage": self.language,
                "regionCode": self.region_code,
                "safeSearch": "strict",
            }
            if channel_id:
                params["channelId"] = channel_id
            if published_after:
                params["publishedAfter"] = published_after
            search_data = self._get("search", params)
            ids = [it["id"]["videoId"] for it in search_data.get("items", [])
                   if it.get("id", {}).get("videoId")]
            if not ids:
                return []
            return self._hydrate(ids)
        except Exception as e:
            print(f"⚠️  YouTube search failed for {query!r}: {e}")
            return []

    def _hydrate(self, ids):
        """videos.list to enrich search hits with duration / views / status."""
        data = self._get("videos", {
            "part": "snippet,contentDetails,statistics,status",
            "id": ",".join(ids),
        })
        out = []
        for it in data.get("items", []):
            snip = it.get("snippet", {})
            details = it.get("contentDetails", {})
            stats = it.get("statistics", {})
            status = it.get("status", {})
            thumbs = snip.get("thumbnails", {})
            thumb = (thumbs.get("high") or thumbs.get("medium") or thumbs.get("default") or {}).get("url")
            out.append(normalize_video(
                video_id=it.get("id"),
                title=snip.get("title", ""),
                description=snip.get("description", ""),
                channel_id=snip.get("channelId"),
                channel_title=snip.get("channelTitle", ""),
                published_at=snip.get("publishedAt"),
                duration_seconds=iso8601_duration_to_seconds(details.get("duration")),
                view_count=int(stats.get("viewCount") or 0),
                live_broadcast_content=snip.get("liveBroadcastContent", "none"),
                status=status.get("privacyStatus", "public"),
                is_public=status.get("privacyStatus", "public") == "public",
                thumbnail_url=thumb,
            ))
        return out


def build_provider():
    """Factory: live YouTube provider if a key is configured, else static fallback."""
    key = os.getenv("YOUTUBE_API_KEY")
    if key:
        return YouTubeProvider(key)
    print("ℹ️  YOUTUBE_API_KEY not set — using StaticVideoProvider fallback (empty).")
    return StaticVideoProvider(videos=[])
