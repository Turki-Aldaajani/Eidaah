import React from 'react';
import { Link } from 'react-router-dom';
import TopNav from './components/TopNav';
import Icon from './components/Icon';
import Footer from './Footer';
import { useLanguage } from './i18n/LanguageContext';

const team = {
  ar: {
    aiNlp: { name: "ريان الحربي", role: "مهندس AI/NLP" },
    projectManager: { name: "تركي الدعجاني", role: "مدير المشروع" },
    backend: { name: "عبدالعزيز الضيف", role: "الواجهة الخلفية (Backend)" },
    ui_ux: [
      { name: "ليان القباني", role: "تصميم الواجهة (UI/UX)" },
      { name: "ناهد المطيري", role: "تصميم الواجهة (UI/UX)" }
    ]
  },
  en: {
    aiNlp: { name: "Rayan Al-Harbi", role: "AI/NLP Engineer" },
    projectManager: { name: "Turki Al-Dajani", role: "Project Manager" },
    backend: { name: "Abdulaziz Al-Dhaif", role: "Backend" },
    ui_ux: [
      { name: "Layan Al-Qabbani", role: "UI/UX Design" },
      { name: "Nahid Al-Mutairi", role: "UI/UX Design" }
    ]
  }
};

const staticTranslations = {
  ar: { page_title: "فريق عمل إيضاح", ui_title: "تصميم الواجهة (UI/UX)", home: "الرئيسية" },
  en: { page_title: "The Eidaah Team", ui_title: "UI/UX Design", home: "Home" }
};

export default function About() {
  const { language, toggleLanguage } = useLanguage();

  const currentTeam = team[language];
  const t = staticTranslations[language];

  const groups = [
    { role: currentTeam.aiNlp.role, icon: "atom", members: [currentTeam.aiNlp.name] },
    { role: currentTeam.projectManager.role, icon: "sparkles", members: [currentTeam.projectManager.name] },
    { role: currentTeam.backend.role, icon: "server", members: [currentTeam.backend.name] },
    { role: t.ui_title, icon: "pen", members: currentTeam.ui_ux.map((m) => m.name) },
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
      <Footer />
    </>
  );
}
