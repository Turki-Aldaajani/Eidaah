// صفحة نتائج التحليل — تصميم «مراحل التعلم» (مطابق لتصميم ليان في base44).
// سبع مراحل لكل شريحة مع شريط جانبي قابل للطي يقفز لأي مرحلة، وتنقّل سفلي.
// موصولة بالباك اند الحقيقي (لا بيانات وهمية): /status · /summary ·
// /slide_learning · /generate_questions.
//
// #109: الشرح والمثال والملاحظات والأسئلة تتبع الشريحة المعروضة والموضوع المختار — لا أول
// موضوع دائماً. كل محتوى مولّد محفوظ بمفتاح (شريحة|موضوع|لغة): الرجوع لشريحة سابقة لا يعيد
// التوليد، وزر «إعادة التوليد» يطلب نسخة جديدة يدوياً.
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import Icon from "../components/Icon";
import { useLanguage } from "../i18n/LanguageContext";
import { toArabicDigits } from "../data/curriculum";
import { burstConfetti, playCorrect, playWrong } from "../lib/celebrate";
import "../styles/analyzer.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const T = {
  ar: {
    home: "الرئيسية", crumb: "حلّل ملفاتك", back: "رجوع", loading: "جارٍ التحليل...",
    no_slides: "لم يتم العثور على شرائح. يرجى رفع ملف أولاً.", error: "حدث خطأ في التحليل",
    slide_of: "من", slide_word: "الشريحة", prev: "السابقة", next: "التالية",
    collapse: "طيّ الشريط", expand: "إظهار المراحل", auto_meta: "مُولّد بالذكاء الاصطناعي",
    customize: "تخصيص", customize_title: "تخصيص مراحل التعلّم",
    customize_hint: "رتّب المراحل بالسحب أو بالأسهم، وأظهِر أو أخفِ ما تريد.", mandatory: "أساسية", done_btn: "تم",
    move_up: "تحريك لأعلى", move_down: "تحريك لأسفل", drag_hint: "اسحب لإعادة الترتيب",
    rail_sub: "اضغط على المرحلة لإبرازها وتفعيل محتواها",
    topics_hint: "اختر موضوعاً واضغط «شرح» لعرض الشرح التحليلي والمثال والأسئلة التفاعلية.",
    explain: "شرح",
    session_expired: "انتهت الجلسة (أُعيد تشغيل الخادم أو مرّ وقت طويل). يرجى إعادة رفع الملف.",
    reupload: "إعادة رفع الملف",
    lang_changed: "غيّرت اللغة — أعد توليد الملخص أو الشرح أو الأسئلة لعرضها بالعربية.",
    dismiss: "إغلاق",
    pick_topic: "اختر موضوعاً من الأعلى لتبدأ رحلة التعلّم (شرح ← مثال ← ملاحظات ← أسئلة).",
    gen_summary: "توليد الملخص", gen_quiz: "توليد أسئلة المراجعة", topic_prefix: "الموضوع:",
    regen_explain: "إعادة توليد الشرح", regen_quiz: "إعادة توليد الأسئلة", retry: "إعادة المحاولة",
    gen_failed: "تعذّر توليد المحتوى الآن. حاول مرة أخرى.",
    based_on: "مبني على الشرائح", based_on_one: "مبني على الشريحة", with_image: "مع قراءة صورة الشريحة",
    correct: "إجابة صحيحة ✓", wrong: "الإجابة الصحيحة:", explain_label: "التعليل:",
    stages: ["عرض الشريحة", "ملخص الشريحة", "المواضيع", "شرح تحليلي", "مثال واقعي", "ملاحظات للمذاكرة", "أسئلة تفاعلية"],
  },
  en: {
    home: "Home", crumb: "Analyze your files", back: "Back", loading: "Analyzing...",
    no_slides: "No slides found. Please upload a file first.", error: "Error analyzing",
    slide_of: "of", slide_word: "Slide", prev: "Previous", next: "Next",
    collapse: "Collapse", expand: "Show stages", auto_meta: "AI generated",
    customize: "Customize", customize_title: "Customize learning stages",
    customize_hint: "Reorder by dragging or the arrows, and show or hide stages.", mandatory: "core", done_btn: "Done",
    move_up: "Move up", move_down: "Move down", drag_hint: "Drag to reorder",
    rail_sub: "Click a stage to highlight & activate it",
    topics_hint: "Pick a topic and press “Explain” for the analysis, example and quiz.",
    explain: "Explain",
    session_expired: "Session expired (server restarted or too much time passed). Please re-upload the file.",
    reupload: "Re-upload file",
    lang_changed: "Language changed — regenerate the summary, analysis or quiz to view them in English.",
    dismiss: "Dismiss",
    pick_topic: "Pick a topic above to start the learning flow (explain → example → notes → quiz).",
    gen_summary: "Generate summary", gen_quiz: "Generate review questions", topic_prefix: "Topic:",
    regen_explain: "Regenerate explanation", regen_quiz: "Regenerate questions", retry: "Try again",
    gen_failed: "Couldn't generate this content right now. Please try again.",
    based_on: "Based on slides", based_on_one: "Based on slide", with_image: "including the slide image",
    correct: "Correct ✓", wrong: "Correct answer:", explain_label: "Why:",
    stages: ["Slide", "Summary", "Topics", "Analytical", "Example", "Study notes", "Quiz"],
  },
};

const STAGE_STEPS = [1, 2, 3, 4, 5, 6, 7];

// #109: مفتاح المحتوى المولّد — لكل (شريحة، موضوع، لغة) شرحه وأسئلته الخاصة
const contentKey = (slideNumber, topicId, lang) => `${slideNumber}|${topicId ?? "-"}|${lang}`;

// الموضوع الذي يغطي الشريحة (أو الأقرب إليها) حسب الشرائح التي يربطها الباك اند بكل موضوع
function topicForSlide(topics, slideNumber) {
  let best = null;
  let bestDist = Infinity;
  topics.forEach((topic) => (topic.slides || []).forEach((n) => {
    const dist = Math.abs(n - slideNumber);
    if (dist < bestDist) { best = topic; bestDist = dist; }
  }));
  return best;
}

function SlideCard({ slide }) {
  const lines = (slide.text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div className="an-slide-card">
      {lines[0] && <b>{lines[0]}</b>}
      {lines.slice(1).length > 0 && <p>{lines.slice(1).join("\n")}</p>}
    </div>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = T[language];

  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [error, setError] = useState("");
  const [sessionId] = useState(() => localStorage.getItem("session_id") || "");
  const [docTitle, setDocTitle] = useState(() => localStorage.getItem("title") || "");
  const [docDescription, setDocDescription] = useState("");
  const [docAuto, setDocAuto] = useState(false);
  const [slideImages, setSlideImages] = useState({});
  const [topics, setTopics] = useState([]);
  const [indexingComplete, setIndexingComplete] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  // مسار التعلّم (المراحل ٤–٧) يُفتح بلغة معيّنة ويبقى مفتوحاً مع التنقّل بين الشرائح؛
  // تغيير اللغة يغلقه فوراً في نفس الرسم (فلا يُطلق توليد باللغة الجديدة دون طلب)
  const [flowLanguage, setFlowLanguage] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [learning, setLearning] = useState({}); // key → {status: "loading"|"ready"|"error", data}
  const [quizzes, setQuizzes] = useState({}); // key → {status, questions: [{q,o,a,e}]}
  const [quizPicks, setQuizPicks] = useState({}); // key → { qIndex: optionIndex }
  const [doneSteps, setDoneSteps] = useState(() => new Set([1]));
  const [activeStep, setActiveStep] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [flashStep, setFlashStep] = useState(null);
  const [langNotice, setLangNotice] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("an_hidden_stages") || "[]")); }
    catch { return new Set(); }
  });
  const [order, setOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("an_stage_order") || "null");
      if (Array.isArray(saved) && saved.length === STAGE_STEPS.length &&
          STAGE_STEPS.every((s) => saved.includes(s))) return saved;
    } catch { /* تجاهل */ }
    return [...STAGE_STEPS];
  });
  const [dragStep, setDragStep] = useState(null);

  const sectionEls = useRef({});
  const pollingRef = useRef(null);
  const flashTimer = useRef(null);
  const langInit = useRef(true);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);
  const registerRef = (step) => (el) => {
    if (el) sectionEls.current[step] = el;
    else delete sectionEls.current[step];
  };

  // ما تعرضه المراحل ٤–٧ الآن: الشريحة الحالية + الموضوع المختار + اللغة
  const flowOpen = flowLanguage === language;
  const slideNumber = slides[currentSlide]?.slide_number;
  const selectedTopic = topics.find((topic) => topic.topic_id === selectedTopicId) || null;
  const activeKey = slideNumber == null ? null : contentKey(slideNumber, selectedTopicId, language);
  const learnEntry = activeKey ? learning[activeKey] : undefined;
  const quizEntry = activeKey ? quizzes[activeKey] : undefined;

  // تحميل الشرائح من التخزين
  useEffect(() => {
    const stored = localStorage.getItem("slides");
    if (stored) {
      try { setSlides(JSON.parse(stored)); }
      catch { setError(t.no_slides); }
    } else {
      setError(t.no_slides);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // استطلاع الحالة: صور الشرائح، المواضيع، الملخص، العنوان
  useEffect(() => {
    if (!sessionId) return;
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/session/${sessionId}/status`);
        if (res.status === 404) {
          // الجلسة انتهت أو أُعيد تشغيل الخادم — أوقف الاستطلاع بدل التعليق للأبد
          setSessionExpired(true);
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (data.slides) {
          const map = {};
          data.slides.forEach((s) => { if (s.image_url) map[s.slide_number] = `${API_URL}${s.image_url}`; });
          setSlideImages(map);
        }
        if (data.title) setDocTitle(data.title);
        if (data.description) setDocDescription(data.description);
        if (data.auto_generated) setDocAuto(true);
        if (data.indexing_complete) {
          setIndexingComplete(true);
          if (data.topics?.length) setTopics(data.topics);
          if (data.summary) setSummary(data.summary);
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        }
      } catch { /* تجاهل */ }
    };
    poll();
    pollingRef.current = setInterval(poll, 2000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [sessionId]);

  // تغيير اللغة أثناء عرض النتائج: الملخص بقي باللغة القديمة فنُعيد ضبطه، ومسار التعلّم يُغلق
  // (محتواه محفوظ بمفتاح اللغة فلا يُخلط)، مع تنبيه بسيط للمستخدم.
  useEffect(() => {
    if (langInit.current) { langInit.current = false; return; }
    setSummary("");
    setSelectedTopicId(null);
    setDoneSteps(new Set([1]));
    setActiveStep(1);
    setLangNotice(true);
  }, [language]);

  const completeStep = useCallback((step) => {
    setDoneSteps((prev) => new Set(prev).add(step));
    setActiveStep(step);
  }, []);

  // تخصيص المراحل: الشريحة (1) والمواضيع (3) أساسيتان، والبقية قابلة للإخفاء
  const isHidden = (step) => hidden.has(step);
  const isMandatory = (step) => step === 1 || step === 3;
  const toggleStage = (step) => {
    if (isMandatory(step)) return;
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      localStorage.setItem("an_hidden_stages", JSON.stringify([...next]));
      return next;
    });
  };

  // إعادة ترتيب المراحل (كنترول سنتر): أزرار سهم أعلى/أسفل + سحب وإفلات
  const persistOrder = (arr) => { localStorage.setItem("an_stage_order", JSON.stringify(arr)); return arr; };
  const moveStage = (step, dir) => setOrder((prev) => {
    const i = prev.indexOf(step);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= prev.length) return prev;
    const arr = [...prev];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return persistOrder(arr);
  });
  const dropOnStage = (target) => {
    setOrder((prev) => {
      if (dragStep == null || dragStep === target) return prev;
      const arr = prev.filter((s) => s !== dragStep);
      const idx = arr.indexOf(target);
      arr.splice(idx, 0, dragStep);
      return persistOrder(arr);
    });
    setDragStep(null);
  };

  const fetchSummary = useCallback(async () => {
    if (!sessionId || summary) return completeStep(2);
    setSummaryLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/session/${sessionId}/summary`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      if (res.ok) setSummary((await res.json()).summary);
    } catch { /* تجاهل */ } finally { setSummaryLoading(false); completeStep(2); }
  }, [sessionId, summary, language, completeStep]);

  // الشرح + المثال + الملاحظات لشريحة وموضوع. النتيجة تُحفظ تحت مفتاحها هي، فالرد المتأخر
  // لشريحة سابقة لا يستبدل ما يُعرض الآن أبداً.
  const loadLearning = useCallback(async (n, topicId, refresh = false) => {
    if (!sessionId || n == null) return;
    const key = contentKey(n, topicId, language);
    setLearning((prev) => ({ ...prev, [key]: { ...prev[key], status: "loading" } }));
    try {
      const res = await fetch(`${API_URL}/api/session/${sessionId}/slide_learning`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide_number: n, topic_id: topicId, language, refresh }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLearning((prev) => ({ ...prev, [key]: { status: "ready", data } }));
    } catch {
      setLearning((prev) => ({ ...prev, [key]: { ...prev[key], status: "error" } }));
    }
  }, [sessionId, language]);

  // المسار مفتوح وتغيّرت الشريحة أو الموضوع ← اجلب محتوى المفتاح الجديد (مرة واحدة لكل مفتاح)
  useEffect(() => {
    if (!flowOpen || !activeKey || learning[activeKey]) return;
    loadLearning(slideNumber, selectedTopicId);
  }, [flowOpen, activeKey, learning, loadLearning, slideNumber, selectedTopicId]);

  // أسئلة الشريحة الحالية — تُولَّد عند الطلب فقط، وكلٌّ محفوظ تحت مفتاحه
  const fetchQuiz = useCallback(async (topicId, refresh = false) => {
    completeStep(7);
    if (!sessionId || slideNumber == null) return;
    const key = contentKey(slideNumber, topicId, language);
    const entry = quizzes[key];
    if (!refresh && entry && entry.status !== "error") return;
    setQuizzes((prev) => ({ ...prev, [key]: { ...prev[key], status: "loading" } }));
    setQuizPicks((prev) => ({ ...prev, [key]: {} }));
    try {
      const res = await fetch(`${API_URL}/api/generate_questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, slide_number: slideNumber, topic_id: topicId, language, refresh }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const questions = (await res.json()).questions || [];
      setQuizzes((prev) => ({ ...prev, [key]: { status: "ready", questions } }));
    } catch {
      setQuizzes((prev) => ({ ...prev, [key]: { ...prev[key], status: "error" } }));
    }
  }, [completeStep, sessionId, slideNumber, language, quizzes]);

  // اختيار موضوع يفتح المسار له، ويقفز لأول شرائحه إن لم تكن الشريحة الحالية منها —
  // فالشريحة المعروضة والشرح المولّد يبقيان متطابقين
  const selectTopic = useCallback((topic) => {
    setFlowLanguage(language);
    setSelectedTopicId(topic.topic_id);
    completeStep(3);
    const own = topic.slides || [];
    if (own.length && !own.includes(slides[currentSlide]?.slide_number)) {
      const idx = slides.findIndex((s) => own.includes(s.slide_number));
      if (idx >= 0) setCurrentSlide(idx);
    }
  }, [language, completeStep, slides, currentSlide]);

  // التنقّل بين الشرائح: مراحل الشريحة تبدأ من جديد، والمسار المفتوح يتبعها — الموضوع يتحدّث
  // لموضوع الشريحة الجديدة، فيُجلب شرحها (أو يُعرض من المحفوظ إن سبق توليده)
  const goToSlide = (index) => {
    if (index < 0 || index >= slides.length) return;
    setCurrentSlide(index);
    setDoneSteps(new Set([1]));
    setActiveStep(1);
    if (!flowOpen) return;
    const n = slides[index].slide_number;
    if (selectedTopic?.slides?.includes(n)) return;
    const topic = topicForSlide(topics, n);
    if (topic) setSelectedTopicId(topic.topic_id);
  };

  // كنترول سنتر: الضغط على مرحلة يُبرزها بصرياً + يُفعّل محتواها + يمرّر إليها
  const goToStep = useCallback((step) => {
    let topicId = selectedTopicId;
    // المراحل 4–7 تحتاج المسار مفتوحاً — نفتحه بموضوع الشريحة المعروضة (لا أول موضوع دائماً)
    if (step >= 4 && !flowOpen) {
      topicId = topicForSlide(topics, slideNumber)?.topic_id ?? null;
      setSelectedTopicId(topicId);
      setFlowLanguage(language);
    }
    // تفعيل محتوى المرحلة مباشرةً (لا زر منفصل)
    if (step === 2) fetchSummary();
    if (step === 7) fetchQuiz(topicId);
    completeStep(step);
    // وميض إبراز مؤقّت على القسم المقصود
    setFlashStep(step);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashStep(null), 1500);
    // تمرير بعد رسم القسم (خصوصاً بعد فتح المسار)
    requestAnimationFrame(() => {
      const el = sectionEls.current[step] || sectionEls.current[3];
      el?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
  }, [completeStep, flowOpen, selectedTopicId, topics, slideNumber, language, fetchSummary, fetchQuiz]);

  const learnData = learnEntry?.status === "ready" ? learnEntry.data : null;
  const learnLoading = flowOpen && (!learnEntry || learnEntry.status === "loading");
  const learnFailed = learnEntry?.status === "error";
  // ملاحظات للمذاكرة: من النموذج مباشرةً، وإلا مشتقّة من الشرح التحليلي (نقاط)
  const notes = learnData?.notes?.length
    ? learnData.notes
    : (learnData?.explanation || "").split(/(?<=[.،؟!])\s+/).map((s) => s.trim()).filter((s) => s.length > 12);
  const quizLoading = quizEntry?.status === "loading";
  const quizQuestions = quizEntry?.status === "ready" && quizEntry.questions.length ? quizEntry.questions : null;
  const picks = (activeKey && quizPicks[activeKey]) || {};

  const num = (n) => (language === "ar" ? toArabicDigits(String(n)) : String(n));

  if (slides.length === 0) {
    return (
      <>
        <TopNav />
        <section className="view"><div className="container" style={{ paddingTop: 40 }}>
          {error ? (
            <>
              <p className="upload-error">{error}</p>
              <button className="btn ghost" onClick={() => navigate("/analyze")}>{t.back}</button>
            </>
          ) : <p className="upload-filename">{t.loading}</p>}
        </div></section>
      </>
    );
  }

  const slide = slides[currentSlide];
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === slides.length - 1;
  const startChev = language === "ar" ? "rot-r" : "rot-l";
  const endChev = language === "ar" ? "rot-l" : "rot-r";

  // دالة أصناف بدل مكوّن داخلي: يمنع إعادة إنشاء الأقسام (remount) عند كل تغيير حالة
  // — وهو ما كان يُقفز التمرير للأعلى عند الإجابة على الأسئلة.
  const stageCls = (step) =>
    `an-stage anim${step === activeStep ? " is-active" : ""}${step === flashStep ? " flash" : ""}`;

  // على ماذا بُني الشرح: الموضوع + الشرائح المستخدمة كسياق (+ قراءة صورة الشريحة)
  const learnMeta = () => {
    const ctxSlides = learnData?.context_slides || [slideNumber];
    const first = ctxSlides[0];
    const last = ctxSlides[ctxSlides.length - 1];
    return (
      <p className="an-learn-meta">
        {selectedTopic && <span>{t.topic_prefix} {selectedTopic.label}</span>}
        <span>{ctxSlides.length > 1 ? `${t.based_on} ${num(first)}–${num(last)}` : `${t.based_on_one} ${num(first)}`}</span>
        {learnData?.used_visual && <span>{t.with_image}</span>}
      </p>
    );
  };

  // جسم المراحل ٤–٦: تحميل، أو خطأ ظاهر (لا تحميل للأبد)، أو المحتوى
  const learnBody = (content) => {
    if (learnLoading) return <p className="upload-filename">{t.loading}</p>;
    if (learnFailed) return <p className="upload-error">{t.gen_failed}</p>;
    return content;
  };

  // يعرض قسم مرحلة واحدة حسب رقمها — يُستدعى من مصفوفة الترتيب (order) ليدعم إعادة الترتيب.
  // البوابات: (٢) قابلة للإخفاء، و(٤–٧) تحتاج مسار التعلّم مفتوحاً.
  const renderStage = (step) => {
    if (step === 2 && isHidden(2)) return null;
    if (step >= 4 && (isHidden(step) || !flowOpen)) return null;

    const wrap = (icon, labelIdx, body) => (
      <div key={step} className={stageCls(step)} data-step={step} ref={registerRef(step)} onClick={() => completeStep(step)}>
        <div className="an-card">
          <div className="an-card-head"><Icon name={icon} /> <b>{t.stages[labelIdx]}</b></div>
          {body}
        </div>
      </div>
    );

    switch (step) {
      case 1:
        return wrap("file-text", 0,
          slideImages[slide.slide_number]
            ? <img className="an-slide-img" src={slideImages[slide.slide_number]} alt={`${t.slide_word} ${slide.slide_number}`} loading="lazy" />
            : <SlideCard slide={slide} />);
      case 2:
        return wrap("layers", 1,
          summary ? <p className="an-text">{summary}</p> : (
            <button className="btn ghost" onClick={fetchSummary} disabled={summaryLoading}>
              {summaryLoading ? t.loading : t.gen_summary}
            </button>));
      case 3:
        return wrap("book-open", 2, (
          <>
            {sessionExpired ? (
              <div className="an-expired">
                <p>{t.session_expired}</p>
                <button className="btn" onClick={() => navigate("/analyze")}>{t.reupload}</button>
              </div>
            ) : (!indexingComplete && sessionId && <p className="upload-filename">{t.loading}</p>)}
            {topics.length > 0 && (
              <>
                <p className="an-topics-hint">{t.topics_hint}</p>
                <div className="an-topic-rows">
                  {topics.map((topic) => {
                    const active = flowOpen && selectedTopicId === topic.topic_id;
                    return (
                      <div className={`an-topic-row${active ? " active" : ""}`} key={topic.topic_id}>
                        <span className="an-topic-q">{topic.label}</span>
                        <button type="button" className="btn an-topic-explain"
                          aria-label={`${t.explain} ${topic.label}`}
                          onClick={() => selectTopic(topic)}
                          disabled={learnLoading && active}>
                          {learnLoading && active ? "..." : (<>{t.explain} <Icon name="arrow" /></>)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>));
      case 4:
        return wrap("sparkles", 3, (
          <>
            {learnMeta()}
            {learnBody(<p className="an-text">{learnData?.explanation}</p>)}
            <div className="an-regen-row">
              <button type="button" className="btn ghost an-regen" disabled={learnLoading}
                onClick={() => loadLearning(slideNumber, selectedTopicId, true)}>
                <Icon name="sparkles" /> {learnFailed ? t.retry : t.regen_explain}
              </button>
            </div>
          </>));
      case 5:
        return wrap("target", 4, learnBody(<p className="an-text">{learnData?.examples?.[0]}</p>));
      case 6:
        return wrap("note", 5, learnBody(
          <ul className="an-notes">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>));
      case 7:
        return wrap("help", 6,
          !quizQuestions ? (
            <>
              {quizEntry?.status === "error" && <p className="upload-error">{t.gen_failed}</p>}
              <button className="btn" onClick={() => fetchQuiz(selectedTopicId)} disabled={quizLoading}>
                <Icon name="sparkles" /> {quizLoading ? t.loading : t.gen_quiz}
              </button>
            </>
          ) : (
            <>
              <div className="an-quiz">
                {quizQuestions.map((q, qi) => {
                  const picked = picks[qi];
                  const answered = picked != null;
                  return (
                    <div className="an-q" key={qi}>
                      <b>{num(qi + 1)}. {q.q}</b>
                      <div className="an-q-opts">
                        {q.o.map((opt, oi) => {
                          let cls = "an-opt";
                          if (answered) {
                            if (oi === q.a) cls += " correct";
                            else if (oi === picked) cls += " wrong";
                            else cls += " muted";
                          }
                          return (
                            <button key={oi} type="button" className={cls}
                              disabled={answered}
                              onClick={(e) => {
                                if (answered) return;
                                setQuizPicks((p) => ({ ...p, [activeKey]: { ...p[activeKey], [qi]: oi } }));
                                if (oi === q.a) { burstConfetti(e.clientX, e.clientY); playCorrect(); }
                                else { playWrong(); }
                              }}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <p className="an-q-fb">
                          {picked === q.a ? t.correct : `${t.wrong} ${q.o[q.a]}`}
                          {q.e && <span className="an-q-why"> — {t.explain_label} {q.e}</span>}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="an-regen-row">
                <button type="button" className="btn ghost an-regen" onClick={() => fetchQuiz(selectedTopicId, true)}>
                  <Icon name="sparkles" /> {t.regen_quiz}
                </button>
              </div>
            </>
          ));
      default:
        return null;
    }
  };

  return (
    <div className="an-page">
      <TopNav />
      <div className="an-shell">
        {/* الشريط الجانبي: مراحل التعلم (قابل للطي) */}
        <aside className={`an-rail ${sidebarOpen ? "open" : "closed"}`}>
          <div className="an-rail-in">
            <div className="an-rail-head">
              <div className="an-rail-titles">
                <span className="an-rail-title">مراحل التعلّم</span>
                <span className="an-rail-sub">{t.rail_sub}</span>
              </div>
              <div className="an-rail-actions">
                <button type="button" className="an-custom-btn" onClick={() => setCustomOpen(true)}>
                  <Icon name="pen" /> {t.customize}
                </button>
                <button type="button" className="an-icon-btn" onClick={() => setSidebarOpen(false)} title={t.collapse} aria-label={t.collapse}>
                  <Icon name="chev" className={startChev} />
                </button>
              </div>
            </div>
            <ol className="an-rail-list">
              {order.map((step) => {
                const label = t.stages[step - 1];
                if (isHidden(step)) return null;
                const done = doneSteps.has(step);
                const active = step === activeStep;
                return (
                  <li key={step}>
                    <button
                      type="button"
                      className={`an-stage-btn${done ? " done" : ""}${active ? " active" : ""}`}
                      onClick={() => goToStep(step)}
                    >
                      <span className="an-stage-dot">
                        {done ? <Icon name="check" /> : <span className="an-stage-num">{num(step)}</span>}
                      </span>
                      <span className="an-stage-label">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        {!sidebarOpen && (
          <button type="button" className="an-expand" onClick={() => setSidebarOpen(true)} title={t.expand} aria-label={t.expand}>
            <Icon name="chev" className={endChev} />
          </button>
        )}

        {/* المحتوى الرئيسي */}
        <main className="an-main">
          <nav className="crumbs">
            <Link to="/">{t.home}</Link>
            <i className="sep">‹</i>
            <Link to="/analyze">{t.crumb}</Link>
            <i className="sep">‹</i>
            <span className="cur">{docTitle || localStorage.getItem("filename") || ""}</span>
          </nav>

          <div className="an-file-head">
            <span className="an-file-ic"><Icon name="file-text" /></span>
            <div>
              <h1>{docTitle || localStorage.getItem("filename") || ""}
                {docAuto && <span className="ai-badge" title={t.auto_meta}> 🤖 {t.auto_meta}</span>}
              </h1>
              {docDescription && <p className="an-file-desc">{docDescription}</p>}
            </div>
          </div>

          {langNotice && (
            <div className="an-lang-notice" role="status">
              <Icon name="sparkles" />
              <span>{t.lang_changed}</span>
              <button type="button" className="an-notice-x" onClick={() => setLangNotice(false)} aria-label={t.dismiss}>✕</button>
            </div>
          )}

          {/* المراحل تُعرض من مصفوفة الترتيب (order) لدعم إعادة الترتيب من التخصيص */}
          {order.map(renderStage)}

          {/* دعوة لاختيار موضوع عندما لا يكون مسار التعلّم مفتوحاً بعد */}
          {!flowOpen && <p className="an-hint">{t.pick_topic}</p>}
        </main>
      </div>

      {/* شريط التنقّل السفلي */}
      <div className="an-bottom">
        <span className="an-bottom-count">{t.slide_word} {num(currentSlide + 1)} {t.slide_of} {num(slides.length)}</span>
        <div className="an-bottom-btns">
          <button className="btn ghost" onClick={() => goToSlide(currentSlide - 1)} disabled={isFirst}>
            <Icon name="chev" className={startChev} /> {t.prev}
          </button>
          <button className="btn" onClick={() => goToSlide(currentSlide + 1)} disabled={isLast}>
            {t.next} <Icon name="chev" className={endChev} />
          </button>
        </div>
      </div>

      {/* نافذة تخصيص المراحل (نمط الكنترول سنتر) */}
      {customOpen && (
        <div className="modal-overlay" role="dialog" aria-label={t.customize_title}>
          <div className="card modal-card anim">
            <h2>{t.customize_title}</h2>
            <p className="s-desc">{t.customize_hint}</p>
            <div className="an-custom-list">
              {order.map((step, idx) => {
                const label = t.stages[step - 1];
                return (
                  <div
                    key={step}
                    className={`an-custom-row${dragStep === step ? " dragging" : ""}`}
                    draggable
                    onDragStart={() => setDragStep(step)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOnStage(step)}
                    onDragEnd={() => setDragStep(null)}
                  >
                    <span className="an-drag-handle" title={t.drag_hint} aria-hidden="true">↕</span>
                    <span className="an-reorder-btns">
                      <button type="button" className="an-mini-btn" aria-label={t.move_up} title={t.move_up}
                        onClick={() => moveStage(step, -1)} disabled={idx === 0}>▲</button>
                      <button type="button" className="an-mini-btn" aria-label={t.move_down} title={t.move_down}
                        onClick={() => moveStage(step, 1)} disabled={idx === order.length - 1}>▼</button>
                    </span>
                    <label className="an-custom-check">
                      <input
                        type="checkbox"
                        checked={!isHidden(step)}
                        disabled={isMandatory(step)}
                        onChange={() => toggleStage(step)}
                      />
                      <span>{label}</span>
                    </label>
                    {isMandatory(step) && <span className="an-custom-req">{t.mandatory}</span>}
                  </div>
                );
              })}
            </div>
            <button type="button" className="btn" onClick={() => setCustomOpen(false)}>{t.done_btn}</button>
          </div>
        </div>
      )}
    </div>
  );
}
