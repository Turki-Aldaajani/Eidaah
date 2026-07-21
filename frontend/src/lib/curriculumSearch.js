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

import { STAGE_SUBJECTS, SUB_DEFS, LESSONS } from "../data/curriculum";

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

// المواد القابلة للتنقل لمرحلة (نقطة التوافق مع #63 — انظر الترويسة)
export function routableSubjects(stageId) {
  return STAGE_SUBJECTS[stageId] || [];
}

function entriesForStage(stageId) {
  const out = [];
  for (const subId of routableSubjects(stageId)) {
    (LESSONS[subId] || []).forEach((title, idx) => {
      out.push({
        stageId,
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
  return out;
}

function scoreEntry(entry, contentTokens, subjectHint) {
  let exact = 0;
  let partial = 0;
  for (const q of contentTokens) {
    if (entry._tokens.includes(q)) {
      exact += 1;
    } else if (entry._tokens.some((t) => t.includes(q) || q.includes(t))) {
      partial += 1;
    }
  }
  if (exact + partial === 0) return 0;
  return exact * 1.0 + partial * 0.5 + (subjectHint === entry.subjectId ? 0.5 : 0);
}

function availableSubjectsMessage(stageId) {
  const names = routableSubjects(stageId)
    .map((id) => (SUB_DEFS[id] || {}).n || id)
    .join("، ");
  return `عذراً، لم أجد هذا ضمن المتاح حالياً. المواد المتوفرة: ${names}. جرّب اسم الدرس أو المادة.`;
}

function subjectBrowse(base, entries, subjectHint, stage, confidence) {
  const results = entries
    .filter((e) => e.subjectId === subjectHint)
    .slice(0, 4)
    .map(pick);
  return {
    ...base, status: "multiple", action: "show_options", confidence, results,
    message: `اختر درساً من مادة ${(SUB_DEFS[subjectHint] || {}).n || subjectHint}:`,
  };
}

function pick(entry) {
  const { _tokens, ...rest } = entry;
  return rest;
}

// ------------------------------------------------------------
// الواجهة الرئيسية
// ------------------------------------------------------------
export function searchCurriculum(query, stageId = "m1") {
  const norm = normalizeAr(query || "");
  const stage = detectStage(norm, stageId);
  const tokens = rawTokens(query || "");
  const subjectHint = detectSubject(tokens);
  const contentTokens = tokens.filter(
    (t) => !STOPWORDS.has(t) && !isSubjectKeyword(t)
  );

  const base = { query: query || "", stageId: stage, subjectHint };
  const entries = entriesForStage(stage);
  const subjectAvailable = subjectHint && routableSubjects(stage).includes(subjectHint);

  // مادة مذكورة بلا اسم درس محدد → تصفّح دروس تلك المادة (حتى 4)
  if (contentTokens.length === 0) {
    if (subjectAvailable) return subjectBrowse(base, entries, subjectHint, stage, 0.5);
    return {
      ...base, status: "no_match", action: "explain",
      confidence: 0, results: [], message: availableSubjectsMessage(stage),
    };
  }

  const scored = entries
    .map((e) => ({ entry: e, score: scoreEntry(e, contentTokens, subjectHint) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.lessonIdx - b.entry.lessonIdx);

  if (scored.length === 0) {
    if (subjectAvailable) return subjectBrowse(base, entries, subjectHint, stage, 0.4);
    return {
      ...base, status: "no_match", action: "explain",
      confidence: 0, results: [], message: availableSubjectsMessage(stage),
    };
  }

  const top = scored[0];
  const gap = scored[1] ? top.score - scored[1].score : Infinity;
  const confidence = Math.max(0, Math.min(1, top.score / (contentTokens.length + 0.5)));

  // exact: مرشّح واحد، أو متصدّر متقدّم بفارق كلمة كاملة على الأقل
  if (scored.length === 1 || gap >= 1.0) {
    return {
      ...base, status: "exact", action: "redirect",
      confidence: Math.max(confidence, 0.7),
      results: [pick(top.entry)],
      message: `أخذتك إلى: ${top.entry.lessonTitle} (${top.entry.subjectName})`,
    };
  }

  // multiple: عدة مرشّحين متقاربين — حتى 4
  return {
    ...base, status: "multiple", action: "show_options", confidence,
    results: scored.slice(0, 4).map((s) => pick(s.entry)),
    message: "وجدت عدة دروس محتملة — أيّها تقصد؟",
  };
}
