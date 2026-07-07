import React, { useState } from "react";
import Icon from "../../components/Icon";
import Quiz from "./Quiz";
import { AIF } from "../../data/curriculum";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function LoadingRow() {
  return (
    <div className="ai-loading">
      <span className="dots">
        <i></i>
        <i></i>
        <i></i>
      </span>
      <span>يولّد مساعد إيضاح المحتوى الآن…</span>
    </div>
  );
}

function SummaryContent({ points }) {
  return (
    <>
      <ul className="sum-list">
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
      <p className="ai-foot">
        <Icon name="sparkles" /> وُلِّد هذا الملخص بالذكاء الاصطناعي استناداً إلى محتوى الدرس في المنهج السعودي
      </p>
    </>
  );
}

function ExampleContent({ heading, paragraphs }) {
  return (
    <div className="ex-card">
      <h4>
        <Icon name="lightbulb" /> {heading}
      </h4>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <p className="ai-foot">اربط دائماً ما تتعلمه بمواقف من حياتك، الفهم بالربط يدوم أطول</p>
    </div>
  );
}

function NotesContent({ laws, defs, exam }) {
  return (
    <div className="notes">
      <div className="note-block nb-law">
        <h4>
          <Icon name="ruler" /> قوانين وقواعد مهمة
        </h4>
        <ul>
          {laws.map((x, i) => (
            <li dir="auto" key={i}>
              {x}
            </li>
          ))}
        </ul>
      </div>
      <div className="note-block nb-def">
        <h4>
          <Icon name="book-open" /> تعريفات أساسية
        </h4>
        <ul>
          {defs.map((x, i) => (
            <li dir="auto" key={i}>
              {x}
            </li>
          ))}
        </ul>
      </div>
      <div className="note-block nb-exam">
        <h4>
          <Icon name="alert" /> متوقّع في الاختبار
        </h4>
        <ul>
          {exam.map((x, i) => (
            <li dir="auto" key={i}>
              {x}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AiToolsPanel({ stage, subject, lesson, onStepDone }) {
  const [openKey, setOpenKey] = useState(null);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  const fetchTool = async (tool) => {
    setLoading((l) => ({ ...l, [tool]: true }));
    setErrors((e) => ({ ...e, [tool]: null }));
    try {
      const res = await fetch(`${API_URL}/api/lesson_tool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: stage.n, subject: subject.n, lesson_title: lesson.t, tool, language: "ar" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((e) => ({ ...e, [tool]: data.detail || "تعذّر توليد المحتوى الآن" }));
        return;
      }
      setCache((c) => ({ ...c, [tool]: data }));
      if (tool !== "quiz") onStepDone(tool);
    } catch (err) {
      setErrors((e) => ({ ...e, [tool]: "تعذّر الاتصال بالخادم" }));
    } finally {
      setLoading((l) => ({ ...l, [tool]: false }));
    }
  };

  const toggle = (key) => {
    if (openKey === key) {
      setOpenKey(null);
      return;
    }
    setOpenKey(key);
    if (!cache[key] && !errors[key]) fetchTool(key);
  };

  const renderBody = (key) => {
    if (loading[key]) return <LoadingRow />;
    if (errors[key]) return <p className="q-hint">{errors[key]}</p>;
    const data = cache[key];
    if (!data) return null;
    if (key === "sum") return <SummaryContent points={data.points} />;
    if (key === "ex") return <ExampleContent heading={data.heading} paragraphs={data.paragraphs} />;
    if (key === "notes") return <NotesContent laws={data.laws} defs={data.defs} exam={data.exam} />;
    if (key === "quiz") return <Quiz questions={data.questions} onFirstCorrectSubmit={() => onStepDone("quiz")} />;
    return null;
  };

  return (
    <section className="ai-sec anim">
      <div className="ai-head">
        <span className="ai-badge">
          <Icon name="sparkles" /> مساعد إيضاح الذكي
        </span>
        <h2>ذاكر الدرس بعمق مع الذكاء الاصطناعي</h2>
        <p>أربع أدوات ذكية مبنية على محتوى المنهج السعودي، افتح أي بطاقة وسيولّد المساعد محتواها فوراً</p>
      </div>
      <div className="ai-list">
        {AIF.map((f) => (
          <div className={`ai-card${openKey === f.k ? " open" : ""}`} key={f.k}>
            <button type="button" className="ai-toggle" onClick={() => toggle(f.k)}>
              <span className="ai-ico">
                <Icon name={f.i} />
              </span>
              <span className="ai-tt">
                <b>{f.t}</b>
                <small>{f.d}</small>
              </span>
              <span className="chev">
                <Icon name="chev" />
              </span>
            </button>
            <div className="ai-body">
              <div className="ai-inner">{openKey === f.k && renderBody(f.k)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
