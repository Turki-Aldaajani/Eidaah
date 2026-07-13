import { buildSearchQuery } from "../lib/youtube/queryBuilder";
import { defaultYouTubeFilters, searchYouTubeVideos, fetchVideoDetails } from "../lib/youtube/youtubeApi";
import { DEFAULT_TTL_MS, buildCacheKey, readCache, writeCache } from "../lib/youtube/cache";

export const STAGES = [
  { id: "p1", n: "الصف الأول الابتدائي", lv: "primary" },
  { id: "p2", n: "الصف الثاني الابتدائي", lv: "primary" },
  { id: "p3", n: "الصف الثالث الابتدائي", lv: "primary" },
  { id: "p4", n: "الصف الرابع الابتدائي", lv: "primary" },
  { id: "p5", n: "الصف الخامس الابتدائي", lv: "primary" },
  { id: "p6", n: "الصف السادس الابتدائي", lv: "primary" },
  { id: "m1", n: "الصف الأول المتوسط", lv: "middle" },
  { id: "m2", n: "الصف الثاني المتوسط", lv: "middle" },
  { id: "m3", n: "الصف الثالث المتوسط", lv: "middle" },
  { id: "h1", n: "الصف الأول الثانوي", lv: "high" },
  { id: "h2", n: "الصف الثاني الثانوي", lv: "high" },
  { id: "h3", n: "الصف الثالث الثانوي", lv: "high" },
];

export const LEVEL_NAMES = { primary: "المرحلة الابتدائية", middle: "المرحلة المتوسطة", high: "المرحلة الثانوية" };

export const SUB_DEFS = {
  math: { n: "رياضيات", icn: "calculator", c: "#155043", d: "أعداد ومعادلات وهندسة بأسلوب مبسط" },
  sci: { n: "علوم", icn: "flask", c: "#3CA45D", d: "اكتشف العالم من حولك بالتجربة" },
  ar: { n: "لغة عربية", icn: "book-open", c: "#B57A0A", d: "نحو وقراءة وتعبير وإملاء" },
  en: { n: "إنجليزي", icn: "globe", c: "#3CA6EB", d: "قواعد ومفردات ومحادثة" },
  phy: { n: "فيزياء", icn: "atom", c: "#125D64", d: "قوانين الحركة والطاقة والكون" },
  chem: { n: "كيمياء", icn: "test-tube", c: "#EB3C87", d: "العناصر والتفاعلات والمحاليل" },
  bio: { n: "أحياء", icn: "dna", c: "#3CA45D", d: "الخلية والوراثة وأجهزة الجسم" },
  cs: { n: "حاسب", icn: "monitor", c: "#125D64", d: "برمجة وخوارزميات وأمن معلومات" },
  dig: { n: "مهارات رقمية", icn: "monitor", c: "#125D64", d: "أساسيات الحاسب والبرمجة الممتعة" },
  soc: { n: "اجتماعيات", icn: "map", c: "#869200", d: "وطني: تاريخه وجغرافيته ورؤيته" },
  isl: { n: "تربية إسلامية", icn: "crescent", c: "#155043", d: "قرآن وفقه وسيرة وأخلاق" },
  lgty: { n: "لغتي", icn: "book-open", c: "#B57A0A", d: "قراءة وكتابة وتعبير وإملاء باللغة العربية" },
  art: { n: "التربية الفنية", icn: "pen", c: "#EB3C87", d: "الرسم والألوان والتعبير الإبداعي" },
  pe: { n: "التربية البدنية", icn: "flame", c: "#3CA45D", d: "اللياقة البدنية والمهارات الحركية والرياضية" },
  digtech: { n: "التقنية الرقمية", icn: "monitor", c: "#125D64", d: "تقنية المعلومات والبرمجة وأمن البيانات" },
  bus: { n: "إدارة الأعمال", icn: "chart", c: "#869200", d: "مبادئ الاقتصاد وريادة الأعمال" },
};

export const LEVEL_SUBJECTS = {
  primary: ["ar", "math", "sci", "en", "dig", "isl"],
  middle: ["math", "sci", "ar", "en", "cs", "soc"],
  high: ["math", "phy", "chem", "bio", "ar", "en", "cs"],
};

export const STAGE_SUBJECTS = {
  p1: ["lgty", "math", "isl", "dig", "art", "pe"],
  p2: ["lgty", "math", "isl", "dig", "art", "pe"],
  p3: ["lgty", "math", "sci", "isl", "dig", "art", "pe"],
  p4: ["lgty", "math", "sci", "en", "isl", "soc", "dig", "art", "pe"],
  p5: ["lgty", "math", "sci", "en", "isl", "soc", "dig", "art", "pe"],
  p6: ["lgty", "math", "sci", "en", "isl", "soc", "dig", "art", "pe"],
  m1: ["ar", "math", "sci", "en", "isl", "soc", "dig"],
  m2: ["ar", "math", "sci", "en", "isl", "soc", "dig"],
  m3: ["ar", "math", "sci", "en", "isl", "soc", "dig"],
  h1: ["ar", "math", "phy", "chem", "bio", "en", "isl", "digtech"],
  h2: ["ar", "math", "phy", "chem", "bio", "en", "isl", "digtech"],
  h3: ["ar", "math", "phy", "chem", "bio", "en", "isl", "digtech", "bus"],
};

export const CHAPTERS = [
  { id: 1, n: "الفصل الدراسي الأول", w: "١٣ أسبوعاً", u: ["التأسيس", "المفاهيم الأساسية"] },
  { id: 2, n: "الفصل الدراسي الثاني", w: "١٣ أسبوعاً", u: ["التوسع", "مهارات التطبيق"] },
];

export const LESSONS = {
  math: ["الأعداد النسبية", "القوى والأسس", "الجذور التربيعية", "نظرية فيثاغورس", "المعادلات الخطية", "النسبة المئوية والتناسب"],
  sci: ["طرائق العلم وتفكيره", "الخلية ووظائف أجزائها", "الوراثة والصفات", "القوى والحركة", "الطاقة وتحولاتها", "النظام البيئي والتوازن"],
  ar: ["أنواع الجملة", "المبتدأ والخبر", "كان وأخواتها", "الهمزة المتوسطة", "النص الشعري: وطني", "مهارة التلخيص"],
  en: ["المضارع البسيط Present Simple", "الماضي البسيط Past Simple", "مفردات: My Daily Routine", "قراءة: At School", "أدوات الاستفهام Wh-Questions", "كتابة بريد إلكتروني بسيط"],
  phy: ["الحركة في خط مستقيم", "قوانين نيوتن للحركة", "الشغل والطاقة", "الزخم والدفع", "الحرارة ودرجة الحرارة", "خصائص الموجات"],
  chem: ["تركيب الذرة", "الجدول الدوري الحديث", "الروابط الكيميائية", "التفاعلات الكيميائية", "المول والحسابات الكيميائية", "المحاليل والذائبية"],
  bio: ["الخلية: وحدة بناء الحياة", "الانقسام الخلوي", "الوراثة المندلية", "DNA وتضاعفه", "البناء الضوئي", "التنفس الخلوي"],
  cs: ["مقدمة في البرمجة", "الخوارزميات والمخططات الانسيابية", "بايثون: المتغيرات والبيانات", "الجمل الشرطية", "الحلقات التكرارية", "أمن المعلومات"],
  dig: ["أساسيات جهاز الحاسب", "الكتابة على لوحة المفاتيح", "الرسام والإبداع الرقمي", "سكراتش: أول برنامج لي", "الإنترنت الآمن", "العروض التقديمية"],
  soc: ["وطني المملكة العربية السعودية", "تاريخ الدولة السعودية", "الخرائط والاتجاهات", "رؤية المملكة 2030", "الموارد الطبيعية في وطني", "السكان والعمران"],
  isl: ["أركان الإسلام", "الطهارة وأحكامها", "الصلاة وأركانها", "السيرة النبوية: الهجرة", "الأخلاق الإسلامية", "أحكام التجويد"],
  lgty: ["القراءة والفهم", "الكتابة السليمة", "الإملاء والتنقيط", "التعبير الشفوي", "النصوص الأدبية القصيرة", "الخط والكتابة"],
  art: ["الألوان الأساسية والثانوية", "الرسم بالخطوط والأشكال", "الزخرفة الإسلامية", "الفن التشكيلي", "مبادئ التصميم", "المجسمات والنماذج"],
  pe: ["اللياقة البدنية والإحماء", "مهارات الكرة الطائرة", "مهارات كرة القدم", "ألعاب القوى", "التعاون الجماعي والروح الرياضية", "التقييم البدني"],
  digtech: ["أمن المعلومات والهوية الرقمية", "شبكات الحاسب والإنترنت", "قواعد البيانات وإدارتها", "برمجة تطبيقات الويب", "الذكاء الاصطناعي وتطبيقاته", "مشاريع رقمية متكاملة"],
  bus: ["مفهوم إدارة الأعمال", "ريادة الأعمال والابتكار", "التسويق ومبادئه", "التمويل والميزانية", "الإدارة الاستراتيجية", "مشروع العمل التجاري"],
};

const LESSON_MIN = [20, 25, 15, 30, 20, 25];
export const DIFFS = [
  { t: "سهل", cls: "d-easy" },
  { t: "متوسط", cls: "d-mid" },
  { t: "متقدم", cls: "d-hard" },
];
const DIFF_PATTERN = [0, 0, 1, 1, 2, 1];

const CHANNELS = [
  { n: "عين دروس", nat: "sa", v: true },
  { n: "أ. خالد الحربي", nat: "sa", v: false },
  { n: "أ. نورة القحطاني", nat: "sa", v: false },
  { n: "أكاديمية التفوق", nat: "kw", v: true },
  { n: "شرح المناهج العربية", nat: "eg", v: false },
  { n: "أ. عبدالله المالكي", nat: "sa", v: false },
  { n: "منصة تفوّق الخليج", nat: "kw", v: false },
  { n: "أ. محمد عادل", nat: "jo", v: false },
];
export const NAT_NAMES = { sa: "سعودي", jo: "أردني", eg: "مصري", kw: "كويتي" };

const VIDS_META = [
  { ty: "شرح مبسط وسريع", ch: 0, durM: 4, views: 1200000, year: 2026, rate: 4.8, match: 0, reason: 2 },
  { ty: "شرح شامل مع أمثلة", ch: 1, durM: 14, views: 856000, year: 2025, rate: 4.7, match: 0, reason: 0 },
  { ty: "حل تمارين الكتاب", ch: 2, durM: 23, views: 430000, year: 2025, rate: 4.5, match: 1, reason: 0 },
  { ty: "مراجعة مركزة قبل الاختبار", ch: 3, durM: 9, views: 2100000, year: 2024, rate: 4.9, match: 0, reason: 1 },
  { ty: "أسئلة متوقعة وتدريب مكثف", ch: 4, durM: 36, views: 98000, year: 2023, rate: 4.2, match: 2, reason: 0 },
  { ty: "تأسيس من الصفر", ch: 5, durM: 47, views: 610000, year: 2026, rate: 4.6, match: 1, reason: 0 },
  { ty: "شرح تفاعلي مختصر", ch: 6, durM: 7, views: 320000, year: 2026, rate: 4.4, match: 1, reason: 2 },
  { ty: "مراجعة شاملة للوحدة", ch: 7, durM: 18, views: 1500000, year: 2024, rate: 4.8, match: 0, reason: 1 },
];
export const MATCHES = [
  { t: "ممتاز", cls: "m-a" },
  { t: "جيد جداً", cls: "m-b" },
  { t: "جيد", cls: "m-c" },
];
const REASONS = ["موصى به بناءً على مطابقة المنهج", "الأكثر مشاهدة بين الطلاب", "شرح في وقت أقل"];
const VID_GRADS = [
  ["#155043", "#0F3E34"], ["#125D64", "#155043"], ["#3CA45D", "#155043"], ["#869200", "#5F6800"],
  ["#3CA6EB", "#125D64"], ["#F3C43C", "#B57A0A"], ["#125D64", "#0F3E34"], ["#EB3C87", "#155043"],
];

export const STEPS = [
  { k: "video", t: "شاهد أحد الشروحات", i: "video" },
  { k: "sum", t: "اقرأ التلخيص الذكي", i: "file-text" },
  { k: "ex", t: "افهم المثال الواقعي", i: "lightbulb" },
  { k: "notes", t: "ذاكر ملاحظات المراجعة", i: "note" },
  { k: "quiz", t: "اختبر نفسك (٥ أسئلة)", i: "target" },
];

export const AIF = [
  { k: "sum", i: "file-text", t: "تلخيص الدرس", d: "ملخص ذكي مركّز لأهم ما في الدرس" },
  { k: "ex", i: "lightbulb", t: "شرح بمثال من الواقع", d: "مثال عملي من حياتك يبسّط الفكرة" },
  { k: "notes", i: "note", t: "ملاحظات للمذاكرة", d: "قوانين وتعريفات ونقاط متوقعة في الاختبار" },
  { k: "quiz", i: "target", t: "اختبر نفسك", d: "٥ أسئلة اختيار من متعدد مع تصحيح فوري" },
];

export function stageById(id) {
  return STAGES.find((s) => s.id === id);
}

export function subjectsForStage(stage) {
  if (!stage) return [];
  return STAGE_SUBJECTS[stage.id] || LEVEL_SUBJECTS[stage.lv] || [];
}

export function lessonsFor(subjectId) {
  const titles = LESSONS[subjectId] || LESSONS.math;
  return titles.map((t, i) => ({ t, min: LESSON_MIN[i % 6], diff: DIFFS[DIFF_PATTERN[i % 6]] }));
}

export function toArabicDigits(n) {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
}

// MOCK-ONLY: fabricates fake seconds from minutes for demo videos (`m * 7`
// has no real meaning). Do not use for real YouTube data — see fmtDuration
// below for the real formatter.
export function fmtDur(m) {
  const mm = Math.floor(m);
  const ss = (m * 7) % 60 | 0;
  return `${toArabicDigits(String(mm).padStart(2, "0"))}:${toArabicDigits(String(ss).padStart(2, "0"))}`;
}

// Real formatter: total seconds -> Arabic-digit "mm:ss" (or "h:mm:ss" past an hour).
export function fmtDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const core =
    h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return toArabicDigits(core);
}

export function fmtViews(v) {
  if (v >= 1e6) return `${toArabicDigits((v / 1e6).toFixed(1)).replace(".", "٫")} مليون`;
  return `${toArabicDigits(Math.round(v / 1e3))} ألف`;
}

export function fmtRate(r) {
  return toArabicDigits(r.toFixed(1)).replace(".", "٫");
}

export function mockVideos(lesson, subjectId) {
  const icn = (SUB_DEFS[subjectId] || SUB_DEFS.math).icn;
  return VIDS_META.map((m, i) => {
    const ch = CHANNELS[m.ch];
    return {
      title: `${lesson.t} | ${m.ty}`,
      ch: ch.n,
      init: ch.n.replace("أ. ", "").charAt(0),
      nat: ch.nat,
      ver: ch.v,
      durM: m.durM,
      dur: fmtDur(m.durM),
      views: m.views,
      viewsT: fmtViews(m.views),
      year: m.year,
      rate: m.rate,
      match: MATCHES[m.match],
      reason: REASONS[m.reason],
      g: VID_GRADS[i % VID_GRADS.length],
      icn,
    };
  });
}

export function defaultFilters() {
  return { rec: "all", dur: "all", views: "all" };
}

export function applyFilters(videos, filters) {
  const f = filters;
  return videos.filter((v) => {
    if (f.rec === "y1" && v.year < 2026) return false;
    if (f.rec === "y2" && v.year < 2025) return false;
    if (f.dur === "lt5" && !(v.durM < 5)) return false;
    if (f.dur === "lt10" && !(v.durM < 10)) return false;
    if (f.dur === "d10_20" && !(v.durM >= 10 && v.durM <= 20)) return false;
    if (f.dur === "d20_40" && !(v.durM > 20 && v.durM <= 40)) return false;
    if (f.dur === "gt40" && !(v.durM > 40)) return false;
    if (f.views === "v5k" && v.views < 5000) return false;
    if (f.views === "v15k" && v.views < 15000) return false;
    if (f.views === "v50k" && v.views < 50000) return false;
    return true;
  });
}

function mapYouTubeItemToVideo(item, details, subjectId) {
  const videoId = item?.id?.videoId;
  const snippet = item?.snippet || {};
  const det = details.get(videoId) || {};
  const durationSeconds = det.durationSeconds || 0;
  const views = det.viewCount || 0;

  return {
    videoId,
    title: snippet.title || "",
    ch: snippet.channelTitle || "",
    init: (snippet.channelTitle || "؟").charAt(0),
    thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null,
    durM: durationSeconds / 60,
    dur: fmtDuration(durationSeconds),
    views,
    viewsT: fmtViews(views),
    year: snippet.publishedAt ? new Date(snippet.publishedAt).getFullYear() : null,
    icn: (SUB_DEFS[subjectId] || SUB_DEFS.math).icn,
    // no match / reason / rate / ver / nat / g — no honest real-data
    // equivalent exists; VideoCard renders these conditionally.
  };
}

const LESSON_VIDEOS_CACHE_NAMESPACE = "eidaah:lesson-videos:v1";

// Real counterpart to mockVideos(): fetches actual YouTube videos for a
// lesson. `filters` is YouTube-API-shaped (see defaultYouTubeFilters()), not
// the UI's defaultFilters() shape - callers pass none for now (no live
// filter-UI wiring yet). Caches its own merged/mapped result (search +
// per-video details), since fetchVideoDetails isn't cached by youtubeApi.js
// itself. Throws on failure (missing/invalid key, quota, network) rather than
// falling back to mock data - callers are expected to show an error state.
export async function fetchLessonVideos(lesson, subjectId, stageId, filters = {}) {
  const subject = SUB_DEFS[subjectId] || SUB_DEFS.math;
  const stage = stageById(stageId);
  const query = buildSearchQuery(lesson.t, subject.n, stage ? stage.n : "");
  const ytFilters = { ...defaultYouTubeFilters(), ...filters };

  const cacheKey = buildCacheKey(LESSON_VIDEOS_CACHE_NAMESPACE, query, ytFilters);
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const rawItems = await searchYouTubeVideos(query, ytFilters, { relevanceKeywords: [lesson.t, subject.n] });
  const videoIds = rawItems.map((it) => it?.id?.videoId).filter(Boolean);
  const details = await fetchVideoDetails(videoIds);
  const videos = rawItems.filter((it) => it?.id?.videoId).map((it) => mapYouTubeItemToVideo(it, details, subjectId));

  writeCache(cacheKey, videos, DEFAULT_TTL_MS);
  return videos;
}
