import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import TopNav from "../../components/TopNav";
import Icon from "../../components/Icon";
import { stageById, subjectsForStage, SUB_DEFS, LESSONS } from "../../data/curriculum";

export default function Subjects() {
  const { stageId } = useParams();
  const stage = stageById(stageId);
  if (!stage) return <Navigate to="/learn" replace />;

  const subjectIds = subjectsForStage(stage);

  return (
    <>
      <TopNav />
      <section className="view view-subjects">
        <div className="container">
          <div className="page-head anim">
            <nav className="crumbs">
              <Link to="/learn">الرئيسية</Link>
              <i className="sep">‹</i>
              <span className="cur">{stage.n}</span>
            </nav>
            <h1>مواد {stage.n}</h1>
            <p>اختر المادة التي تريد مذاكرتها اليوم، كل مادة معها مساعد ذكي خاص بها</p>
          </div>
          <div className="grid subjects">
            {subjectIds.map((id) => {
              const s = SUB_DEFS[id];
              const lessonCount = (LESSONS[id] || LESSONS.math).length;
              return (
                <Link className="card subject-card anim" style={{ "--c": s.c }} to={`/learn/${stage.id}/${id}`} key={id}>
                  <span className="s-icon">
                    <Icon name={s.icn} />
                  </span>
                  <div className="s-body">
                    <h3>{s.n}</h3>
                    <p className="s-desc">{s.d}</p>
                    <span className="s-meta">فصلان دراسيان · {lessonCount} دروس لكل فصل</span>
                  </div>
                  <span className="s-arrow">
                    <Icon name="arrow" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
