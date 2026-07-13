// Builds a precise, education-biased search string for the YouTube Data API v3.
// Keeping the "شرح درس" (lesson explanation) prefix fixed steers results away
// from generic/entertainment videos and toward tutoring content.

function clean(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildSearchQuery(lesson, subject, stage) {
  const parts = ["شرح", "درس", clean(lesson), clean(subject), clean(stage)].filter(Boolean);
  return parts.join(" ");
}
