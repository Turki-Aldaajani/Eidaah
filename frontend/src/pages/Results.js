import Footer from '../Footer'; 
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const staticTranslations = {
  ar: {
    logo: "إيضاح",
    back_button: "← رجوع",
    slide: "شريحة",
    explain_button: "شرح",
    analytical_explanation: "شرح تحليلي:",
    real_world_example: "مثال واقعي:",
    loading: "جارٍ التحليل...",
    no_slides: "لم يتم العثور على شرائح. يرجى رفع ملف أولاً.",
    error: "حدث خطأ في التحليل",
    topics_title: "المواضيع",
    topics_loading: "جارٍ اكتشاف المواضيع...",
    topics_none: "لم يتم اكتشاف مواضيع.",
    analyze_topic: "شرح الموضوع",
    summary_title: "ملخص العرض",
    generate_summary: "عرض الملخص",
    select_slide: "اختر شريحة"
  },
  en: {
    logo: "Eidaah",
    back_button: "← Back",
    slide: "Slide",
    explain_button: "Explain",
    analytical_explanation: "Analytical Explanation:",
    real_world_example: "Real-World Example:",
    loading: "Analyzing...",
    no_slides: "No slides found. Please upload a file first.",
    error: "Error analyzing slide",
    topics_title: "Topics",
    topics_loading: "Discovering topics...",
    topics_none: "No topics detected.",
    analyze_topic: "Explain Topic",
    summary_title: "Presentation Summary",
    generate_summary: "Show Summary",
    select_slide: "Select a slide"
  },
};

const styles = {
  body: { 
    backgroundColor: "#0a0f1c", 
    color: "#E0E0E0", 
    fontFamily: "'Cairo', sans-serif", 
    margin: 0, 
    padding: 40, 
    minHeight: "100vh" 
  },
  pageWrapper: { 
    backgroundColor: "#2a2f3a", 
    borderRadius: 24, 
    padding: 48, 
    maxWidth: 1200, 
    margin: "0 auto" 
  },
  header: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 48 
  },
  logo: { 
    display: "flex", 
    alignItems: "center", 
    gap: 12 
  },
  logoIcon: { 
    width: 40, 
    height: 40, 
    backgroundColor: "#3b82f6", 
    borderRadius: "50%", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  logoInner: { 
    width: 24, 
    height: 24, 
    border: "2px solid white", 
    borderRadius: "50%" 
  },
  headerControls: { 
    display: "flex", 
    gap: 15, 
    alignItems: "center" 
  },
  backBtn: { 
    background: "none", 
    border: "1px solid #4A5568", 
    color: "white", 
    padding: "8px 16px", 
    borderRadius: 6, 
    cursor: "pointer", 
    fontWeight: "bold" 
  },
  langBtn: { 
    backgroundColor: "#2A3B5C", 
    color: "white", 
    border: "none", 
    padding: "8px 16px", 
    borderRadius: 6, 
    cursor: "pointer", 
    fontWeight: "bold" 
  },
  mainContainer: { 
    display: "grid", 
    gridTemplateColumns: "repeat(2, 1fr)", 
    gap: 32 
  },
  leftColumn: { 
    backgroundColor: "#1e2d42", 
    padding: 32, 
    borderRadius: 16 
  },
  rightColumn: { 
    backgroundColor: "#1e2d42", 
    padding: 32, 
    borderRadius: 16 
  },
  slideDropdown: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #4A5568",
    backgroundColor: "#0B101B",
    color: "#E0E0E0",
    fontFamily: "'Cairo', sans-serif",
    fontSize: 14,
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: 4
  },
  slideText: {
    backgroundColor: "#0B101B",
    padding: 20,
    borderRadius: 8,
    marginTop: 12,
    maxHeight: "400px",
    overflowY: "auto",
    lineHeight: 1.6
  },
  explanationBox: { 
    backgroundColor: "#0B101B", 
    padding: 20, 
    borderRadius: 8,
    minHeight: "200px"
  },
  explainBtn: {
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: 20,
    width: "100%",
    fontFamily: "'Cairo', sans-serif",
    fontSize: 15
  },
  secondaryBtn: {
    backgroundColor: "#2A3B5C",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: 12,
    width: "100%",
    fontFamily: "'Cairo', sans-serif",
    fontSize: 15,
    transition: "background-color 0.2s"
  },
  loadingText: {
    fontStyle: "italic",
    color: "#808080"
  },
  errorText: {
    color: "#ff6b6b",
    fontWeight: "bold"
  },
  noContent: {
    textAlign: "center",
    padding: "40px",
    color: "#808080"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3b82f6",
    marginTop: 28,
    marginBottom: 12
  },
  topicCard: {
    backgroundColor: "#0B101B",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  topicLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#E0E0E0",
    margin: 0,
    flex: 1
  },
  topicAnalyzeBtn: {
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    padding: "6px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
    fontFamily: "'Cairo', sans-serif",
    fontSize: 13,
    whiteSpace: "nowrap",
    flexShrink: 0
  },
  summaryBox: {
    backgroundColor: "#0B101B",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeft: "3px solid #3b82f6"
  },
  summaryLabel: {
    fontSize: 13,
    color: "#3b82f6",
    fontWeight: "bold",
    margin: "0 0 6px 0"
  },
  summaryText: {
    fontSize: 14,
    color: "#ccc",
    margin: 0,
    lineHeight: 1.6
  },
  slideImage: {
    width: "100%",
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: "#0B101B"
  },
  statusDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    marginRight: 6,
    verticalAlign: "middle"
  },
  divider: {
    border: "none",
    borderTop: "1px solid #2A3B5C",
    margin: "24px 0 8px 0"
  }
};

export default function Results() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(localStorage.getItem("language") || "ar");
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Phase 3 state
  const [sessionId] = useState(() => localStorage.getItem("session_id") || "");
  const [topics, setTopics] = useState([]);
  const [summary, setSummary] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [indexingComplete, setIndexingComplete] = useState(false);
  const [slideImages, setSlideImages] = useState({});
  const [activeTopicId, setActiveTopicId] = useState(null); // which topic is being analyzed
  const [topicAnalysis, setTopicAnalysis] = useState(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const pollingRef = useRef(null);

  // Load slides from localStorage
  useEffect(() => {
    const storedSlides = localStorage.getItem("slides");
    if (storedSlides) {
      try {
        setSlides(JSON.parse(storedSlides));
      } catch (err) {
        console.error("Error parsing slides:", err);
        setError(staticTranslations[language].no_slides);
      }
    } else {
      setError(staticTranslations[language].no_slides);
    }
  }, []);

  // Poll for session status
  useEffect(() => {
    if (!sessionId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/session/${sessionId}/status`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.slides) {
          const imgMap = {};
          data.slides.forEach((s) => {
            if (s.image_url) {
              imgMap[s.slide_number] = `${API_URL}${s.image_url}`;
            }
          });
          setSlideImages(imgMap);
        }

        if (data.indexing_complete) {
          setIndexingComplete(true);
          if (data.topics && data.topics.length > 0) {
            setTopics(data.topics);
          }
          if (data.summary) {
            setSummary(data.summary);
          }
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    pollStatus();
    pollingRef.current = setInterval(pollStatus, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionId]);

  const toggleLanguage = () => {
    const newLang = language === "ar" ? "en" : "ar";
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  // Per-slide explain
  const handleExplain = async () => {
    if (!slides[currentSlide]) return;
    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const res = await fetch(`${API_URL}/api/analyze_slide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: slides[currentSlide].text }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setAnalysis(data);

      const updatedSlides = [...slides];
      updatedSlides[currentSlide].explanation = data.analysis;
      updatedSlides[currentSlide].example = data.examples[0] || "";
      setSlides(updatedSlides);
      localStorage.setItem("slides", JSON.stringify(updatedSlides));
    } catch (err) {
      console.error("Analysis error:", err);
      setError(staticTranslations[language].error);
    } finally {
      setLoading(false);
    }
  };

  // Per-topic analyze
  const handleAnalyzeTopic = async (topic) => {
    setActiveTopicId(topic.topic_id);
    setTopicAnalysis(null);
    setTopicLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/analyze_topic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          topic_id: topic.topic_id,
        }),
      });
      if (res.status === 202) { setTopicLoading(false); return; }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setTopicAnalysis(data);
    } catch (err) {
      console.error("Topic analysis error:", err);
      setError(staticTranslations[language].error);
    } finally {
      setTopicLoading(false);
    }
  };

  // Empty / error states
  if (slides.length === 0 && !error) {
    return (
      <div style={styles.body}>
        <div style={styles.pageWrapper}>
          <div style={styles.noContent}>
            <p>{staticTranslations[language].loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && slides.length === 0) {
    return (
      <div style={styles.body}>
        <div style={styles.pageWrapper}>
          <div style={styles.noContent}>
            <p style={styles.errorText}>{error}</p>
            <button style={styles.backBtn} onClick={() => navigate("/")}>
              {staticTranslations[language].back_button}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];
  const t = staticTranslations[language];

  return (
    <>
      <div style={styles.body}>
        <div style={styles.pageWrapper} className={language === 'ar' ? 'text-ar' : 'text-en'}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>
                <div style={styles.logoInner}></div>
              </div>
              <span>{t.logo}</span>
            </div>
            <div style={styles.headerControls}>
              <button style={styles.backBtn} onClick={() => navigate("/")}>
                {t.back_button}
              </button>
              <button style={styles.langBtn} onClick={toggleLanguage}>
                {language === "ar" ? "English" : "العربية"}
              </button>
            </div>
          </div>

          <div style={styles.mainContainer}>
            {/* ========= LEFT COLUMN ========= */}
            <div style={styles.leftColumn}>

              {/* Slide dropdown */}
              <select
                style={styles.slideDropdown}
                value={currentSlide}
                onChange={(e) => {
                  setCurrentSlide(Number(e.target.value));
                  setAnalysis(null);
                }}
              >
                {slides.map((slide, index) => (
                  <option key={index} value={index}>
                    {t.slide} {slide.slide_number}
                  </option>
                ))}
              </select>

              {/* Slide image */}
              {slideImages[currentSlideData.slide_number] && (
                <img
                  src={slideImages[currentSlideData.slide_number]}
                  alt={`${t.slide} ${currentSlideData.slide_number}`}
                  style={styles.slideImage}
                  loading="lazy"
                />
              )}

              {/* Slide text */}
              <div style={styles.slideText}>
                <p>{currentSlideData.text}</p>
              </div>

              {/* Explain slide button */}
              <button 
                style={{...styles.explainBtn, opacity: loading ? 0.6 : 1}} 
                onClick={handleExplain}
                disabled={loading}
              >
                {loading ? t.loading : t.explain_button}
              </button>

              {/* ---- TOPICS SECTION (below slides, always visible once ready) ---- */}
              <hr style={styles.divider} />

              {/* Topics loading indicator */}
              {!indexingComplete && sessionId && (
                <p style={{ ...styles.loadingText, fontSize: 13, marginTop: 8 }}>
                  <span style={{ ...styles.statusDot, backgroundColor: "#f59e0b" }} />
                  {t.topics_loading}
                </p>
              )}

              {/* Topics title + list */}
              {indexingComplete && topics.length > 0 && (
                <>
                  <p style={styles.sectionTitle}>{t.topics_title}</p>

                  {/* Show Summary button */}
                  {summary && !showSummary && (
                    <button
                      style={{ ...styles.secondaryBtn, marginTop: 0, marginBottom: 14 }}
                      onClick={() => setShowSummary(true)}
                    >
                      {t.generate_summary}
                    </button>
                  )}

                  {showSummary && summary && (
                    <div style={styles.summaryBox}>
                      <p style={styles.summaryLabel}>{t.summary_title}</p>
                      <p style={styles.summaryText}>{summary}</p>
                    </div>
                  )}

                  {/* Topic cards with per-topic Analyze button */}
                  {topics.map((topic) => (
                    <div key={topic.topic_id} style={styles.topicCard}>
                      <p style={styles.topicLabel}>{topic.label}</p>
                      <button
                        style={{
                          ...styles.topicAnalyzeBtn,
                          opacity: topicLoading && activeTopicId === topic.topic_id ? 0.6 : 1,
                        }}
                        disabled={topicLoading && activeTopicId === topic.topic_id}
                        onClick={() => handleAnalyzeTopic(topic)}
                      >
                        {topicLoading && activeTopicId === topic.topic_id
                          ? "..."
                          : t.analyze_topic}
                      </button>
                    </div>
                  ))}
                </>
              )}

              {indexingComplete && topics.length === 0 && sessionId && (
                <p style={{ ...styles.loadingText, fontSize: 13, marginTop: 8 }}>
                  {t.topics_none}
                </p>
              )}
            </div>

            {/* ========= RIGHT COLUMN ========= */}
            <div style={styles.rightColumn}>
              <h2>{t.analytical_explanation}</h2>

              {/* Slide-level loading */}
              {loading && (
                <div style={styles.explanationBox}>
                  <p style={styles.loadingText}>{t.loading}</p>
                </div>
              )}

              {/* Topic-level loading */}
              {topicLoading && !loading && (
                <div style={styles.explanationBox}>
                  <p style={styles.loadingText}>{t.loading}</p>
                </div>
              )}

              {/* Error */}
              {error && !loading && !topicLoading && (
                <div style={styles.explanationBox}>
                  <p style={styles.errorText}>{error}</p>
                </div>
              )}

              {/* Topic analysis result */}
              {!topicLoading && !loading && !error && topicAnalysis && (
                <div style={styles.explanationBox}>
                  <h3 style={{ color: "#3b82f6", marginTop: 0 }}>
                    {topicAnalysis.topic_label}
                  </h3>

                  <h3 style={{ marginTop: 16 }}>{t.analytical_explanation}</h3>
                  <p>{topicAnalysis.explanation}</p>

                  {topicAnalysis.examples && topicAnalysis.examples.length > 0 && topicAnalysis.examples[0] && (
                    <>
                      <h3 style={{ marginTop: 20 }}>{t.real_world_example}</h3>
                      <p>{topicAnalysis.examples[0]}</p>
                    </>
                  )}
                </div>
              )}

              {/* Slide analysis result */}
              {!topicLoading && !loading && !error && !topicAnalysis && analysis && (
                <div style={styles.explanationBox}>
                  <h3>{t.analytical_explanation}</h3>
                  <p>{analysis.analysis}</p>
                  
                  <h3 style={{marginTop: 20}}>{t.real_world_example}</h3>
                  <p>{analysis.examples[0] || "No example available"}</p>
                </div>
              )}

              {/* Cached slide explanation */}
              {!topicLoading && !loading && !error && !topicAnalysis && !analysis && currentSlideData.explanation && (
                <div style={styles.explanationBox}>
                  <h3>{t.analytical_explanation}</h3>
                  <p>{currentSlideData.explanation}</p>
                  
                  <h3 style={{marginTop: 20}}>{t.real_world_example}</h3>
                  <p>{currentSlideData.example}</p>
                </div>
              )}

              {/* Empty state */}
              {!topicLoading && !loading && !error && !topicAnalysis && !analysis && !currentSlideData.explanation && (
                <div style={styles.explanationBox}>
                  <p style={styles.loadingText}>
                    {language === "ar" 
                      ? "انقر على 'شرح' لتحليل شريحة، أو 'شرح الموضوع' لتحليل موضوع" 
                      : "Click 'Explain' for a slide, or 'Explain Topic' for a topic"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer language={language} />
    </>
  );
}
