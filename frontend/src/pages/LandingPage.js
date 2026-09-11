import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import TopNav from "../components/TopNav";
import Icon from "../components/Icon";
import Footer from "../Footer";
import { AIF } from "../data/curriculum";
import { LP_WHY, LP_JOURNEY, LP_SOON } from "../data/landing";
import { useTheme } from "../theme/ThemeContext";


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

// الفراغ تحت الكرت الأول هو مسار التمرير الذي تحتاجه الكروت لتتراكم، فيبدو للوهلة
// الأولى وكأن القسم انتهى — هذا المؤشر يوضّح أن هناك ما يستحق النزول إليه.
function ScrollCue({ hidden }) {
  const reduced = useReducedMotion();

  // الغلاف الثابت يتولى التوسيط الأفقي (left:50% + translateX(-50%))، لأن Framer Motion
  // يكتب خاصية transform كاملة بنفسه لتحريك y — لو وُضع التوسيط على العنصر المتحرك نفسه
  // كان يُستبدل بتحويل الارتداد في كل إطار، فيرجع السهم يسار الشاشة بسبب RTL.
  return (
    <span className="scroll-cue" aria-hidden="true">
      <motion.span
        className="scroll-cue-ic"
        animate={
          hidden || reduced ? { opacity: hidden ? 0 : 0.9, y: 0 } : { opacity: [0.6, 1, 0.6], y: [0, -8, 0] }
        }
        transition={
          hidden || reduced ? { duration: 0.35 } : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <Icon name="chev" />
      </motion.span>
    </span>
  );
}

// كل كرت يلتصق أسفل الكرت الذي قبله، ويتصغّر إلى 0.92 بينما يزحف التالي فوقه.
function StickyFeatureCard({ feature, index, total, progress, cueHidden }) {
  const isLast = index === total - 1;
  const scale = useTransform(
    progress,
    [index / total, (index + 1) / total],
    isLast ? [1, 1] : [1, 0.92]
  );

  return (
    <motion.div
      className="feat-card stack-card"
      style={{ scale, top: `calc(20vh + ${index * 14}px)`, zIndex: index + 1 }}
    >
      <span className="feat-ic">
        <Icon name={feature.i} />
      </span>
      <h4>{feature.t}</h4>
      <p>{feature.d}</p>
      {index === 0 && <ScrollCue hidden={cueHidden} />}
    </motion.div>
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

// مسار متعرج: الأيقونة تتناوب بين جهتي السطر والنص مقابلها، ويصل بينها منحنى SVG.
// المسارات مكتوبة بإحداثيات LTR ثم تُعكس كاملة مع RTL، فتبقى مطابقة لتناوب الشبكة.
const JR_LINK_OUT = "M 18 0 C 18 13 82 7 82 20";
const JR_LINK_BACK = "M 82 0 C 82 13 18 7 18 20";

function JourneyZigzag() {
  return (
    <div className="jrz">
      {LP_JOURNEY.map((step, i) => (
        <React.Fragment key={step.t}>
          <div className={i % 2 ? "jrz-row alt" : "jrz-row"}>
            <span className="jrz-lane">
              <span className="jr-ic">
                <Icon name={step.icn} />
              </span>
            </span>
            <span className="jr-t">{step.t}</span>
          </div>
          {i < LP_JOURNEY.length - 1 && (
            <svg className="jrz-link" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
              <path d={i % 2 === 0 ? JR_LINK_OUT : JR_LINK_BACK} vectorEffect="non-scaling-stroke" />
            </svg>
          )}
        </React.Fragment>
      ))}
    </div>
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
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [showLearnNotice, setShowLearnNotice] = useState(false);
  const stackRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: stackRef, offset: ["start start", "end end"] });
  const [cueHidden, setCueHidden] = useState(false);
  // نربطه بتقدّم القسم نفسه لا بأول scroll في الصفحة، وإلا اختفى المؤشر قبل أن يصل المستخدم إليه.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v > 0.02 && !cueHidden) setCueHidden(true);
  });
  const logoSrc = theme === "dark" ? "/eidaah-logo-dark.png" : "/eidaah-logo-light.png";

  function handleLearnClick(e) {
    e.preventDefault();
    setShowLearnNotice(true);
  }

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
            <Link to="/learn" className="entry-card anim" onClick={handleLearnClick}>
              <span className="entry-badge-incomplete">غير مكتمل</span>
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
            <div className="stack-head">
              <h2 className="lp-t">ماذا يقدم إيضاح؟</h2>
              <p className="lp-ts">أدوات ذكية ترافقك في كل درس وكل ملف</p>
            </div>
            <div className="sticky-stack" ref={stackRef}>
              {AIF.map((feature, i) => (
                <StickyFeatureCard
                  feature={feature}
                  index={i}
                  total={AIF.length}
                  progress={scrollYProgress}
                  cueHidden={cueHidden}
                  key={feature.k}
                />
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
            <JourneyZigzag />
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
              <img className="home-id-logo" src={logoSrc} alt="إيضاح" />
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
      {showLearnNotice && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="تنبيه">
          <div className="card modal-card anim" style={{ textAlign: "center" }}>
            <h2>القسم لا يزال قيد التطوير</h2>
            <p className="s-desc">
              قسم المناهج التعليمية غير مكتمل حالياً، وتتوفر حالياً فقط بعض مواد المرحلة المتوسطة للتجربة.
            </p>
            <div className="endterm-choices">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowLearnNotice(false);
                  navigate("/learn");
                }}
              >
                متابعة على أي حال
              </button>
              <button type="button" className="btn ghost" onClick={() => setShowLearnNotice(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
