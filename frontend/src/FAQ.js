import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from './components/TopNav';
import Icon from './components/Icon';
import Footer from './Footer';
import { useLanguage } from './i18n/LanguageContext';

const SUPPORT_EMAIL = "eidaah.team@gmail.com";

const faqData = {
  ar: {
    project: [
      { q: "ما هو مشروع إيضاح؟", a: "إيضاح هو منصة تعليمية ذكية تعتمد على الذكاء الاصطناعي لمساعدة طلاب التعليم العام في المملكة العربية السعودية على فهم المناهج الدراسية بسهولة، من خلال اقتراح أفضل الشروحات وربطها بمساعد ذكي يقدم ملخصات، وأمثلة، وملاحظات للمذاكرة، واختبارات تفاعلية." },
      { q: "ما الهدف الرئيسي من المشروع؟", a: "تسهيل الوصول إلى أفضل مصادر تعلم المنهج السعودي، وتحويل مشاهدة الشروحات إلى تجربة تعلم تفاعلية وشخصية مدعومة بالذكاء الاصطناعي." }
    ],
    features: [
      { q: "ما هي الميزات الحالية؟", a: "يوفر إيضاح حالياً: تصفح المنهج من المرحلة حتى الدرس، واقتراح أفضل الشروحات من قنوات متنوعة مع فلاتر ذكية، ومساعداً ذكياً لكل درس يقدم تلخيصاً، وشرحاً بمثال من الواقع، وملاحظات للمذاكرة، واختباراً تفاعلياً بتصحيح فوري، إضافة إلى متابعة تقدمك في الدرس." },
      { q: "ما هي المميزات القادمة؟", a: "نعمل على توصيات أكثر دقة مبنية على مستوى الطالب، وخطط مذاكرة شخصية، وتتبّع للتقدم عبر المواد، ولوحة أداء للمعلم وولي الأمر، ودعم مزيد من الصفوف والمواد تدريجياً." }
    ],
    support: [
      { q: "هل الموقع مجاني؟", a: "نعم، المشروع حالياً مجاني بالكامل كونه مبادرة طلابية." },
      { q: "هل بياناتي آمنة؟", a: "نحترم خصوصية المستخدمين، ولا يتم الاحتفاظ بالبيانات الشخصية أو استخدامها خارج نطاق تشغيل الخدمة." },
      { q: "وجدت مشكلة، كيف أبلغ عنها؟", a: "يسعدنا تواصلك معنا عبر البريد أدناه، وسنعمل على معالجة الملاحظة في أقرب وقت.", mail: SUPPORT_EMAIL }
    ]
  },
  en: {
    project: [
      { q: "What is Eidaah?", a: "Eidaah is a smart, AI-powered learning platform that helps K-12 students in Saudi Arabia understand their curriculum with ease, by surfacing the best explanations and pairing them with an AI assistant that provides summaries, real-world examples, study notes, and interactive quizzes." },
      { q: "What is the main goal?", a: "To make the best learning resources for the Saudi curriculum easy to reach, and turn watching explanations into an interactive, personalized, AI-powered learning experience." }
    ],
    features: [
      { q: "What are the current features?", a: "Eidaah currently offers: browsing the curriculum from stage to lesson, recommending the best explanations from a variety of channels with smart filters, an AI assistant for every lesson that provides a summary, a real-world example, study notes, and an interactive quiz with instant grading, plus tracking your progress within the lesson." },
      { q: "What features are coming next?", a: "We're working on more accurate recommendations based on the student's level, personal study plans, progress tracking across subjects, a performance dashboard for teachers and parents, and gradually expanding support to more grades and subjects." }
    ],
    support: [
      { q: "Is this site free?", a: "Yes, as a student-led initiative, the project is currently completely free." },
      { q: "Is my data secure?", a: "We respect our users' privacy, and personal data is never retained or used beyond operating the service." },
      { q: "I found a bug, how do I report it?", a: "We'd love to hear from you at the email below, and we'll work on addressing it as soon as possible.", mail: SUPPORT_EMAIL }
    ]
  }
};

const staticTranslations = {
  ar: { page_title: "الأسئلة الشائعة", cat_project: "التعريف بالمشروع", cat_features: "الاستخدام والمميزات", cat_support: "الدعم الفني", home: "الرئيسية" },
  en: { page_title: "Frequently Asked Questions", cat_project: "About The Project", cat_features: "Usage & Features", cat_support: "Support", home: "Home" }
};

export default function FAQ() {
  const { language, toggleLanguage } = useLanguage();
  const [openKey, setOpenKey] = useState(null);

  const toggleFAQ = (key) => setOpenKey((prev) => (prev === key ? null : key));

  const t = staticTranslations[language];
  const data = faqData[language];

  const sections = [
    { key: "project", title: t.cat_project, items: data.project },
    { key: "features", title: t.cat_features, items: data.features },
    { key: "support", title: t.cat_support, items: data.support },
  ];

  return (
    <>
      <TopNav />
      <section className="view view-faq">
        <div className="container faq-container">
          <div className="page-head">
            <nav className="crumbs">
              <Link to="/">{t.home}</Link>
              <i className="sep">‹</i>
              <span className="cur">{t.page_title}</span>
            </nav>
            <h1>
              <span className="h-ic" style={{ "--c": "var(--pri)" }}>
                <Icon name="help" />
              </span>
              {t.page_title}
            </h1>
            <button type="button" className="btn ghost" onClick={toggleLanguage}>
              {language === "ar" ? "English" : "العربية"}
            </button>
          </div>

          {sections.map((sec) => (
            <section className="faq-sec" key={sec.key}>
              <h2 className="faq-sec-t">{sec.title}</h2>
              <div className="faq-list">
                {sec.items.map((item, i) => {
                  const itemKey = `${sec.key}-${i}`;
                  const isOpen = openKey === itemKey;
                  return (
                    <div className={`faq-item${isOpen ? " open" : ""}`} key={itemKey}>
                      <button type="button" className="faq-q" onClick={() => toggleFAQ(itemKey)}>
                        <span>{item.q}</span>
                        <span className="faq-chev">
                          <Icon name="chev" />
                        </span>
                      </button>
                      <div className="faq-a">
                        <div className="faq-a-in">
                          <p>{item.a}</p>
                          {item.mail && (
                            <a className="faq-mail" href={`mailto:${item.mail}`}>
                              <Icon name="mail" /> {item.mail}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
}
