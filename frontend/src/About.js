import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import './App.css';

// --- تنسيقات جديدة بالكامل ---
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

  // تنسيقات الشبكة الجديدة
  teamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', // شبكة متجاوبة
    gap: '20px',
    textAlign: 'center'
  },
  teamSection: {
    backgroundColor: '#1e2d42',
    padding: '25px',
    borderRadius: '12px'
  },
  teamTitle: {
    color: '#3b82f6',
    fontSize: '20px',
    marginTop: '0',
    marginBottom: '15px'
  },
  teamList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  teamMember: {
    fontSize: '17px',
    margin: '8px 0',
    color: '#E0E0E0'
  },
  teamRole: {
    color: '#808080',
    fontSize: '13px'
  }
};

// ... بيانات الفريق (نفسها) ...
const team = {
  ar: {
    clubLead: { name: "ليان المطيويع", role: "قائدة نادي إنجاز" },
    projectManager: { name: "تركي الدعجاني", role: "مدير المشروع وصاحب الفكرة" },
    teamLead: { name: "ريان الحربي", role: "قائد الفريق ومهندس AI/NLP" },
    ui_ux: [
      { name: "ناهد المطيري", role: "تصميم واجهة المستخدم (UI/UX)" },
      { name: "ليان القباني", role: "تصميم واجهة المستخدم (UI/UX)" }
    ],
    frontend: [
      { name: "عبدالعزيز الضيف", role: "الواجهة الأمامية (Frontend)" },
      { name: "رسيل الصمعاني", role: "الواجهة الأمامية (Frontend)" }
    ],
    backend: [
      { name: "عبدالعزيز القحطاني", role: "الواجهة الخلفية (Backend)" },
      { name: "سلطان الراجح", role: "الواجهة الخلفية (Backend)" }
    ],
    ai_nlp: [
      { name: "زياد المنيف", role: "الذكاء الاصطناعي (AI/NLP)" },
      { name: "ياسر الشريف", role: "الذكاء الاصطناعي (AI/NLP)" }
    ],
    qa: { name: "فيصل التويجري", role: "اختبار الجودة (QA)" }
  },
  en: {
    // ... (الترجمة الإنجليزية) ...
    clubLead: { name: "Layan Al-Mutaiwie", role: "Enjaz Club Leader" },
    projectManager: { name: "Turki Al-Dajani", role: "Project Manager (Initiator)" },
    teamLead: { name: "Rayan Al-Harbi", role: "Team Lead & AI/NLP Engineer" },
    ui_ux: [
      { name: "Nahid Al-Mutairi", role: "UI/UX Design" },
      { name: "Layan Al-Qabbani", role: "UI/UX Design" }
    ],
    frontend: [
      { name: "Abdulaziz Al-Dhaif", role: "Frontend Developer" },
      { name: "Raseel Al-Samaani", role: "Frontend Developer" }
    ],
    backend: [
      { name: "Abdulaziz Al-Qahtani", role: "Backend Developer" },
      { name: "Sultan Al-Rajeh", role: "Backend Developer" },
    ],
    ai_nlp: [
      { name: "Ziyad Al-Muneef", role: "AI/NLP Engineer" },
      { name: "Yasser Al-Shareef", role: "AI/NLP Engineer" }
    ],
    qa: { name: "Faisal Al-Tuwaijri", role: "QA Tester" }
  }
};

const staticTranslations = {
  ar: { logo: "إيضاح", back_button: "← رجوع", page_title: "فريق عمل إيضاح", ui_title: "تصميم الواجهة (UI/UX)", fe_title: "الواجهة الأمامية (Frontend)", be_title: "الواجهة الخلفية (Backend)", ai_title: "الذكاء الاصطناعي (AI/NLP)" },
  en: { logo: "SlideAI", back_button: "← Back", page_title: "The Eidaah Team", ui_title: "UI/UX Design", fe_title: "Frontend", be_title: "Backend", ai_title: "AI/NLP" }
};

export default function About() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(localStorage.getItem("language") || "ar");

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const currentTeam = team[language];
  const currentStatic = staticTranslations[language];

  return (
    <div style={styles.body}>
      <div style={styles.pageWrapper} className={language === 'ar' ? 'text-ar' : 'text-en'}>
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

        {/* --- الهيكل الجديد للشبكة --- */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: 'white' }}>{currentStatic.page_title}</h1>
        </div>

        <div style={styles.teamGrid}>
          <div style={styles.teamSection}>
            <h2 style={styles.teamTitle}>{currentTeam.clubLead.role}</h2>
            <ul style={styles.teamList}><li style={styles.teamMember}>{currentTeam.clubLead.name}</li></ul>
          </div>

          <div style={styles.teamSection}>
            <h2 style={styles.teamTitle}>{currentTeam.projectManager.role}</h2>
            <ul style={styles.teamList}><li style={styles.teamMember}>{currentTeam.projectManager.name}</li></ul>
          </div>

          <div style={styles.teamSection}>
            <h2 style={styles.teamTitle}>{currentTeam.teamLead.role}</h2>
            <ul style={styles.teamList}><li style={styles.teamMember}>{currentTeam.teamLead.name}</li></ul>
          </div>

          <div style={styles.teamSection}>
            <h2 style={styles.teamTitle}>{currentStatic.ui_title}</h2>
            <ul style={styles.teamList}>
              {currentTeam.ui_ux.map(m => <li key={m.name} style={styles.teamMember}>{m.name}</li>)}
            </ul>
          </div>

          <div style={styles.teamSection}>
            <h2 style={styles.teamTitle}>{currentStatic.fe_title}</h2>
            <ul style={styles.teamList}>
              {currentTeam.frontend.map(m => <li key={m.name} style={styles.teamMember}>{m.name}</li>)}
            </ul>
          </div>

          <div style={styles.teamSection}>
            <h2 style={styles.teamTitle}>{currentStatic.be_title}</h2>
            <ul style={styles.teamList}>
              {currentTeam.backend.map(m => <li key={m.name} style={styles.teamMember}>{m.name}</li>)}
            </ul>
          </div>

          <div style={styles.teamSection}>
            <h2 style={styles.teamTitle}>{currentStatic.ai_title}</h2>
            <ul style={styles.teamList}>
              {currentTeam.ai_nlp.map(m => <li key={m.name} style={styles.teamMember}>{m.name}</li>)}
            </ul>
          </div>

          <div style={styles.teamSection}>
            <h2 style={styles.teamTitle}>{currentTeam.qa.role}</h2>
            <ul style={styles.teamList}><li style={styles.teamMember}>{currentTeam.qa.name}</li></ul>
          </div>
        </div>
        {/* --- نهاية الشبكة --- */}

      </div>
      <Footer language={language} />
    </div>
  );
}