// ─── C3 (#52): بحث فهرس المناهج للتنقل الذكي ──────────────────────────────────
// منطق بحث نقي (بلا React) فوق فهرس المناهج المحلي في data/curriculum.js.
// لا يولّد محتوى — يبحث فقط في الفهرس القائم (المواد + عناوين الدروس) ويعيد
// مساراً جاهزاً للتنقل إلى صفحة الدرس: /learn/:stage/:subject/:chapter/:lessonIdx
//
// يعالج ثلاث حالات:
//   exact     → تطابق واضح واحد   → action "redirect"
//   multiple  → عدة احتمالات (≤4) → action "show_options"
//   no_match  → خارج النطاق       → action "explain" (رسالة لطيفة)
//
// ملاحظة توافق مع #63: المواد القابلة للتنقل تُشتق من STAGE_SUBJECTS (نطاق POC
// الحالي على main). حين يُدمج #63 (حقل STAGES[].status وحالة "قريباً")، يكفي
// تعديل routableSubjects() وحدها لاحترام التوفّر — نقطة تغيير واحدة.
//
// كل الأنماط الحسّاسة (حركات/نطاقات يونيكود) بترميز \uXXXX تفادياً للبس المحارف.

import {
  STAGE_SUBJECTS, SUB_DEFS, LESSONS, POC_STAGES, stageById, isSubjectAvailable,
} from "../data/curriculum";

const CHAPTER_POC = 1; // C1: الفصل الدراسي الأول فقط
const AL = "ال"; // "ال" التعريفية

// كلمات حشو تُستبعد من كلمات البحث (بعد التطبيع وتجريد "ال")
const STOPWORDS = new Set([
  "درس", "دروس", "اريد", "ابي", "ابغى", "بغيت", "ودي", "بدي", "عايز", "عاوز",
  "محتاج", "اعطني", "اعطيني", "وريني", "ابحث", "دور", "دلني", "وين", "فين",
  "شرح", "اشرح", "وحده", "ماده", "درسي", "صف", "لو", "سمحت", "من", "في",
  "علي", "عن", "كيف", "هو", "ما", "ياليت", "الي", "اللي", "حق", "بخصوص",
  // كلمات المرحلة/الصف (يقرؤها detectStage من النص لا من الكلمات)
  "متوسط", "ابتدائي", "ثانوي", "اول", "اولى", "ثاني", "ثالث", "رابع",
  "خامس", "سادس",
]);

// مرادفات المواد لتحسين الكشف (بالإضافة لأسماء SUB_DEFS نفسها)
const SUBJECT_SYNONYMS = {
  math: ["رياضيات", "رياضه", "حساب", "جبر", "هندسه"],
  ar: ["عربي", "عربيه", "نحو", "لغتي", "قواعد", "املاء"],
  dig: ["رقميه", "حاسب", "حاسوب", "كمبيوتر", "برمجه", "مهارات"],
  sci: ["علوم"], phy: ["فيزياء"], chem: ["كيمياء"], bio: ["احياء"],
  en: ["انجليزي", "english"], isl: ["اسلاميه", "دين", "فقه", "توحيد"],
  soc: ["اجتماعيات", "تاريخ", "جغرافيا"],
};

// ------------------------------------------------------------
// تطبيع النص العربي
// ------------------------------------------------------------
export function normalizeAr(s) {
  if (!s) return "";
  return String(s)
    .replace(/[ً-ٰٟـ]/g, "")     // حركات + ألف خنجرية + تطويل
    .replace(/[أإآٱ]/g, "ا") // أ إ آ ٱ → ا
    .replace(/ى/g, "ي")                     // ى → ي
    .replace(/ة/g, "ه")                     // ة → ه
    .replace(/ؤ/g, "و")                     // ؤ → و
    .replace(/ئ/g, "ي")                     // ئ → ي
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// تقطيع إلى كلمات، مع تجريد بادئة "ال" التعريفية
function rawTokens(s) {
  return normalizeAr(s)
    .split(/[^؀-ۿ0-9a-z]+/)
    .filter(Boolean)
    .map((t) => (t.length > 3 && t.startsWith(AL) ? t.slice(2) : t));
}

// كلمات عنوان الدرس (نفس التقطيع مع تجريد "ال")
function titleTokens(s) {
  return rawTokens(s);
}

// كشف المادة من كلمات الاستعلام: يعيد subjectId أو null
function detectSubject(tokens) {
  for (const t of tokens) {
    for (const [subId, name] of Object.entries(SUB_DEFS)) {
      const keys = [...titleTokens(name.n), ...(SUBJECT_SYNONYMS[subId] || [])];
      for (const k of keys) {
        // تطابق كامل أو بادئة (≥3 محارف) — "رياضي" ⊂ "رياضيات"
        if (t === k || (t.length >= 3 && k.startsWith(t)) ||
            (k.length >= 3 && t.startsWith(k))) {
          return subId;
        }
      }
    }
  }
  return null;
}

function isSubjectKeyword(t) {
  return detectSubject([t]) !== null;
}

// كشف المرحلة من نص الاستعلام المطبَّع (يتجاوز الافتراضي إن ذُكرت صراحة)
function detectStage(norm, fallback) {
  if (!norm.includes("متوسط")) return fallback;
  if (norm.includes("اول")) return "m1";
  if (norm.includes("ثاني")) return "m2";
  if (norm.includes("ثالث")) return "m3";
  return fallback;
}

// المواد القابلة للتنقل لمرحلة: المتاحة فعلياً فقط (تحترم حالة #63 —
// STAGES[].status + POC_SUBJECTS). الدروس "قريباً" لا يُوجَّه إليها.
export function routableSubjects(stageId) {
  return (STAGE_SUBJECTS[stageId] || []).filter((s) => isSubjectAvailable(stageId, s));
}

function entriesForStages(stageIds) {
  const out = [];
  for (const stageId of stageIds) {
    for (const subId of routableSubjects(stageId)) {
      (LESSONS[subId] || []).forEach((title, idx) => {
        out.push({
          stageId,
          stageName: (stageById(stageId) || {}).n || stageId,
          subjectId: subId,
          subjectName: (SUB_DEFS[subId] || {}).n || subId,
          lessonTitle: title,
          lessonIdx: idx,
          chapterId: CHAPTER_POC,
          url: `/learn/${stageId}/${subId}/${CHAPTER_POC}/${idx}`,
          _tokens: titleTokens(title),
        });
      });
    }
  }
  return out;
}

// هل الدخلان يشيران لنفس الدرس (نفس المادة والترتيب) في صفوف مختلفة؟
function sameLesson(a, b) {
  return a.subjectId === b.subjectId && a.lessonIdx === b.lessonIdx;
}

// مسافة ليفنشتاين (تحرير) بين نصّين — لتسامح الأخطاء الإملائية
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

// أفضل درجة تطابق لكلمة استعلام مع كلمات عنوان الدرس:
//   تطابق كامل = 1.0 · تطابق جزئي (substring) = 0.6 · تقريبي (إملائي) ≤ 0.5
// "clean" تعني تطابقاً نظيفاً (بلا اعتماد على التقريب) — يميّز الثقة العالية.
function bestTokenScore(q, titleTokens) {
  if (titleTokens.includes(q)) return { score: 1.0, fuzzy: false, clean: true };
  if (titleTokens.some((t) => t.includes(q) || q.includes(t))) {
    return { score: 0.6, fuzzy: false, clean: true };
  }
  // مطابقة تقريبية (Levenshtein) للأخطاء الإملائية — مفيدة للكلمات المعرّبة
  // مثل: "سكراش"/"سكرتش" ⟶ "سكراتش". عتبة ضيّقة تجنّباً للمطابقات الكاذبة.
  let best = 0;
  for (const t of titleTokens) {
    const L = Math.max(q.length, t.length);
    if (L < 4) continue;
    const d = levenshtein(q, t);
    const maxDist = L >= 6 ? 2 : 1;
    if (d <= maxDist && d / L <= 0.34) {
      best = Math.max(best, 0.5 * (1 - d / L));
    }
  }
  if (best > 0) return { score: best, fuzzy: true, clean: false };
  return { score: 0, fuzzy: false, clean: false };
}

// يعيد { score, cleanCount, fuzzy }: score إجمالي، cleanCount عدد الكلمات
// المطابَقة نظيفاً، fuzzy إن اعتمد أي تطابق على التقريب الإملائي.
function scoreEntry(entry, contentTokens, subjectHint) {
  let score = 0;
  let cleanCount = 0;
  let fuzzy = false;
  for (const q of contentTokens) {
    const m = bestTokenScore(q, entry._tokens);
    if (m.score === 0) continue;
    score += m.score;
    if (m.clean) cleanCount += 1;
    if (m.fuzzy) fuzzy = true;
  }
  if (score === 0) return { score: 0, cleanCount: 0, fuzzy: false };
  if (subjectHint === entry.subjectId) score += 0.5;
  return { score, cleanCount, fuzzy };
}

function availableSubjectsMessage(stageId) {
  const names = routableSubjects(stageId)
    .map((id) => (SUB_DEFS[id] || {}).n || id)
    .join("، ");
  return `عذراً، لم أجد هذا ضمن المتاح حالياً. المواد المتوفرة: ${names}. جرّب اسم الدرس أو المادة.`;
}

function subjectBrowse(base, browseStage, subjectHint, confidence) {
  const results = entriesForStages([browseStage])
    .filter((e) => e.subjectId === subjectHint)
    .slice(0, 4)
    .map(pick);
  return {
    ...base, status: "multiple", action: "show_options", confidence, results,
    message: `اختر درساً من مادة ${(SUB_DEFS[subjectHint] || {}).n || subjectHint}:`,
  };
}

function noMatch(base, stageForMessage) {
  return {
    ...base, status: "no_match", action: "explain",
    confidence: 0, results: [], message: availableSubjectsMessage(stageForMessage),
  };
}

function pick(entry) {
  const { _tokens, ...rest } = entry;
  return rest;
}

// ------------------------------------------------------------
// الواجهة الرئيسية
// ------------------------------------------------------------
// stageId: الصف المحدَّد سياقاً (اختياري). إن ذُكر صف صراحةً في السؤال فهو
// يتغلّب. حين لا يوجد صف محدَّد نبحث عبر كل صفوف POC، فإذا كان الدرس متوفّراً
// في أكثر من صف نعرض خيارات الصفوف بدل التوجيه العشوائي لصفٍّ واحد.
export function searchCurriculum(query, stageId = null) {
  const norm = normalizeAr(query || "");
  const explicitStage = detectStage(norm, null);
  const scopeStage = explicitStage || stageId; // السؤال يتغلّب على السياق
  const stages = scopeStage ? [scopeStage] : POC_STAGES;

  const tokens = rawTokens(query || "");
  const subjectHint = detectSubject(tokens);
  const contentTokens = tokens.filter(
    (t) => !STOPWORDS.has(t) && !isSubjectKeyword(t)
  );

  const base = { query: query || "", stageId: scopeStage, subjectHint };
  const entries = entriesForStages(stages);
  const subjectAvailable =
    subjectHint && stages.some((s) => routableSubjects(s).includes(subjectHint));
  const browseStage = scopeStage || stages[0];

  // مادة مذكورة بلا اسم درس محدد → تصفّح دروس تلك المادة (حتى 4)
  if (contentTokens.length === 0) {
    if (subjectAvailable) return subjectBrowse(base, browseStage, subjectHint, 0.5);
    return noMatch(base, browseStage);
  }

  const scored = entries
    .map((e) => ({ entry: e, ...scoreEntry(e, contentTokens, subjectHint) }))
    .filter((s) => s.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      a.entry.lessonIdx - b.entry.lessonIdx ||
      a.entry.stageId.localeCompare(b.entry.stageId));

  // لا تطابق إطلاقاً (ولا حتى تقريبي) → عندئذٍ فقط نعتذر
  if (scored.length === 0) {
    if (subjectAvailable) return subjectBrowse(base, browseStage, subjectHint, 0.4);
    return noMatch(base, browseStage);
  }

  const top = scored[0];
  const confidence = Math.max(0, Math.min(1, top.score / (contentTokens.length + 0.5)));

  // نفس الدرس (نفس المادة/الترتيب) متصدّراً في أكثر من صف → توضيح الصف
  const acrossStages = scored.filter(
    (s) => s.score === top.score && sameLesson(s.entry, top.entry)
  );
  if (acrossStages.length > 1) {
    const anyFuzzy = acrossStages.some((s) => s.fuzzy);
    return {
      ...base, status: "multiple", action: "show_options",
      confidence: Math.max(confidence, 0.6),
      results: acrossStages.slice(0, 4).map((s) => pick(s.entry)),
      message: anyFuzzy
        ? "هل تقصد هذا الدرس؟ اختر الصف:"
        : "هذا الدرس متوفّر في أكثر من صف، اختر الصف:",
    };
  }

  // أفضل مرشّح مختلف (درس آخر) لقياس الهيمنة
  const other = scored.find((s) => !sameLesson(s.entry, top.entry));
  const gap = other ? top.score - other.score : Infinity;

  // exact/redirect فقط لتطابق نظيف مهيمن في صف واحد (بلا تقريب)
  const exactGrade = !top.fuzzy && top.cleanCount === contentTokens.length;
  if (exactGrade && gap >= 1.0) {
    return {
      ...base, status: "exact", action: "redirect",
      confidence: Math.max(confidence, 0.7),
      results: [pick(top.entry)],
      message: `أخذتك إلى: ${top.entry.lessonTitle} (${top.entry.subjectName})`,
    };
  }

  // غير ذلك → اقتراحات "هل تقصد؟" (بما فيها الأخطاء الإملائية) حتى 4 أزرار
  const results = scored.slice(0, 4);
  const anyFuzzy = results.some((s) => s.fuzzy);
  return {
    ...base, status: "multiple", action: "show_options", confidence,
    results: results.map((s) => pick(s.entry)),
    message: anyFuzzy
      ? "هل تقصد أحد هذه الدروس؟"
      : "وجدت عدة دروس محتملة، أيّها تقصد؟",
  };
}
