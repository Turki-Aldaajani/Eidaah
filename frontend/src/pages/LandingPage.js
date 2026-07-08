import React from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import Icon from "../components/Icon";
import Footer from "../Footer";

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
              تعلّم <span className="hl">بذكاء</span>، وافهم المنهج بطريقة أوضح.
            </h1>
            <p className="hero-sub">
              منصة تعليمية مدعومة بالذكاء الاصطناعي تساعدك على الوصول إلى أفضل الشروحات، وتلخيص الدروس، وإنشاء الملاحظات
              والاختبارات في تجربة تعلم واحدة.
            </p>
          </div>
        </div>
        <div className="container" style={{ paddingBottom: 80 }}>
          <div className="entry-grid">
            <Link to="/learn" className="entry-card anim">
              <span className="entry-ic">
                <Icon name="grad-cap" />
              </span>
              <h3>المناهج التعليمية</h3>
              <p>استعرض المناهج السعودية حسب المرحلة والصف والمادة، وشاهد أفضل الشروحات المدعومة بالذكاء الاصطناعي.</p>
              <span className="entry-tag">١٢ صفاً دراسياً</span>
            </Link>
            <Link to="/analyze" className="entry-card alt anim">
              <span className="entry-ic">
                <Icon name="file-text" />
              </span>
              <h3>حلّل ملفاتك التعليمية</h3>
              <p>ارفع عرضاً تقديمياً أو ملفاً تعليمياً، ودع إيضاح يساعدك في فهم المحتوى وتلخيصه وإنشاء أسئلة وملاحظات للمذاكرة.</p>
              <span className="entry-tag">PDF / PPTX</span>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
