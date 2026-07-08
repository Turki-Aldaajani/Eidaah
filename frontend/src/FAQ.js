import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from './components/TopNav';
import Icon from './components/Icon';
import Footer from './Footer';

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

const staticTranslations = {
  ar: { page_title: "الأسئلة الشائعة", cat_project: "التعريف بالمشروع", cat_features: "الاستخدام والمميزات", cat_support: "الدعم الفني", home: "الرئيسية" },
  en: { page_title: "Frequently Asked Questions", cat_project: "About The Project", cat_features: "Usage & Features", cat_support: "Support", home: "Home" }
};

export default function FAQ() {
  const [language, setLanguage] = useState(localStorage.getItem("language") || "ar");
  const [openKey, setOpenKey] = useState(null);

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

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
