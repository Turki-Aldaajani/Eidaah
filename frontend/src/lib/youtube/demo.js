// Single-lesson mockup/use-case: exercises buildSearchQuery + searchYouTubeVideos
// (cache + fetch) together and logs everything to the console for manual
// verification. Exported only - importing this module has no side effects;
// call runYouTubeSearchDemo() explicitly (e.g. temporarily from index.js or the
// browser devtools console) to actually trigger it.

import { buildSearchQuery } from "./queryBuilder";
import { searchYouTubeVideos } from "./youtubeApi";

export async function runYouTubeSearchDemo() {
  const lesson = "المصفوفات";
  const subject = "رياضيات";
  const stage = "أول ثانوي";

  const query = buildSearchQuery(lesson, subject, stage);
  console.log("[YouTube demo] query:", query);

  const filters = {
    content_recency: "last_year",
    tutor_nationality: "sa",
    duration: "medium",
    safe_search: "strict",
    content_type: "video",
  };
  console.log("[YouTube demo] filters:", filters);

  try {
    const results = await searchYouTubeVideos(query, filters, { relevanceKeywords: [lesson, subject] });
    console.log(`[YouTube demo] ${results.length} result(s):`);
    results.forEach((item, i) => {
      const title = item.snippet?.title;
      const videoId = item.id?.videoId;
      console.log(`${i + 1}. ${title} — https://www.youtube.com/watch?v=${videoId}`);
    });
    return results;
  } catch (err) {
    console.error("[YouTube demo] failed:", err.message);
    throw err;
  }
}
