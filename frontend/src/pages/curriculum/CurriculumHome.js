import React from "react";
import { Link } from "react-router-dom";
import TopNav from "../../components/TopNav";
import Icon from "../../components/Icon";
import Footer from "../../Footer";
import CurriculumChatbot from "../../components/CurriculumChatbot";
import { STAGES, LEVEL_NAMES, subjectsForStage, stageById, POC_STAGES } from "../../data/curriculum";

const LEVELS = ["primary", "middle", "high"];

function GradeCard({ stage }) {
  const isAvailable = POC_STAGES.includes(stage.id);
  const count = subjectsForStage(stage).length;

  if (!isAvailable) {
    return (
      <div className={`card grade-card lv-${stage.lv} grade-card--locked`} aria-disabled="true">
        <span className="g-soon-badge">قريباً</span>
        <h3 className="g-name">{stage.n}</h3>
        <span className="g-sub g-sub--muted">سيُتاح قريباً</span>
      </div>
    );
  }

  return (
    <Link className={`card grade-card lv-${stage.lv}`} to={`/learn/${stage.id}`}>
      <h3 className="g-name">{stage.n}</h3>
      <span className="g-sub">{count} مواد دراسية</span>
      <span className="g-cta">
        ابدأ التعلّم <Icon name="arrow" />
      </span>
    </Link>
  );
}

export default function CurriculumHome() {
  return (
    <>
      <TopNav />
      <section className="view view-home">
        <div className="hero">
          <div className="container hero-in anim">
            <nav className="crumbs">
              <Link to="/">الرئيسية</Link>
              <i className="sep">‹</i>
              <span className="cur">المناهج التعليمية</span>
            </nav>
            <span className="hero-kicker">
              <Icon name="sparkles" /> منصة تعلّم بالذكاء الاصطناعي
            </span>
            <h1 className="hero-title">
              اختر <span className="hl">مرحلتك الدراسية</span>
            </h1>
            <p className="hero-sub">تعلّم أسرع بالذكاء الاصطناعي، مصمم خصيصاً للمنهج السعودي</p>
            <CurriculumChatbot />
          </div>
        </div>
        <div className="container home-groups">
          {LEVELS.map((lv) => (
            <section className="level-group" key={lv}>
              <h2 className="level-h">
                <span className={`lv-chip lv-${lv}`}>{LEVEL_NAMES[lv]}</span>
                <i className="lv-line"></i>
              </h2>
              <div className="grid grades">
                {STAGES.filter((s) => s.lv === lv).map((s) => (
                  <GradeCard stage={stageById(s.id)} key={s.id} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
}
