import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import Icon from "../components/Icon";
import Footer from "../Footer";
import { useLanguage } from "../i18n/LanguageContext";
import "../styles/analyzer.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const translations = {
  ar: {
    feature1_title: "تنظيم تلقائي",
    feature1_desc: "نظم محتوى عرضك تلقائيًا باستخدام كشف الهيكل المدعوم بالذكاء الاصطناعي وترتيب الشرائح الذكي.",
    feature2_title: "تحليل سريع",
    feature2_desc: "تحليل تلقائي سريع لشرائحك مع رؤى فورية واستخلاص النقاط الرئيسية لفهم أسرع.",
    feature3_title: "ملاحظات المتحدث",
    feature3_desc: "أنشئ ملاحظات شاملة لكل شريحة مع نقاط حوار، انتقالات، ونصائح للعرض التقديمي.",
    home: "الرئيسية",
    crumb: "حلّل ملفاتك",
    headline: "افهم وقدم عرضك بوضوح",
    subheadline: "حوّل الشرائح المعقدة إلى محتوى سهل الفهم مع إيضاح",
    drop_text: "ارفع ملف بصيغة PDF أو PPTX",
    choose_file: "اختر ملف",
    uploading: "جارٍ الرفع...",
    processing: "جارٍ المعالجة...",
    error: "حدث خطأ في رفع الملف",
  },
  en: {
    feature1_title: "Auto Organization",
    feature1_desc: "Automatically organize your presentation content with AI-powered structure detection and intelligent slide ordering.",
    feature2_title: "Fast Analysis",
    feature2_desc: "Quick automatic analysis of your slides with instant insights and key point extraction for faster understanding.",
    feature3_title: "Speaker Notes",
    feature3_desc: "Generate comprehensive speaker notes for each slide with talking points, transitions, and presentation tips.",
    home: "Home",
    crumb: "Analyze your files",
    headline: "Understand and Present Clearly",
    subheadline: "Transform complex slides into easy-to-understand content with Eidaah",
    drop_text: "Drop a PDF or PPTX file",
    choose_file: "Choose File",
    uploading: "Uploading...",
    processing: "Processing...",
    error: "Error uploading file",
  },
};

export default function Upload() {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const { language, toggleLanguage } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const t = translations[language];

  const ACCEPTED = [".pdf", ".pptx"];
  const isAccepted = (file) =>
    ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext));

  const uploadFile = async (file) => {
    setFileName(file.name);
    setProgress(10);
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(30);

      const res = await fetch(`${API_URL}/api/upload_file`, {
        method: "POST",
        body: formData,
      });

      setProgress(60);

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();

      setProgress(80);

      const transformedSlides = data.slides.map((slide) => ({
        slide_number: slide.slide_number,
        text: slide.text,
        explanation: null,
        example: null,
      }));

      localStorage.setItem("slides", JSON.stringify(transformedSlides));
      localStorage.setItem("filename", data.filename);
      localStorage.setItem("session_id", data.session_id);

      setProgress(100);

      setTimeout(() => {
        navigate("/analyze/results");
      }, 500);
    } catch (err) {
      console.error("Upload error:", err);
      setError(t.error);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length === 0) return;
    uploadFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!uploading) setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (uploading) return;
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    if (!isAccepted(file)) {
      setFileName(file.name);
      setError(t.error);
      return;
    }
    uploadFile(file);
  };

  return (
    <>
      <TopNav />
      <section className="view view-analyze">
        <div className="container">
          <div className="page-head">
            <nav className="crumbs">
              <Link to="/">{t.home}</Link>
              <i className="sep">‹</i>
              <span className="cur">{t.crumb}</span>
            </nav>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1>
                  <span className="h-ic" style={{ "--c": "var(--pri)" }}>
                    <Icon name="file-text" />
                  </span>
                  {t.headline}
                </h1>
                <p>{t.subheadline}</p>
              </div>
              <button type="button" className="btn ghost" onClick={toggleLanguage}>
                {language === "ar" ? "English" : "العربية"}
              </button>
            </div>
          </div>

          <div
            className={`upload-drop card${dragActive ? " drag-over" : ""}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <p>{t.drop_text}</p>
            <label className="btn" style={{ opacity: uploading ? 0.6 : 1 }}>
              <Icon name="file-text" /> {t.choose_file}
              <input type="file" accept=".pdf,.pptx" onChange={handleFileChange} style={{ display: "none" }} disabled={uploading} />
            </label>

            {fileName && <p className="upload-filename">{fileName}</p>}

            {progress > 0 && (
              <div className="upload-progress">
                <i style={{ width: `${progress}%` }}></i>
              </div>
            )}

            {uploading && <p className="upload-filename">{t.processing}</p>}
            {error && <p className="upload-error">{error}</p>}
          </div>

          <div className="upload-features">
            <div className="upload-feature">
              <h3>{t.feature1_title}</h3>
              <p>{t.feature1_desc}</p>
            </div>
            <div className="upload-feature">
              <h3>{t.feature2_title}</h3>
              <p>{t.feature2_desc}</p>
            </div>
            <div className="upload-feature">
              <h3>{t.feature3_title}</h3>
              <p>{t.feature3_desc}</p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
