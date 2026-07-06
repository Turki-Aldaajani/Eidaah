import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from './components/TopNav';
import Icon from './components/Icon';

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
  ar: { page_title: "فريق عمل إيضاح", ui_title: "تصميم الواجهة (UI/UX)", fe_title: "الواجهة الأمامية (Frontend)", be_title: "الواجهة الخلفية (Backend)", ai_title: "الذكاء الاصطناعي (AI/NLP)", home: "الرئيسية" },
  en: { page_title: "The Eidaah Team", ui_title: "UI/UX Design", fe_title: "Frontend", be_title: "Backend", ai_title: "AI/NLP", home: "Home" }
};

export default function About() {
  const [language, setLanguage] = useState(localStorage.getItem("language") || "ar");

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const currentTeam = team[language];
  const t = staticTranslations[language];

  const groups = [
    { role: currentTeam.clubLead.role, icon: "crown", members: [currentTeam.clubLead.name] },
    { role: currentTeam.projectManager.role, icon: "sparkles", members: [currentTeam.projectManager.name] },
    { role: currentTeam.teamLead.role, icon: "sparkles", members: [currentTeam.teamLead.name] },
    { role: t.ui_title, icon: "pen", members: currentTeam.ui_ux.map((m) => m.name) },
    { role: t.fe_title, icon: "code", members: currentTeam.frontend.map((m) => m.name) },
    { role: t.be_title, icon: "server", members: currentTeam.backend.map((m) => m.name) },
    { role: t.ai_title, icon: "atom", members: currentTeam.ai_nlp.map((m) => m.name) },
    { role: currentTeam.qa.role, icon: "shield", members: [currentTeam.qa.name] },
  ];

  return (
    <>
      <TopNav />
      <section className="view view-about">
        <div className="container">
          <div className="page-head">
            <nav className="crumbs">
              <Link to="/">{t.home}</Link>
              <i className="sep">‹</i>
              <span className="cur">{t.page_title}</span>
            </nav>
            <h1>
              <span className="h-ic" style={{ "--c": "var(--pri)" }}>
                <Icon name="users" />
              </span>
              {t.page_title}
            </h1>
            <button type="button" className="btn ghost" onClick={toggleLanguage}>
              {language === "ar" ? "English" : "العربية"}
            </button>
          </div>

          <div className="tm-wrap">
            {groups.map((g) => (
              <section className="tm-group" key={g.role}>
                <div className="tm-role">
                  <span className="tm-role-ic">
                    <Icon name={g.icon} />
                  </span>
                  <h3>{g.role}</h3>
                </div>
                <div className={`tm-cards${g.members.length === 1 ? " solo" : ""}`}>
                  {g.members.map((name) => (
                    <div className="tm-card" key={name}>
                      <span className="tm-ava">{name.trim().charAt(0)}</span>
                      <b className="tm-name">{name}</b>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
