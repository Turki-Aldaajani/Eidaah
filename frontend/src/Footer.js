import React from 'react';
import { useNavigate } from 'react-router-dom';

// التنسيقات (نفسها)
const footerStyle = {
  width: '100%',
  maxWidth: 900,
  margin: '40px auto 0',
  padding: '30px 48px',
  backgroundColor: '#2a2f3a',
  borderRadius: '24px',
  textAlign: 'center',
  color: '#808080',
  fontSize: '14px',
  boxSizing: 'border-box'
};
const logoStyle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: 'white',
  marginBottom: '15px'
};
const linkStyle = {
  color: '#3b82f6',
  textDecoration: 'none',
  margin: '0 10px',
  cursor: 'pointer'
};

export default function Footer({ language }) {
  const navigate = useNavigate();
  const isArabic = language === 'ar';

  const translations = {
    ar: {
      team: "فريق الذكاء الاصطناعي بنادي إنجاز",
      university: "جامعة الإمام محمد بن سعود الإسلامية",
      message: "طلبة طموحون يسعون لتوظيف الذكاء الاصطناعي لخدمة المعرفة.",
      about_us: "عن الفريق", // <-- تم التعديل هنا
      faq: "أسئلة شائعة"
    },
    en: {
      team: "Enjaz Club - AI Team",
      university: "Imam Muhammad ibn Saud Islamic University",
      message: "Ambitious students leveraging AI to serve knowledge.",
      about_us: "About The Team", // <-- تم التعديل هنا
      faq: "FAQ"
    }
  };

  return (
    <footer style={footerStyle} className={isArabic ? 'text-ar' : 'text-en'}>
      <div style={logoStyle}>{isArabic ? "إيضاح" : "SlideAI"}</div>
      <p>{translations[language].team} @ {translations[language].university}</p>
      <p><em>{translations[language].message}</em></p>
      <div>
        <span style={linkStyle} onClick={() => navigate('/about')}>
          {translations[language].about_us}
        </span>
        <span style={linkStyle} onClick={() => navigate('/faq')}>
          {translations[language].faq}
        </span>
      </div>
    </footer>
  );
}