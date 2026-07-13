// Real YouTube Data API v3 integration: a pure network-call function
// (fetchYouTubeResults) plus a cache-aware orchestrator (searchYouTubeVideos)
// that wraps it with the localStorage TTL cache from ./cache.js.

import { DEFAULT_TTL_MS, buildCacheKey, readCache, writeCache } from "./cache";

const YOUTUBE_SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
const CACHE_NAMESPACE = "eidaah:yt-search:v1";

// YouTube has no native "channel nationality" filter and no signal that
// verifies a video is a genuine curriculum-aligned explanation, so nationality
// only sets a regionCode + relevanceLanguage hint. Codes reused from the app's
// existing mock nationality set (see data/curriculum.js NAT_NAMES) to stay
// consistent if/when this module gets wired into the existing UI. We
// deliberately do NOT inject a nationality keyword into the search text
// (e.g. "سعودي") — that was pulling in unrelated videos rather than verifying
// their content, since matching a word in a title/description proves nothing
// about whether a video is a real lesson explanation.
const NATIONALITY_TO_REGION = { sa: "SA", eg: "EG", jo: "JO", kw: "KW" };

const RECENCY_TO_DAYS = { last_week: 7, last_month: 30, last_6_months: 182, last_year: 365 };

// Terms that reliably signal non-educational filler (songs, challenges,
// trending-bait, vlogs, pranks) — excluded directly in the YouTube query via
// its native "-term" exclusion syntax, and re-checked client-side as a
// second layer in filterRelevantResults.
const NOISE_EXCLUDE_TERMS = ["اغنية", "أغنية", "تحدي", "ترند", "فلوق", "مقلب"];

export function defaultYouTubeFilters() {
  return {
    content_recency: "any", // any | last_week | last_month | last_6_months | last_year
    tutor_nationality: "any", // any | sa | eg | jo | kw
    duration: "any", // any | short | medium | long
    safe_search: "strict", // strict | moderate | none
    content_type: "video", // video (fixed; kept for uniform filter handling)
  };
}

// Reads the API key at call time (not module load time) so tests/tools that
// stub process.env before calling still work.
// SECURITY: this key ships inside the public frontend bundle (standard CRA
// limitation — REACT_APP_* vars are not secret). Restrict it in Google Cloud
// Console under "Application restrictions" -> "HTTP referrers" to this app's
// domain(s); never rely on the key itself being hidden.
function getApiKey() {
  const key = process.env.REACT_APP_YOUTUBE_API_KEY;
  if (!key) {
    throw new Error(
      "REACT_APP_YOUTUBE_API_KEY is missing. Add it to frontend/.env.local (see .env.example) " +
        "and restart the dev server. Never commit real keys."
    );
  }
  return key;
}

// Pure network call: builds the request from `query` + `filters` and returns
// the raw YouTube API result items. Never touches localStorage - caching is
// handled by searchYouTubeVideos below.
export async function fetchYouTubeResults(query, filters = {}) {
  const apiKey = getApiKey();
  const f = { ...defaultYouTubeFilters(), ...filters };
  let apiQuery = String(query || "").trim();

  const params = new URLSearchParams({
    part: "snippet",
    type: f.content_type || "video",
    maxResults: "12",
    safeSearch: f.safe_search || "strict",
    key: apiKey,
  });

  if (f.duration && f.duration !== "any") {
    params.set("videoDuration", f.duration);
  }

  if (f.content_recency && f.content_recency !== "any") {
    const days = RECENCY_TO_DAYS[f.content_recency];
    if (days) {
      params.set("order", "date");
      params.set("publishedAfter", new Date(Date.now() - days * 86400000).toISOString());
    }
  }

  if (f.tutor_nationality && f.tutor_nationality !== "any") {
    const region = NATIONALITY_TO_REGION[f.tutor_nationality];
    if (region) params.set("regionCode", region);
    params.set("relevanceLanguage", "ar");
  }

  const exclusions = NOISE_EXCLUDE_TERMS.map((term) => `-${term}`).join(" ");
  apiQuery = `${apiQuery} ${exclusions}`.trim();
  params.set("q", apiQuery);

  const response = await fetch(`${YOUTUBE_SEARCH_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`YouTube API request failed (${response.status} ${response.statusText}): ${body}`);
  }

  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

// Drops results that are almost certainly not real lesson explanations:
// title contains a known noise term, or — when relevanceKeywords are
// supplied — the title doesn't mention any of them. This is a cheap,
// client-side precision filter; it cannot verify curriculum accuracy, only
// reject obvious mismatches (e.g. a same-language video that never mentions
// the lesson or subject at all).
export function filterRelevantResults(items, relevanceKeywords = []) {
  const keywords = relevanceKeywords.map((k) => String(k || "").trim()).filter(Boolean);

  return items.filter((item) => {
    const title = item?.snippet?.title || "";
    if (NOISE_EXCLUDE_TERMS.some((term) => title.includes(term))) return false;
    if (keywords.length === 0) return true;
    return keywords.some((k) => title.includes(k));
  });
}

// Private: "PT14M32S" / "PT1H2M3S" / "PT45S" -> total seconds.
function parseIso8601DurationToSeconds(iso) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || ""));
  if (!match) return 0;
  return (Number(match[1]) || 0) * 3600 + (Number(match[2]) || 0) * 60 + (Number(match[3]) || 0);
}

// search.list (fetchYouTubeResults) never returns duration or view count -
// this is a separate, batched call (one request for all ids) to get them.
// Ids YouTube doesn't return (e.g. deleted/private videos) are simply absent
// from the returned Map rather than treated as an error.
export async function fetchVideoDetails(videoIds = []) {
  const ids = videoIds.filter(Boolean);
  if (ids.length === 0) return new Map();

  const apiKey = getApiKey();
  const params = new URLSearchParams({
    part: "contentDetails,statistics",
    id: ids.join(","),
    key: apiKey,
  });

  const response = await fetch(`${YOUTUBE_VIDEOS_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`YouTube API request failed (${response.status} ${response.statusText}): ${body}`);
  }

  const data = await response.json();
  const details = new Map();
  (Array.isArray(data.items) ? data.items : []).forEach((item) => {
    details.set(item.id, {
      durationSeconds: parseIso8601DurationToSeconds(item.contentDetails?.duration),
      viewCount: Number(item.statistics?.viewCount) || 0,
    });
  });
  return details;
}

// Cache-aware orchestrator: checks localStorage for an unexpired entry for the
// exact query+filters+relevanceKeywords combination before spending API
// quota, otherwise fetches fresh results, applies filterRelevantResults, and
// stores the filtered set with a timestamp.
export async function searchYouTubeVideos(query, filters = {}, options = {}) {
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
  const relevanceKeywords = options.relevanceKeywords || [];
  const key = buildCacheKey(CACHE_NAMESPACE, query, { filters, relevanceKeywords });

  const cached = readCache(key);
  if (cached) return cached;

  const rawResults = await fetchYouTubeResults(query, filters);
  const results = filterRelevantResults(rawResults, relevanceKeywords);
  writeCache(key, results, ttl);
  return results;
}
