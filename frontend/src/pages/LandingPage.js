import React from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import Icon from "../components/Icon";

export default function LandingPage() {
  return (
    <>
      <TopNav />
      <section className="view view-landing">
        <div className="hero">
          <div className="container hero-in anim">
            <span className="hero-kicker">
              <Icon name="sparkles" /> منصة تعلّم بالذكاء الاصطناعي
            </span>
            <h1 className="hero-title">
              كيف تحب أن <span className="hl">تتعلّم اليوم؟</span>
            </h1>
            <p className="hero-sub">اختر الطريقة التي تناسبك — منهج جاهز أو ملفك الخاص</p>
          </div>
        </div>
        <div className="container" style={{ paddingBottom: 80 }}>
          <div className="entry-grid">
            <Link to="/learn" className="entry-card anim">
              <span className="entry-ic">
                <Icon name="grad-cap" />
              </span>
              <h3>المناهج التعليمية</h3>
              <p>تصفّح مراحلك الدراسية ومواد المنهج السعودي، وذاكر كل درس بمساعدة الذكاء الاصطناعي</p>
              <span className="entry-tag">١٢ صفاً دراسياً</span>
            </Link>
            <Link to="/analyze" className="entry-card alt anim">
              <span className="entry-ic">
                <Icon name="file-text" />
              </span>
              <h3>حلّل ملفاتك التعليمية</h3>
              <p>ارفع عرضك التقديمي أو ملف PDF، ودع الذكاء الاصطناعي يشرح لك شريحة بشريحة</p>
              <span className="entry-tag">PDF / PPTX</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
