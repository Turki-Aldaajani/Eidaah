import React from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import Icon from "../components/Icon";
import Footer from "../Footer";
import { AIF } from "../data/curriculum";
import { LP_WHY, LP_JOURNEY, LP_SOON } from "../data/landing";

function HeroIllustration() {
  return (
    <svg className="lp-ilu" viewBox="0 0 520 420" fill="none" aria-hidden="true">
      <circle className="ilu-bg" cx="280" cy="210" r="172" />
      <rect className="ilu-card" x="118" y="118" width="264" height="184" rx="22" />
      <circle className="ilu-play" cx="250" cy="188" r="36" />
      <path className="ilu-tri" d="M241 170v36l30-18z" />
      <rect className="ilu-line" x="150" y="246" width="132" height="12" rx="6" />
      <rect className="ilu-line" x="150" y="270" width="92" height="12" rx="6" />
      <g className="ilu-flt f2">
        <rect className="ilu-chip" x="58" y="140" width="104" height="38" rx="19" />
        <circle className="ilu-dot d1" cx="82" cy="159" r="9" />
        <rect className="ilu-chipline" x="100" y="153" width="48" height="11" rx="5.5" />
      </g>
      <g className="ilu-flt f3">
        <rect className="ilu-chip" x="66" y="256" width="104" height="38" rx="19" />
        <circle className="ilu-dot d2" cx="90" cy="275" r="9" />
        <rect className="ilu-chipline" x="108" y="269" width="48" height="11" rx="5.5" />
      </g>
      <g className="ilu-flt f1">
        <path className="ilu-book1" d="M338 306c24-11 52-11 76 0v64c-24-11-52-11-76 0z" />
        <path className="ilu-book2" d="M414 306c24-11 52-11 76 0v64c-24-11-52-11-76 0z" />
      </g>
    </svg>
  );
}

function FeatureCard({ feature }) {
  return (
    <div className="feat-card anim">
      <span className="feat-ic">
        <Icon name={feature.i} />
      </span>
      <h4>{feature.t}</h4>
      <p>{feature.d}</p>
    </div>
  );
}

function WhyItem({ text }) {
  return (
    <div className="why-item">
      <Icon name="badge-check" />
      <span>{text}</span>
    </div>
  );
}

function JourneyStep({ step, isLast }) {
  return (
    <>
      <div className="jr-step">
        <span className="jr-ic">
          <Icon name={step.icn} />
        </span>
        <span className="jr-t">{step.t}</span>
      </div>
      {!isLast && (
        <span className="jr-sep">
          <Icon name="chev" />
        </span>
      )}
    </>
  );
}

function SoonCard({ item }) {
  return (
    <div className="soon-card">
      <span className="soon-badge">قريباً</span>
      <Icon name={item.icn} />
      <b>{item.t}</b>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <TopNav />
      <section className="view view-landing">
        <div className="hero">
          <div className="container lp-hero-grid">
            <div className="hero-in anim">
              <span className="hero-kicker">
                <Icon name="sparkles" /> منصة تعلّم بالذكاء الاصطناعي
              </span>
              <h1 className="hero-title">
                برفقة <span className="hl">إيضاح</span> .. كل خطوة أوضح وكل هدف أقرب
              </h1>
              <p className="hero-sub">
                منصة تعليمية مدعومة بالذكاء الاصطناعي تساعدك على الوصول إلى أفضل الشروحات، وتلخيص الدروس، وإنشاء
                الملاحظات والاختبارات في تجربة تعلم واحدة.
              </p>
            </div>
            <div className="lp-hero-illu anim">
              <HeroIllustration />
            </div>
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

        <section className="lp-sec">
          <div className="container">
            <h2 className="lp-t">ماذا يقدم إيضاح؟</h2>
            <p className="lp-ts">أدوات ذكية ترافقك في كل درس وكل ملف</p>
            <div className="feat4">
              {AIF.map((feature) => (
                <FeatureCard feature={feature} key={feature.k} />
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec alt">
          <div className="container">
            <h2 className="lp-t">لماذا إيضاح؟</h2>
            <div className="why-row anim">
              {LP_WHY.map((text) => (
                <WhyItem text={text} key={text} />
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec">
          <div className="container">
            <h2 className="lp-t">رحلتك مع إيضاح</h2>
            <div className="jr">
              {LP_JOURNEY.map((step, i) => (
                <JourneyStep step={step} isLast={i === LP_JOURNEY.length - 1} key={step.t} />
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec alt">
          <div className="container">
            <h2 className="lp-t">قريباً في إيضاح</h2>
            <p className="lp-ts">نعمل باستمرار على توسيع المنصة بمزايا جديدة</p>
            <div className="soon-grid">
              {LP_SOON.map((item) => (
                <SoonCard item={item} key={item.t} />
              ))}
            </div>
          </div>
        </section>

        <section className="home-id">
          <div className="container">
            <div className="home-id-in anim">
              <span className="home-id-mark">إ</span>
              <h2 className="home-id-t">إيضاح</h2>
              <p className="home-id-d">فريق الذكاء الاصطناعي بنادي إنجاز</p>
              <p className="home-id-u">جامعة الإمام محمد بن سعود الإسلامية</p>
              <p className="home-id-s">طلبة طموحون يسعون لتوظيف الذكاء الاصطناعي لخدمة المعرفة.</p>
              <div className="home-id-btns">
                <Link to="/about" className="btn">
                  <Icon name="grad-cap" /> عن الفريق
                </Link>
                <Link to="/faq" className="btn ghost">
                  <Icon name="help" /> الأسئلة الشائعة
                </Link>
              </div>
            </div>
          </div>
        </section>
      </section>
      <Footer />
    </>
  );
}
