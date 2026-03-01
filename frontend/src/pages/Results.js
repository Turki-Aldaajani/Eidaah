import Footer from '../Footer'; 
import React, { useState, useEffect } from "react";
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
    error: "حدث خطأ في التحليل"
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
    error: "Error analyzing slide"
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
  slideThumbnails: { 
    display: "flex", 
    gap: 10, 
    marginBottom: 20,
    flexWrap: "wrap"
  },
  slideText: {
    backgroundColor: "#0B101B",
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
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
    width: "100%"
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

  useEffect(() => {
    // Load slides from localStorage
    const storedSlides = localStorage.getItem("slides");
    if (storedSlides) {
      try {
        const parsed = JSON.parse(storedSlides);
        setSlides(parsed);
      } catch (err) {
        console.error("Error parsing slides:", err);
        setError(staticTranslations[language].no_slides);
      }
    } else {
      setError(staticTranslations[language].no_slides);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === "ar" ? "en" : "ar";
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const handleExplain = async () => {
    if (!slides[currentSlide]) return;
    
    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      console.log("Sending request to:", `${API_URL}/api/analyze_slide`);
      console.log("Slide text:", slides[currentSlide].text);

      const res = await fetch(`${API_URL}/api/analyze_slide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: slides[currentSlide].text }),
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      console.log("Received data:", data);
      setAnalysis(data);

      // Update the slide with the analysis
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

  return (
    <>
      <div style={styles.body}>
        <div style={styles.pageWrapper} className={language === 'ar' ? 'text-ar' : 'text-en'}>
          <div style={styles.header}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>
                <div style={styles.logoInner}></div>
              </div>
              <span>{staticTranslations[language].logo}</span>
            </div>
            <div style={styles.headerControls}>
              <button style={styles.backBtn} onClick={() => navigate("/")}>
                {staticTranslations[language].back_button}
              </button>
              <button style={styles.langBtn} onClick={toggleLanguage}>
                {language === "ar" ? "English" : "العربية"}
              </button>
            </div>
          </div>

          <div style={styles.mainContainer}>
            {/* Left Column: Slide Selection and Content */}
            <div style={styles.leftColumn}>
              <div style={styles.slideThumbnails}>
                {slides.map((slide, index) => (
                  <button
                    key={index}
                    style={{
                      backgroundColor: currentSlide === index ? "#3b82f6" : "#2A3B5C",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: currentSlide === index ? "bold" : "normal"
                    }}
                    onClick={() => {
                      setCurrentSlide(index);
                      setAnalysis(null); // Reset analysis when changing slides
                    }}
                  >
                    {staticTranslations[language].slide} {slide.slide_number}
                  </button>
                ))}
              </div>

              <div style={styles.slideText}>
                <p>{currentSlideData.text}</p>
              </div>

              <button 
                style={{...styles.explainBtn, opacity: loading ? 0.6 : 1}} 
                onClick={handleExplain}
                disabled={loading}
              >
                {loading ? staticTranslations[language].loading : staticTranslations[language].explain_button}
              </button>
            </div>

            {/* Right Column: Analysis Results */}
            <div style={styles.rightColumn}>
              <h2>{staticTranslations[language].analytical_explanation}</h2>
              
              {loading && (
                <div style={styles.explanationBox}>
                  <p style={styles.loadingText}>{staticTranslations[language].loading}</p>
                </div>
              )}

              {error && !loading && (
                <div style={styles.explanationBox}>
                  <p style={styles.errorText}>{error}</p>
                </div>
              )}

              {!loading && !error && analysis && (
                <div style={styles.explanationBox}>
                  <h3>{staticTranslations[language].analytical_explanation}</h3>
                  <p>{analysis.analysis}</p>
                  
                  <h3 style={{marginTop: 20}}>{staticTranslations[language].real_world_example}</h3>
                  <p>{analysis.examples[0] || "No example available"}</p>
                </div>
              )}

              {!loading && !error && !analysis && currentSlideData.explanation && (
                <div style={styles.explanationBox}>
                  <h3>{staticTranslations[language].analytical_explanation}</h3>
                  <p>{currentSlideData.explanation}</p>
                  
                  <h3 style={{marginTop: 20}}>{staticTranslations[language].real_world_example}</h3>
                  <p>{currentSlideData.example}</p>
                </div>
              )}

              {!loading && !error && !analysis && !currentSlideData.explanation && (
                <div style={styles.explanationBox}>
                  <p style={styles.loadingText}>
                    {language === "ar" 
                      ? "انقر على 'شرح' لتحليل هذه الشريحة" 
                      : "Click 'Explain' to analyze this slide"}
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