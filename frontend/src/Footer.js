import React from "react";
import { Link } from "react-router-dom";

const translations = {
  ar: {
    team: "فريق الذكاء الاصطناعي بنادي إنجاز",
    university: "جامعة الإمام محمد بن سعود الإسلامية",
    message: "طلبة طموحون يسعون لتوظيف الذكاء الاصطناعي لخدمة المعرفة.",
    about_us: "عن الفريق",
    faq: "أسئلة شائعة",
  },
  en: {
    team: "Enjaz Club - AI Team",
    university: "Imam Muhammad ibn Saud Islamic University",
    message: "Ambitious students leveraging AI to serve knowledge.",
    about_us: "About The Team",
    faq: "FAQ",
  },
};

export default function Footer({ language }) {
  const t = translations[language] || translations.ar;
  return (
    <footer className="foot">
      <div className="container">
        <p>
          <b>{language === "ar" ? "إيضاح" : "Eidaah"}</b> · {t.team} @ {t.university}
        </p>
        <p>
          <em>{t.message}</em>
        </p>
        <p>
          <Link to="/about">{t.about_us}</Link> · <Link to="/faq">{t.faq}</Link>
        </p>
      </div>
    </footer>
  );
}