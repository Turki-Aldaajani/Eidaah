// صفحة نتائج التحليل — تصميم «مراحل التعلم» (مطابق لتصميم ليان في base44).
// سبع مراحل لكل شريحة مع شريط جانبي قابل للطي يقفز لأي مرحلة، وتنقّل سفلي.
// موصولة بالباك اند الحقيقي (لا بيانات وهمية): /status · /summary ·
// /analyze_slide · /analyze_topic · /generate_questions.
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
    correct: "Correct ✓", wrong: "Correct answer:", explain_label: "Why:",
    stages: ["Slide", "Summary", "Topics", "Analytical", "Example", "Study notes", "Quiz"],
  },
};

const STAGE_STEPS = [1, 2, 3, 4, 5, 6, 7];

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
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicContent, setTopicContent] = useState(null); // {explanation, examples}
  const [topicLoading, setTopicLoading] = useState(false);
  const [quiz, setQuiz] = useState(null); // [{q,o,a,e}]
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizPicks, setQuizPicks] = useState({}); // { qIndex: optionIndex }
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

  // كل شريحة تبدأ رحلة تعلّم جديدة
  useEffect(() => {
    setSelectedTopic(null);
    setTopicContent(null);
    setQuiz(null);
    setQuizPicks({});
    setDoneSteps(new Set([1]));
    setActiveStep(1);
  }, [currentSlide]);

  // تغيير اللغة أثناء عرض النتائج: المحتوى المولّد (ملخص/شرح/مثال/أسئلة) بقي باللغة
  // القديمة. نُعيد ضبطه ليُعاد توليده باللغة الجديدة، مع تنبيه بسيط للمستخدم.
  useEffect(() => {
    if (langInit.current) { langInit.current = false; return; }
    setSummary("");
    setSelectedTopic(null);
    setTopicContent(null);
    setQuiz(null);
    setQuizPicks({});
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

  const selectTopic = useCallback(async (topic) => {
    setSelectedTopic(topic);
    setTopicContent(null);
    setTopicLoading(true);
    completeStep(3);
    try {
      const res = await fetch(`${API_URL}/api/analyze_topic`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, topic_id: topic.topic_id, language }),
      });
      if (res.ok) setTopicContent(await res.json());
    } catch { setError(t.error); } finally { setTopicLoading(false); }
  }, [sessionId, language, completeStep, t.error]);

  const fetchQuiz = useCallback(async () => {
    completeStep(7);
    if (quiz || !sessionId) return;
    setQuizLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/generate_questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, language }),
      });
      if (res.ok) setQuiz((await res.json()).questions || []);
    } catch { /* تجاهل */ } finally { setQuizLoading(false); }
  }, [quiz, sessionId, language, completeStep]);

  // كنترول سنتر: الضغط على مرحلة يُبرزها بصرياً + يُفعّل محتواها + يمرّر إليها
  const goToStep = useCallback((step) => {
    // المراحل 4–7 تحتاج موضوعاً مختاراً — نفتح المسار تلقائياً بأول موضوع
    if (step >= 4 && !selectedTopic && topics.length > 0) selectTopic(topics[0]);
    // تفعيل محتوى المرحلة مباشرةً (لا زر منفصل)
    if (step === 2) fetchSummary();
    if (step === 7) fetchQuiz();
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
  }, [completeStep, selectedTopic, topics, selectTopic, fetchSummary, fetchQuiz]);

  // ملاحظات للمذاكرة: مشتقّة من الشرح التحليلي (نقاط)
  const notes = topicContent?.explanation
    ? topicContent.explanation.split(/(?<=[.،؟!])\s+/).map((s) => s.trim()).filter((s) => s.length > 12)
    : [];

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

  // يعرض قسم مرحلة واحدة حسب رقمها — يُستدعى من مصفوفة الترتيب (order) ليدعم إعادة الترتيب.
  // البوابات: (٢) قابلة للإخفاء، و(٤–٧) تحتاج موضوعاً مختاراً.
  const renderStage = (step) => {
    if (step === 2 && isHidden(2)) return null;
    if (step >= 4 && (isHidden(step) || !selectedTopic)) return null;

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
                    const active = selectedTopic?.topic_id === topic.topic_id;
                    return (
                      <div className={`an-topic-row${active ? " active" : ""}`} key={topic.topic_id}>
                        <span className="an-topic-q">{topic.label}</span>
                        <button type="button" className="btn an-topic-explain"
                          aria-label={`${t.explain} ${topic.label}`}
                          onClick={() => selectTopic(topic)}
                          disabled={topicLoading && active}>
                          {topicLoading && active ? "..." : (<>{t.explain} <Icon name="arrow" /></>)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>));
      case 4:
        return wrap("sparkles", 3,
          topicLoading ? <p className="upload-filename">{t.loading}</p> : <p className="an-text">{topicContent?.explanation}</p>);
      case 5:
        return wrap("target", 4,
          topicLoading ? <p className="upload-filename">{t.loading}</p> : <p className="an-text">{topicContent?.examples?.[0]}</p>);
      case 6:
        return wrap("note", 5,
          notes.length > 0
            ? <ul className="an-notes">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            : <p className="upload-filename">{t.loading}</p>);
      case 7:
        return wrap("help", 6,
          !quiz ? (
            <button className="btn" onClick={fetchQuiz} disabled={quizLoading}>
              <Icon name="sparkles" /> {quizLoading ? t.loading : t.gen_quiz}
            </button>
          ) : (
            <div className="an-quiz">
              {quiz.map((q, qi) => {
                const picked = quizPicks[qi];
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
                              setQuizPicks((p) => ({ ...p, [qi]: oi }));
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

          {/* دعوة لاختيار موضوع عندما لا يوجد موضوع مختار بعد */}
          {!selectedTopic && <p className="an-hint">{t.pick_topic}</p>}
        </main>
      </div>

      {/* شريط التنقّل السفلي */}
      <div className="an-bottom">
        <span className="an-bottom-count">{t.slide_word} {num(currentSlide + 1)} {t.slide_of} {num(slides.length)}</span>
        <div className="an-bottom-btns">
          <button className="btn ghost" onClick={() => !isFirst && setCurrentSlide((s) => s - 1)} disabled={isFirst}>
            <Icon name="chev" className={startChev} /> {t.prev}
          </button>
          <button className="btn" onClick={() => !isLast && setCurrentSlide((s) => s + 1)} disabled={isLast}>
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
