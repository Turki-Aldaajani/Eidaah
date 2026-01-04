import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../App.css'; // <-- هذا السطر مهم
import Footer from '../Footer'; // <-- هذا هو الصحيح

const translations = {
  ar: {
    feature1_title: "Automal.ic", feature1_subtitle: "تنظيم تلقائي", feature1_desc: "نظم محتوى عرضك تلقائيًا باستخدام كشف الهيكل المدعوم بالذكاء الاصطناعي وترتيب الشرائح الذكي.",
    feature2_title: "تلقائي", feature2_subtitle: "تحليل سريع", feature2_desc: "تحليل تلقائي سريع لشرائحك مع رؤى فورية واستخلاص النقاط الرئيسية لفهم أسرع.",
    feature3_title: "ملاحظات المتحدث", feature3_subtitle: "ملاحظات للمتحدث", feature3_desc: "أنشئ ملاحظات شاملة لكل شريحة مع نقاط حوار، انتقالات، ونصائح للعرض التقديمي.",
    logo: "إيضاح", headline: "افهم وقدم عرضك بوضوح", subheadline: "حوّل الشرائح المعقدة إلى محتوى سهل الفهم مع إيضاح",
    drop_text: "ارفع ملف بصيغة PDF أو PPTX", choose_file: "اختر ملف", uploading: "جارٍ الرفع...",
  },
  en: {
    feature1_title: "Automal.ic", feature1_subtitle: "Automatic organization", feature1_desc: "Automatically organize your presentation content with AI-powered structure detection and intelligent slide ordering.",
    feature2_title: "Automatic", feature2_subtitle: "Rapid analysis", feature2_desc: "Quick automatic analysis of your slides with instant insights and key point extraction for faster understanding.",
    feature3_title: "Speaker notes", feature3_subtitle: "Speaker notes", feature3_desc: "Generate comprehensive speaker notes for each slide with talking points, transitions, and presentation tips.",
    logo: "SlideAI", headline: "Understand and Present Clearly", subheadline: "Transform complex slides into easy-to-understand content with SlideAI",
    drop_text: "Drop a PDF or PPTX file", choose_file: "Choose File", uploading: "Uploading...",
  }
};

const styles = {
  body: { background: "#0a0f1c", color: "white", fontFamily: "'Cairo', sans-serif", margin: 0, padding: 40, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh" },
  pageWrapper: { backgroundColor: "#2a2f3a", borderRadius: 24, padding: 48, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", width: "100%", maxWidth: 900, textAlign: "center" },
  navbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoIcon: { width: 40, height: 40, backgroundColor: "#3b82f6", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center" },
  logoInner: { width: 24, height: 24, border: "2px solid white", borderRadius: "50%" },
  langBtn: { backgroundColor: "#2A3B5C", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" },
  headline: { textAlign: "center", marginBottom: 30 },
  uploadBox: { border: "2px dashed #3a6ea5", borderRadius: 12, padding: 40, background: "#1e232d", maxWidth: 500, margin: "20px auto", textAlign: "center" },
  customUpload: { background: "#3b82f6", color: "white", border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer", display: "inline-block", marginTop: 10 },
  progressContainer: { width: "80%", backgroundColor: "#2A3B5C", borderRadius: 10, margin: "20px auto 0" },
  progressBar: { height: 10, backgroundColor: "#3b82f6", borderRadius: 10, transition: "width 1.5s ease-in-out" },
  fileName: { marginTop: 15, color: "#ccc", fontStyle: "italic" }
};

export default function Upload() {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [language, setLanguage] = useState(localStorage.getItem("language") || "ar");

  const toggleLanguage = () => {
    const newLang = language === "ar" ? "en" : "ar";
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const handleFileChange = async (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileName(file.name);
      setProgress(0);
      let progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => navigate("/results"), 500);
            return 100;
          }
          return prev + 10;
        });
      }, 150);
    }
  };
 return (
    <div style={styles.body}>
      <div style={styles.pageWrapper} className={language === 'ar' ? 'text-ar' : 'text-en'}>
        <div style={styles.navbar}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}><div style={styles.logoInner}></div></div>
            <span data-key="logo">{translations[language].logo}</span>
          </div>
          <button style={styles.langBtn} onClick={toggleLanguage}>
            {language === "ar" ? "English" : "العربية"}
          </button>
        </div>

        <div style={styles.headline}>

          <p data-key="subheadline">{translations[language].subheadline}</p>
        </div>

        <div style={styles.uploadBox}>
          <p data-key="drop_text">{translations[language].drop_text}</p>
          <label style={styles.customUpload}>
            <span data-key="choose_file">{translations[language].choose_file}</span>
            <input type="file" accept=".pdf,.pptx" onChange={handleFileChange} style={{ display: "none" }} />
          </label>
          <p style={styles.fileName}>{fileName}</p>
          {progress > 0 && (
            <div style={styles.progressContainer}>
              <div style={{ ...styles.progressBar, width: `${progress}%` }}></div>
            </div>
          )}
          {progress > 0 && progress < 100 && <p data-key="uploading">{translations[language].uploading}</p>}
        </div>

        {/* --- هذا هو قسم الميزات (المكان الصحيح) --- */}
        <div className="features-container">
            <div className="feature-box">
                <h3 data-key="feature1_title">{translations[language].feature1_title}</h3>
                <p className="feature-subtitle" data-key="feature1_subtitle">{translations[language].feature1_subtitle}</p>
                <p className="feature-description" data-key="feature1_desc">
                    {translations[language].feature1_desc}
                </p>
            </div>
            <div className="feature-box">
                <h3 data-key="feature2_title">{translations[language].feature2_title}</h3>
                <p className="feature-subtitle" data-key="feature2_subtitle">{translations[language].feature2_subtitle}</p>
                <p className="feature-description" data-key="feature2_desc">
                    {translations[language].feature2_desc}
                </p>
            </div>
            <div className="feature-box">
                <h3 data-key="feature3_title">{translations[language].feature3_title}</h3>
                <p className="feature-subtitle" data-key="feature3_subtitle">{translations[language].feature3_subtitle}</p>
                <p className="feature-description" data-key="feature3_desc">
                    {translations[language].feature3_desc}
                </p>
            </div>
        </div>
        {/* --- نهاية قسم الميزات --- */}

      </div>
      <Footer language={language} /> {/* <-- إضافة الفوتر هنا */}
    </div>
  );
}

