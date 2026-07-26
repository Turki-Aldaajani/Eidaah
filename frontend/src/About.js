import React from 'react';
import { Link } from 'react-router-dom';
import TopNav from './components/TopNav';
import Icon from './components/Icon';
import Footer from './Footer';
import { useLanguage } from './i18n/LanguageContext';

const team = {
  ar: {
    aiNlp: { name: "ريان الحربي", role: "مهندس AI/NLP", linkedin: "https://www.linkedin.com/in/rayan-alharbi-b82s27/" },
    projectManager: { name: "تركي الدعجاني", role: "مدير المشروع", linkedin: "https://www.linkedin.com/in/turki-al-daajani-a0bb2a32b/" },
    backend: { name: "عبدالعزيز الضيف", role: "الواجهة الخلفية (Backend)", linkedin: "https://www.linkedin.com/in/abdulaziz-aldhaif-a09786218/" },
    ui_ux: [
      { name: "ليان القباني", role: "تصميم الواجهة (UI/UX)", linkedin: "https://sa.linkedin.com/in/layan-alqabbani-8b631729a" },
      { name: "ناهد المطيري", role: "تصميم الواجهة (UI/UX)", linkedin: "https://sa.linkedin.com/in/nahed-almutairi-b3559835b" }
    ]
  },
  en: {
    aiNlp: { name: "Rayan Al-Harbi", role: "AI/NLP Engineer", linkedin: "https://www.linkedin.com/in/rayan-alharbi-b82s27/" },
    projectManager: { name: "Turki Al-Dajani", role: "Project Manager", linkedin: "https://www.linkedin.com/in/turki-al-daajani-a0bb2a32b/" },
    backend: { name: "Abdulaziz Al-Dhaif", role: "Backend", linkedin: "https://www.linkedin.com/in/abdulaziz-aldhaif-a09786218/" },
    ui_ux: [
      { name: "Layan Al-Qabbani", role: "UI/UX Design", linkedin: "https://sa.linkedin.com/in/layan-alqabbani-8b631729a" },
      { name: "Nahid Al-Mutairi", role: "UI/UX Design", linkedin: "https://sa.linkedin.com/in/nahed-almutairi-b3559835b" }
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
    { role: currentTeam.aiNlp.role, icon: "atom", members: [currentTeam.aiNlp] },
    { role: currentTeam.projectManager.role, icon: "sparkles", members: [currentTeam.projectManager] },
    { role: currentTeam.backend.role, icon: "server", members: [currentTeam.backend] },
    { role: t.ui_title, icon: "pen", members: currentTeam.ui_ux },
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
                  {g.members.map((m) => (
                    <div className="tm-card" key={m.name}>
                      <span className="tm-ava">{m.name.trim().charAt(0)}</span>
                      <b className="tm-name">{m.name}</b>
                      {m.linkedin && (
                        <a
                          className="tm-linkedin"
                          href={m.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${m.name} - LinkedIn`}
                        >
                          <Icon name="linkedin" filled />
                        </a>
                      )}
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
