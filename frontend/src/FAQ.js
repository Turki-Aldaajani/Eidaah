import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import './App.css';

// بيانات الأسئلة والأجوبة (النسخة الكاملة)
const faqData = {
  ar: {
    project: [
      { q: "ما هو مشروع إيضاح؟", a: "إيضاح هو أداة ذكية لتحليل العروض التقديمية باستخدام الذكاء الاصطناعي، بهدف تسهيل الفهم على الطلاب ودعم المقدمين." },
      { q: "ما الهدف الرئيسي من المشروع؟", a: "الهدف هو جعل المحتوى التعليمي أكثر وضوحًا وسهولة، ومساعدة المقدمين على شرح أفكارهم بفعالية أكبر." }
    ],
    features: [
      { q: "ما هي الميزات الحالية؟", a: "النسخة الحالية تركز على تقديم شرح تحليلي للمحتوى مع أمثلة واقعية." },
      { q: "ما هي صيغ الملفات المدعومة؟", a: "يدعم الموقع حاليًا ملفات PDF و PPTX." },
      { q: "ما هي الميزات القادمة؟", a: "نخطط لإضافة ميزات مثل تلخيص الشرائح، إنشاء أسئلة للمراجعة، وتوليد ملاحظات للمتحدث." }
    ],
    support: [
      { q: "هل الموقع مجاني؟", a: "نعم، المشروع حاليًا مجاني بالكامل كونه مبادرة طلابية." },
      { q: "هل ملفاتي آمنة؟", a: "نحن نحترم خصوصيتك. يتم تحليل الملفات ثم حذفها من خوادمنا ولا يتم تخزينها." },
      { q: "وجدت مشكلة، كيف أبلغ عنها؟", a: "نسعد بتواصلك معنا عبر (ضع هنا إيميل أو رابط)." }
    ]
  },
  en: {
    project: [
      { q: "What is Eidaah?", a: "Eidaah is an intelligent tool for analyzing presentations using AI, aiming to simplify understanding for students and support presenters." },
      { q: "What is the main goal?", a: "The goal is to make educational content clearer and more accessible, helping presenters explain their ideas effectively." }
    ],
    features: [
      { q: "What are the current features?", a: "The current version focuses on providing analytical explanations of content with real-world examples." },
      { q: "What file formats are supported?", a: "The site currently supports PDF and PPTX files." },
      { q: "What are the upcoming features?", a: "We plan to add features like summarization, review question generation, and speaker notes." }
    ],
    support: [
      { q: "Is this site free?", a: "Yes, as a student-led initiative, the project is currently completely free." },
      { q: "Is my data secure?", a: "We respect your privacy. Files are analyzed and then deleted from our servers; they are not stored." },
      { q: "I found a bug, how do I report it?", a: "We appreciate your feedback! Please contact us at (insert email or link here)." }
    ]
  }
};

// التنسيقات (مع إصلاح العناوين وتسريب النص)
const styles = {
  body: { background: "#0a0f1c", color: "white", fontFamily: "'Cairo', sans-serif", margin: 0, padding: 40, minHeight: "100vh" },
  pageWrapper: { backgroundColor: "#2a2f3a", borderRadius: 24, padding: 48, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", width: "100%", maxWidth: 900, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoIcon: { width: 40, height: 40, backgroundColor: "#3b82f6", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center" },
  logoInner: { width: 24, height: 24, border: "2px solid white", borderRadius: "50%" },
  headerControls: { display: "flex", gap: 15, alignItems: "center" },
  backBtn: { background: "none", border: "1px solid #4A5568", color: "white", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" },
  langBtn: { backgroundColor: "#2A3B5C", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" },
  content: { maxWidth: 800, margin: '0 auto' },
  categoryTitle: { // <-- هذا هو الكود الصحيح للعنوان
    color: '#3b82f6',
    fontSize: '22px',
    borderBottom: '2px solid #3b82f6',
    paddingBottom: '5px',
    marginTop: '30px'
    // تم حذف 'display: inline-block'
  },
  faqItem: { backgroundColor: '#1e2d42', borderRadius: '8px', margin: '10px 0', overflow: 'hidden' },
  faqQuestion: { padding: '15px 20px', cursor: 'pointer', fontWeight: 'bold' },
  faqAnswer: {
    color: '#ccc',
    transition: 'max-height 0.3s ease-out, padding 0.3s ease-out',
    overflow: 'hidden'
  }
};

const staticTranslations = {
  ar: { logo: "إيضاح", back_button: "← رجوع", page_title: "الأسئلة الشائعة", cat_project: "التعريف بالمشروع", cat_features: "الاستخدام والمميزات", cat_support: "الدعم الفني" },
  en: { logo: "SlideAI", back_button: "← Back", page_title: "Frequently Asked Questions", cat_project: "About The Project", cat_features: "Usage & Features", cat_support: "Support" }
};

export default function FAQ() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(localStorage.getItem("language") || "ar");
  const [openIndex, setOpenIndex] = useState(null);

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const currentStatic = staticTranslations[language];
  const currentData = faqData[language];
  const isArabic = language === 'ar';

  return (
    <div style={styles.body}>
      <div style={styles.pageWrapper} className={isArabic ? 'text-ar' : 'text-en'}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}><div style={styles.logoInner}></div></div>
            <span>{currentStatic.logo}</span>
          </div>
          <div style={styles.headerControls}>
            <button style={styles.backBtn} onClick={() => navigate("/")}>
              {currentStatic.back_button}
            </button>
            <button style={styles.langBtn} onClick={toggleLanguage}>
              {language === "ar" ? "English" : "العربية"}
            </button>
          </div>
        </div>

        <div style={styles.content} className={isArabic ? 'text-ar' : 'text-en'}>
          <h1 style={{ color: 'white', textAlign: 'center' }}>{currentStatic.page_title}</h1>

          {/* --- هذا هو الكود الصحيح للعنوان (بدون تنسيق inline) --- */}
<h2 style={{ ...styles.categoryTitle, textAlign: isArabic ? 'right' : 'left' }}>{currentStatic.cat_project}</h2>          {currentData.project.map((item, index) => (
            <div key={'p'+index} style={styles.faqItem}>
              <div style={styles.faqQuestion} onClick={() => toggleFAQ('p'+index)}>
                <span>{item.q}</span>
              </div>
              <div style={{
                ...styles.faqAnswer,
                maxHeight: openIndex === 'p'+index ? '100px' : '0',
                padding: openIndex === 'p'+index ? '0 20px 15px' : '0 20px'
              }}>{item.a}</div>
            </div>
          ))}

          {/* --- الكود الصحيح للعنوان الثاني --- */}
<h2 style={{ ...styles.categoryTitle, textAlign: isArabic ? 'right' : 'left' }}>{currentStatic.cat_features}</h2>          {currentData.features.map((item, index) => (
            <div key={'f'+index} style={styles.faqItem}>
              <div style={styles.faqQuestion} onClick={() => toggleFAQ('f'+index)}>
                <span>{item.q}</span>
              </div>
              <div style={{
                ...styles.faqAnswer,
                maxHeight: openIndex === 'f'+index ? '100px' : '0',
                padding: openIndex === 'f'+index ? '0 20px 15px' : '0 20px'
              }}>{item.a}</div>
            </div>
          ))}

          {/* --- الكود الصحيح للعنوان الثالث --- */}
<h2 style={{ ...styles.categoryTitle, textAlign: isArabic ? 'right' : 'left' }}>{currentStatic.cat_support}</h2>          {currentData.support.map((item, index) => (
            <div key={'s'+index} style={styles.faqItem}>
              <div style={styles.faqQuestion} onClick={() => toggleFAQ('s'+index)}>
                <span>{item.q}</span>
              </div>
              <div style={{
                ...styles.faqAnswer,
                maxHeight: openIndex === 's'+index ? '100px' : '0',
                padding: openIndex === 's'+index ? '0 20px 15px' : '0 20px'
              }}>{item.a}</div>
            </div>
          ))}

        </div>
      </div>
      <Footer language={language} />
    </div>
  );
}