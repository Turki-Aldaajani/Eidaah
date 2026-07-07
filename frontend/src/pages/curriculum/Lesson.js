import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import Icon from "../../components/Icon";
import TopNav from "../../components/TopNav";
import VideoGrid from "./VideoGrid";
import AiToolsPanel from "./AiToolsPanel";
import { stageById, SUB_DEFS, CHAPTERS, lessonsFor, mockVideos, STEPS, toArabicDigits } from "../../data/curriculum";

function emptyProgress() {
  return { video: false, sum: false, ex: false, notes: false, quiz: false };
}

function ProgressRing({ progress, lesson }) {
  const done = STEPS.filter((s) => progress[s.k]).length;
  const pct = Math.round((done / STEPS.length) * 100);
  const remaining = Math.max(0, Math.round(lesson.min * (1 - done / STEPS.length)));
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="card prog-card">
      <h3>
        <Icon name="chart" /> تقدمك في الدرس
      </h3>
      <div className="ring-wrap">
        <svg className="ring" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#155043" />
              <stop offset="100%" stopColor="#125D64" />
            </linearGradient>
          </defs>
          <circle className="ring-bg" cx="60" cy="60" r="52" />
          <circle
            className="ring-fg"
            cx="60"
            cy="60"
            r="52"
            style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - pct / 100) }}
          />
        </svg>
        <div className="ring-txt">
          <b>{toArabicDigits(pct)}٪</b>
          <span>مكتمل</span>
        </div>
      </div>
      <p className="remain">
        {pct === 100 ? "أكملت الدرس بالكامل!" : `الوقت المتبقي المقدّر: نحو ${toArabicDigits(remaining)} دقيقة`}
      </p>
      <ul className="p-steps">
        {STEPS.map((s) => (
          <li className={progress[s.k] ? "done" : ""} key={s.k}>
            <i>
              <Icon name={progress[s.k] ? "check" : s.i} />
            </i>
            <span>{s.t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Lesson() {
  const { stageId, subjectId, chapterId, lessonIdx } = useParams();
  const stage = stageById(stageId);
  const subject = SUB_DEFS[subjectId];
  const chapter = CHAPTERS.find((c) => c.id === Number(chapterId));
  const lessons = lessonsFor(subjectId);
  const idx = Number(lessonIdx);
  const lesson = lessons[idx];

  const [progress, setProgress] = useState(emptyProgress());
  const [playingVideo, setPlayingVideo] = useState(null);

  const lessonKey = `${stageId}/${subjectId}/${chapterId}/${lessonIdx}`;
  useEffect(() => {
    setProgress(emptyProgress());
    setPlayingVideo(null);
  }, [lessonKey]);

  if (!stage || !subject || !chapter || !lesson) return <Navigate to="/learn" replace />;

  const markStep = (key) => setProgress((p) => (p[key] ? p : { ...p, [key]: true }));
  const videos = mockVideos(lesson, subjectId);
  const done = STEPS.filter((s) => progress[s.k]).length;
  const pct = Math.round((done / STEPS.length) * 100);

  const nextLessonPath =
    idx + 1 < lessons.length
      ? `/learn/${stageId}/${subjectId}/${chapterId}/${idx + 1}`
      : `/learn/${stageId}/${subjectId}/${chapterId}`;

  return (
    <>
      <TopNav />
      <section className="view view-lesson">
        <div className="container">
          <div className="lp-head anim">
            <nav className="crumbs">
              <Link to="/learn">الرئيسية</Link>
              <i className="sep">‹</i>
              <Link to={`/learn/${stageId}`}>{stage.n}</Link>
              <i className="sep">‹</i>
              <Link to={`/learn/${stageId}/${subjectId}`}>{subject.n}</Link>
              <i className="sep">‹</i>
              <Link to={`/learn/${stageId}/${subjectId}/${chapterId}`}>{chapter.n}</Link>
              <i className="sep">‹</i>
              <span className="cur">{lesson.t}</span>
            </nav>
            <h1 dir="auto">{lesson.t}</h1>
            <div className="lp-meta">
              <span className="mchip">
                <Icon name="grad-cap" /> {stage.n}
              </span>
              <span className="mchip mc-sub" style={{ "--c": subject.c }}>
                <Icon name={subject.icn} /> {subject.n}
              </span>
              <span className="mchip">
                <Icon name="clock" /> {toArabicDigits(lesson.min)} دقيقة
              </span>
              <span className={`diff ${lesson.diff.cls}`}>{lesson.diff.t}</span>
            </div>
            <div className="mob-prog">
              <div className="mp-bar">
                <i style={{ width: `${pct}%` }}></i>
              </div>
              <b>{toArabicDigits(pct)}٪</b>
            </div>
          </div>

          <div className="lesson-layout">
            <article className="lmain">
              <section className="vid-sec anim">
                <div className="sec-head">
                  <h2>
                    <Icon name="video" className="h-ico" /> أفضل الشروحات المقترحة
                  </h2>
                  <p>رشّحها لك محرك التوصيات من قنوات متنوعة: عين، ومعلمون بارزون بشرح المناهج، وقنوات مستقلة</p>
                </div>
                <VideoGrid
                  videos={videos}
                  onWatch={(video) => {
                    markStep("video");
                    setPlayingVideo(video);
                  }}
                />
              </section>

              <AiToolsPanel
                stage={stage}
                subject={subject}
                lesson={lesson}
                progress={progress}
                onStepDone={markStep}
              />

              <div className="next-cta anim">
                <div className="cta-txt">
                  <h3>أنهيت «{lesson.t}»؟</h3>
                  <p>حافظ على وتيرتك، الدرس التالي جاهز لك</p>
                </div>
                <Link className="btn cta-btn" to={nextLessonPath}>
                  ابدأ الدرس التالي <Icon name="arrow" />
                </Link>
              </div>
            </article>

            <aside className="side anim">
              <ProgressRing progress={progress} lesson={lesson} />
              <div className="card streak-card">
                <span className="st-fire">
                  <Icon name="flame" />
                </span>
                <div>
                  <b>٥ أيام متتالية</b>
                  <p>ذاكر اليوم للحفاظ على سلسلتك</p>
                </div>
              </div>
              <div className="card tip-card">
                <span className="tip-ic">
                  <Icon name="lightbulb" />
                </span>
                <p>
                  <b>نصيحة إيضاح:</b> شاهد الشرح أولاً، ثم اقرأ التلخيص، وأنهِ بالاختبار. هذا التسلسل يرسّخ المعلومة أطول.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {playingVideo && (
        <div className="pm-back" onClick={() => setPlayingVideo(null)}>
          <div className="pmodal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="pm-x" aria-label="إغلاق" onClick={() => setPlayingVideo(null)}>
              <Icon name="x" />
            </button>
            <div className="p-screen" style={{ background: `linear-gradient(135deg,${playingVideo.g[0]},${playingVideo.g[1]})` }}>
              <span className="ps-ic">
                <Icon name={playingVideo.icn} />
              </span>
              <button type="button" className="p-play" aria-label="تشغيل">
                <Icon name="play" />
              </button>
              <span className="p-proto">مشغّل تجريبي · في النسخة النهائية يُعرض فيديو YouTube الفعلي هنا</span>
            </div>
            <div className="pm-info">
              <h4 dir="auto">{playingVideo.title}</h4>
              <p>
                <span className="ch-ava">{playingVideo.init}</span> {playingVideo.ch} · {playingVideo.viewsT} مشاهدة ·{" "}
                {playingVideo.dur}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
