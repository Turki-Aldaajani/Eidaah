import Footer from '../Footer'; // <-- هذا هو الصحيح
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const staticTranslations = {
  ar: {
    logo: "إيضاح",
    back_button: "← رجوع",
    slide_1: "شريحة 1",
    slide_2: "شريحة 2",
    slide_3: "شريحة 3",
    enhance_slide: "تحسين الشريحة",
    analytical_explanation: "شرح تحليلي:",
    real_world_example: "مثال واقعي:",
    summarize: "تلخيص",
    improve: "تحسين",
  },
  en: {
    logo: "SlideAI",
    back_button: "← Back",
    slide_1: "Slide 1",
    slide_2: "Slide 2",
    slide_3: "Slide 3",
    enhance_slide: "Enhance Slide",
    analytical_explanation: "Analytical Explanation:",
    real_world_example: "Real-World Example:",
    summarize: "Summarize",
    improve: "Improve",
  },
};

const slideData = [
  {
    title: { ar: "مشاكل نموذج الشلال", en: "Waterfall model problems" },
    text: { ar: "التقسيم غير المرن للمشروع إلى مراحل مميزة يجعل من الصعب الاستجابة لمتطلبات العملاء المتغيرة.", en: "Inflexible partitioning of the project into distinct stages makes it difficult to respond to changing customer requirements." },
    explanation: { ar: "يتبع نموذج الشلال نهجًا خطيًا متسلسلًا حيث يجب إكمال كل مرحلة قبل أن تبدأ المرحلة التالية. هذه البنية الصلبة تخلق تحديات كبيرة في تطوير البرمجيات الحديثة.", en: "The waterfall model follows a sequential, linear approach where each phase must be completed before the next begins. This rigid structure creates significant challenges in modern software development." },
    example: { ar: "لنتخيل مشروع تطبيق بنكي. بعد 6 أشهر من التطوير، يقدم المنظمون متطلبات امتثال جديدة. مع نموذج الشلال، يجب على الفريق إيقاف التقدم وإعادة البدء.", en: "Consider a banking application project. After 6 months of development, regulators introduce new compliance requirements. With the waterfall model, the team must halt progress and restart." },
  },
  {
    title: { ar: "فوائد التطوير الرشيق (Agile)", en: "Agile Development Benefits" },
    text: { ar: "تعزز منهجيات Agile التخطيط التكيفي، والتطوير التطوري، والتسليم المبكر، والتحسين المستمر.", en: "Agile methodologies promote adaptive planning, evolutionary development, early delivery, and continual improvement." },
    explanation: { ar: "على عكس الشلال، فإن Agile تكراري. يجزئ المشروع إلى سباقات قصيرة يمكن إدارتها، مما يسمح بإعادة التقييم والتكيف بشكل متكرر.", en: "Unlike Waterfall, Agile is iterative. It breaks down the project into small, manageable sprints, allowing for frequent reassessment and adaptation." },
    example: { ar: "باستخدام نفس سيناريو التطبيق البنكي، سيسمع فريق Agile بقواعد الامتثال الجديدة في نهاية سباق مدته أسبوعان ويمكنه على الفور تحديد الأولويات ودمج التغييرات في السباق التالي.", en: "Using the same banking app scenario, an Agile team would hear about the new compliance rules at the end of a two-week sprint and could immediately prioritize and incorporate the changes in the next sprint." },
  },
  {
    title: { ar: "ما هو سكروم؟", en: "What is Scrum?" },
    text: { ar: "سكروم هو إطار عمل يساعد الفرق على العمل معًا. ويشجع الفرق على التعلم من خلال التجارب، والتنظيم الذاتي أثناء العمل على مشكلة ما.", en: "Scrum is a framework that helps teams work together. It encourages teams to learn through experiences, self-organize while working on a problem." },
    explanation: { ar: "سكروم هو أحد أكثر تطبيقات Agile شيوعًا. يستخدم أدوارًا وأحداثًا محددة لزيادة الكفاءة.", en: "Scrum is one of the most popular implementations of Agile. It uses specific roles and events to maximize efficiency." },
    example: { ar: "فريق يقوم ببناء ميزة جديدة لموقع تجارة إلكترونية يستخدم اجتماع سكروم اليومي لمناقشة التقدم وتحديد العقبات.", en: "A team building a new feature for an e-commerce website uses a daily Scrum meeting to discuss progress and identify obstacles." },
  },
];

const styles = {
  body: { backgroundColor: "#0a0f1c", color: "#E0E0E0", fontFamily: "'Cairo', sans-serif", margin: 0, padding: 40, minHeight: "100vh" },
  pageWrapper: { backgroundColor: "#2a2f3a", borderRadius: 24, padding: 48, maxWidth: 1200, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoIcon: { width: 40, height: 40, backgroundColor: "#3b82f6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  logoInner: { width: 24, height: 24, border: "2px solid white", borderRadius: "50%" },
  headerControls: { display: "flex", gap: 15, alignItems: "center" },
  backBtn: { background: "none", border: "1px solid #4A5568", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" },
  langBtn: { backgroundColor: "#2A3B5C", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" },
  mainContainer: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 32 },
  leftColumn: { backgroundColor: "#1e2d42", padding: 32, borderRadius: 16 },
  rightColumn: { backgroundColor: "#1e2d42", padding: 32, borderRadius: 16 },
  slideThumbnails: { display: "flex", gap: 10, marginBottom: 20 },
  explanationBox: { backgroundColor: "#0B101B", padding: 15, borderRadius: 8 },
  actionButtons: { display: "flex", gap: 10, marginTop: 15 },
  dummyText: { marginTop: 10, padding: 10, backgroundColor: "#1e2d42", borderRadius: 8, fontStyle: "italic" },
};

export default function Results() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(localStorage.getItem("language") || "ar");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [summaryText, setSummaryText] = useState("");
  const [improvedText, setImprovedText] = useState("");

  const toggleLanguage = () => {
    const newLang = language === "ar" ? "en" : "ar";
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const handleSummarize = () => setSummaryText("هذا نص ملخص مؤقت");
  const handleImprove = () => setImprovedText("هذا نص محسّن مؤقت");

return (
    <>
      <div style={styles.body}>
        <div style={styles.pageWrapper} className={language === 'ar' ? 'text-ar' : 'text-en'}>
          <div style={styles.header}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}><div style={styles.logoInner}></div></div>
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
            <div style={styles.leftColumn}>
              <div style={styles.slideThumbnails}>
                {slideData.map((slide, index) => (
                  <button
                    key={index}
                    style={{
                      backgroundColor: currentSlide === index ? "#007BFF" : "#2A3B5C",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                    onClick={() => setCurrentSlide(index)}
                  >
                    {staticTranslations[language][`slide_${index + 1}`]}
                  </button>
                ))}
              </div>

              <div>
                <h2>{slideData[currentSlide].title[language]}</h2>
                <p>{slideData[currentSlide].text[language]}</p>

                <div style={styles.actionButtons}>
                  <button onClick={handleSummarize} className="action-btn">
                    {staticTranslations[language].summarize}
                  </button>
                  <button onClick={handleImprove} className="action-btn">
                    {staticTranslations[language].improve}
                  </button>
                </div>

                {summaryText && <div style={styles.dummyText}>{summaryText}</div>}
                {improvedText && <div style={styles.dummyText}>{improvedText}</div>}
              </div>
            </div>

            <div style={styles.rightColumn}>
              <h2>{staticTranslations[language].enhance_slide}</h2>
              <div style={styles.explanationBox}>
                <h3>{staticTranslations[language].analytical_explanation}</h3>
                <p>{slideData[currentSlide].explanation[language]}</p>
                <h3>{staticTranslations[language].real_world_example}</h3>
                <p>{slideData[currentSlide].example[language]}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer language={language} />

    </>
  );
}
