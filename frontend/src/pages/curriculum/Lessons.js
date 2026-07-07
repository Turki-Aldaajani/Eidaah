import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import TopNav from "../../components/TopNav";
import Icon from "../../components/Icon";
import { stageById, SUB_DEFS, CHAPTERS, lessonsFor, toArabicDigits } from "../../data/curriculum";

export default function Lessons() {
  const { stageId, subjectId, chapterId } = useParams();
  const stage = stageById(stageId);
  const subject = SUB_DEFS[subjectId];
  const chapter = CHAPTERS.find((c) => c.id === Number(chapterId));
  if (!stage || !subject || !chapter) return <Navigate to="/learn" replace />;

  const lessons = lessonsFor(subjectId);

  return (
    <>
      <TopNav />
      <section className="view view-lessons">
        <div className="container">
          <div className="page-head anim">
            <nav className="crumbs">
              <Link to="/learn">الرئيسية</Link>
              <i className="sep">‹</i>
              <Link to={`/learn/${stage.id}`}>{stage.n}</Link>
              <i className="sep">‹</i>
              <Link to={`/learn/${stage.id}/${subjectId}`}>{subject.n}</Link>
              <i className="sep">‹</i>
              <span className="cur">{chapter.n}</span>
            </nav>
            <h1>دروس {chapter.n}</h1>
            <p>رتّبنا لك الدروس بالتسلسل الأمثل للفهم، ابدأ بالأول وتقدّم خطوة خطوة</p>
          </div>
          <div className="grid lessons">
            {lessons.map((l, i) => (
              <Link
                className="card lesson-card anim"
                style={{ "--c": subject.c }}
                to={`/learn/${stage.id}/${subjectId}/${chapter.id}/${i}`}
                key={i}
              >
                <span className="l-idx">{toArabicDigits(i + 1)}</span>
                <div className="l-body">
                  <h3 dir="auto">{l.t}</h3>
                  <div className="l-meta">
                    <span className="meta-chip">
                      <Icon name="clock" /> {toArabicDigits(l.min)} دقيقة
                    </span>
                    <span className={`diff ${l.diff.cls}`}>{l.diff.t}</span>
                    <span className="meta-chip">
                      <Icon name="video" /> ٨ شروحات مقترحة
                    </span>
                  </div>
                </div>
                <span className="l-go">ادرس الآن</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
