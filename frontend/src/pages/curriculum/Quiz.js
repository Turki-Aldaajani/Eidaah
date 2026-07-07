import React, { useState } from "react";
import Icon from "../../components/Icon";
import { toArabicDigits } from "../../data/curriculum";

function emptyAnswers(count) {
  return Array(count).fill(-1);
}

export default function Quiz({ questions, onFirstCorrectSubmit }) {
  const [selected, setSelected] = useState(() => emptyAnswers(questions.length));
  const [done, setDone] = useState(false);
  const [warn, setWarn] = useState(false);
  const [everSubmitted, setEverSubmitted] = useState(false);

  const selectOption = (qi, oi) => {
    if (done) return;
    setSelected((s) => s.map((v, i) => (i === qi ? oi : v)));
    setWarn(false);
  };

  const submit = () => {
    if (selected.some((s) => s < 0)) {
      setWarn(true);
      return;
    }
    setDone(true);
    if (!everSubmitted) {
      setEverSubmitted(true);
      onFirstCorrectSubmit();
    }
  };

  const retry = () => {
    setSelected(emptyAnswers(questions.length));
    setDone(false);
    setWarn(false);
  };

  const unanswered = selected.filter((s) => s < 0).length;
  const score = done ? questions.reduce((acc, q, i) => acc + (selected[i] === q.a ? 1 : 0), 0) : 0;
  const feedback =
    score === 5
      ? "ممتاز! فهمك للدرس رائع"
      : score === 4
      ? "جيد جداً! راجع النقطة الفائتة وستُتقن الدرس"
      : score === 3
      ? "جيد، أعد قراءة التلخيص وحاول مرة أخرى"
      : "لا بأس أبداً! شاهد أحد الشروحات ثم أعد المحاولة";

  return (
    <div className="quiz">
      {questions.map((q, qi) => {
        const rowClass = done ? (selected[qi] === q.a ? "q-ok" : "q-bad") : "";
        return (
          <div className={`q-item ${rowClass}`} key={qi}>
            <p className="q-text" dir="auto">
              <span className="q-n">{toArabicDigits(qi + 1)}</span>
              {q.q}
            </p>
            <div className="q-opts">
              {q.o.map((opt, oi) => {
                let cls = "opt";
                if (!done && selected[qi] === oi) cls += " sel";
                if (done && oi === q.a) cls += " correct";
                else if (done && selected[qi] === oi) cls += " wrong";
                return (
                  <button type="button" className={cls} dir="auto" disabled={done} onClick={() => selectOption(qi, oi)} key={oi}>
                    {opt}
                    {done && oi === q.a && <Icon name="check" className="om" />}
                    {done && oi !== q.a && selected[qi] === oi && <Icon name="x" className="om" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {done ? (
        <div className="q-result">
          <div className="q-score">
            <b>{toArabicDigits(score)}</b>
            <span>من ٥</span>
          </div>
          <p className="q-fb">{feedback}</p>
          <button type="button" className="btn ghost" onClick={retry}>
            <Icon name="refresh" /> إعادة الاختبار
          </button>
        </div>
      ) : (
        <>
          <button type="button" className="btn q-submit" onClick={submit}>
            <Icon name="check" /> صحّح إجاباتي
          </button>
          {warn && (
            <p className="q-hint">
              أجب عن جميع الأسئلة أولاً، بقي {toArabicDigits(unanswered)} {unanswered === 1 ? "سؤال" : "أسئلة"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
