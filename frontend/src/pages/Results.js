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
import "../styles/analyzer.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const T = {
  ar: {
    home: "الرئيسية", crumb: "حلّل ملفاتك", back: "رجوع", loading: "جارٍ التحليل...",
    no_slides: "لم يتم العثور على شرائح. يرجى رفع ملف أولاً.", error: "حدث خطأ في التحليل",
    slide_of: "من", slide_word: "الشريحة", prev: "السابقة", next: "التالية",
    collapse: "طيّ الشريط", expand: "إظهار المراحل", auto_meta: "مُولّد بالذكاء الاصطناعي",
    rail_sub: "اضغط على المرحلة للانتقال إليها",
    topics_hint: "اختر موضوعاً واضغط «شرح» لعرض الشرح التحليلي والمثال والأسئلة التفاعلية.",
    explain: "شرح",
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
    rail_sub: "Click a stage to jump to it",
    topics_hint: "Pick a topic and press “Explain” for the analysis, example and quiz.",
    explain: "Explain",
    pick_topic: "Pick a topic above to start the learning flow (explain → example → notes → quiz).",
    gen_summary: "Generate summary", gen_quiz: "Generate review questions", topic_prefix: "Topic:",
    correct: "Correct ✓", wrong: "Correct answer:", explain_label: "Why:",
    stages: ["Slide", "Summary", "Topics", "Analytical", "Example", "Study notes", "Quiz"],
  },
};

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
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicContent, setTopicContent] = useState(null); // {explanation, examples}
  const [topicLoading, setTopicLoading] = useState(false);
  const [quiz, setQuiz] = useState(null); // [{q,o,a,e}]
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizPicks, setQuizPicks] = useState({}); // { qIndex: optionIndex }
  const [maxStep, setMaxStep] = useState(1);
  const [activeStep, setActiveStep] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sectionEls = useRef({});
  const pollingRef = useRef(null);
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
    setMaxStep(1);
    setActiveStep(1);
  }, [currentSlide]);

  const completeStep = useCallback((step) => {
    setMaxStep((s) => Math.max(s, step));
    setActiveStep(step);
  }, []);

  const goToStep = useCallback((step) => {
    completeStep(step);
    const el = sectionEls.current[step] || sectionEls.current[3];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [completeStep]);

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

  const Stage = ({ step, children }) => (
    <div
      data-step={step}
      ref={registerRef(step)}
      onClick={() => completeStep(step)}
      className="an-stage anim"
    >
      {children}
    </div>
  );

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
              <button type="button" className="an-icon-btn" onClick={() => setSidebarOpen(false)} title={t.collapse} aria-label={t.collapse}>
                <Icon name="chev" className={startChev} />
              </button>
            </div>
            <ol className="an-rail-list">
              {t.stages.map((label, i) => {
                const step = i + 1;
                const done = step <= maxStep;
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

          {/* 1) عرض الشريحة */}
          <Stage step={1}>
            <div className="an-card">
              <div className="an-card-head"><Icon name="file-text" /> <b>{t.stages[0]}</b></div>
              {slideImages[slide.slide_number] ? (
                <img className="an-slide-img" src={slideImages[slide.slide_number]} alt={`${t.slide_word} ${slide.slide_number}`} loading="lazy" />
              ) : <SlideCard slide={slide} />}
            </div>
          </Stage>

          {/* 2) ملخص الشريحة */}
          <Stage step={2}>
            <div className="an-card">
              <div className="an-card-head"><Icon name="layers" /> <b>{t.stages[1]}</b></div>
              {summary ? <p className="an-text">{summary}</p> : (
                <button className="btn ghost" onClick={fetchSummary} disabled={summaryLoading}>
                  {summaryLoading ? t.loading : t.gen_summary}
                </button>
              )}
            </div>
          </Stage>

          {/* 3) المواضيع */}
          <Stage step={3}>
            <div className="an-card">
              <div className="an-card-head"><Icon name="book-open" /> <b>{t.stages[2]}</b></div>
              {!indexingComplete && sessionId && <p className="upload-filename">{t.loading}</p>}
              {topics.length > 0 && (
                <>
                  <p className="an-topics-hint">{t.topics_hint}</p>
                  <div className="an-topic-rows">
                    {topics.map((topic) => {
                      const active = selectedTopic?.topic_id === topic.topic_id;
                      return (
                        <div className={`an-topic-row${active ? " active" : ""}`} key={topic.topic_id}>
                          <span className="an-topic-q">{topic.label}</span>
                          <button
                            type="button"
                            className="btn an-topic-explain"
                            aria-label={`${t.explain} ${topic.label}`}
                            onClick={() => selectTopic(topic)}
                            disabled={topicLoading && active}
                          >
                            {topicLoading && active ? "..." : (<>{t.explain} <Icon name="arrow" /></>)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </Stage>

          {/* 4-7: تظهر بعد اختيار موضوع */}
          {!selectedTopic ? (
            <p className="an-hint">{t.pick_topic}</p>
          ) : (
            <>
              <Stage step={4}>
                <div className="an-card">
                  <div className="an-card-head"><Icon name="sparkles" /> <b>{t.stages[3]}</b></div>
                  {topicLoading ? <p className="upload-filename">{t.loading}</p>
                    : <p className="an-text">{topicContent?.explanation}</p>}
                </div>
              </Stage>

              <Stage step={5}>
                <div className="an-card">
                  <div className="an-card-head"><Icon name="target" /> <b>{t.stages[4]}</b></div>
                  {topicLoading ? <p className="upload-filename">{t.loading}</p>
                    : <p className="an-text">{topicContent?.examples?.[0]}</p>}
                </div>
              </Stage>

              <Stage step={6}>
                <div className="an-card">
                  <div className="an-card-head"><Icon name="note" /> <b>{t.stages[5]}</b></div>
                  {notes.length > 0 ? (
                    <ul className="an-notes">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                  ) : <p className="upload-filename">{t.loading}</p>}
                </div>
              </Stage>

              <Stage step={7}>
                <div className="an-card">
                  <div className="an-card-head"><Icon name="help" /> <b>{t.stages[6]}</b></div>
                  {!quiz ? (
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
                                }
                                return (
                                  <button key={oi} type="button" className={cls}
                                    disabled={answered}
                                    onClick={() => setQuizPicks((p) => ({ ...p, [qi]: oi }))}>
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
                  )}
                </div>
              </Stage>
            </>
          )}
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
    </div>
  );
}
