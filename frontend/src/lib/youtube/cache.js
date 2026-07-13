// Generic localStorage TTL cache. Not YouTube-specific — any feature that wants
// "cache this value for N ms, keyed by some input" can reuse these primitives.

export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Deterministic JSON stringification: object keys are sorted recursively so that
// e.g. {a:1,b:2} and {b:2,a:1} produce the identical string, and therefore the
// identical cache key regardless of how a caller happened to build the object.
export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

export function buildCacheKey(namespace, query, filters) {
  return `${namespace}:${query}::${stableStringify(filters || {})}`;
}

// Returns the cached data, or null if missing/expired/unreadable.
export function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (!entry || typeof entry.timestamp !== "number" || typeof entry.ttl !== "number") {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore - best-effort cleanup only
      }
      return null;
    }

    return entry.data;
  } catch {
    // Storage disabled (e.g. private browsing) or corrupted entry: treat as a miss.
    return null;
  }
}

export function writeCache(key, data, ttl = DEFAULT_TTL_MS) {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), ttl, data }));
  } catch {
    // Quota exceeded / storage disabled: degrade to "no cache" rather than throwing.
  }
}
