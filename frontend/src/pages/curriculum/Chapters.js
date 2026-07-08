import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import TopNav from "../../components/TopNav";
import Icon from "../../components/Icon";
import Footer from "../../Footer";
import { stageById, SUB_DEFS, CHAPTERS, toArabicDigits } from "../../data/curriculum";

export default function Chapters() {
  const { stageId, subjectId } = useParams();
  const stage = stageById(stageId);
  const subject = SUB_DEFS[subjectId];
  if (!stage || !subject) return <Navigate to="/learn" replace />;

  return (
    <>
      <TopNav />
      <section className="view view-chapters">
        <div className="container">
          <div className="page-head anim">
            <nav className="crumbs">
              <Link to="/learn">الرئيسية</Link>
              <i className="sep">‹</i>
              <Link to={`/learn/${stage.id}`}>{stage.n}</Link>
              <i className="sep">‹</i>
              <span className="cur">{subject.n}</span>
            </nav>
            <h1>
              <span className="h-ic" style={{ "--c": subject.c }}>
                <Icon name={subject.icn} />
              </span>
              {subject.n}: {stage.n}
            </h1>
            <p>اختر الفصل الدراسي لعرض وحداته ودروسه</p>
          </div>
          <div className="grid chapters">
            {CHAPTERS.map((c) => (
              <Link
                className="card chapter-card anim"
                style={{ "--c": subject.c }}
                to={`/learn/${stage.id}/${subjectId}/${c.id}`}
                key={c.id}
              >
                <span className="ch-num">{toArabicDigits(`0${c.id}`)}</span>
                <div className="ch-body">
                  <h3>{c.n}</h3>
                  <p className="ch-meta">٦ دروس · {c.w} · نحو ساعتين مذاكرة</p>
                  <div className="ch-units">
                    {c.u.map((u) => (
                      <span key={u}>{u}</span>
                    ))}
                  </div>
                </div>
                <span className="ch-badge">{c.id === 1 ? "ابدأ من هنا" : "متاح"}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
