// ─── C3 (#52): شات بوت التنقل الذكي في المناهج ────────────────────────────────
// واجهة محادثة بسيطة تختصر التنقّل الهرمي (المرحلة → المادة → الفصل → الوحدة →
// الدرس) إلى خطوة واحدة: يكتب الطالب نيّته بلغة حرة، فنبحث في فهرس المناهج
// المحلي (بلا توليد، بلا شبكة) وننقله مباشرة أو نعرض خيارات.
//
// ثلاث حالات (من searchCurriculum):
//   exact    → رسالة + تنقّل مباشر لصفحة الدرس
//   multiple → أزرار خيارات (≤4) + تلميح "وضّح أكثر"
//   no_match → رد لطيف يذكر المتاح، بلا كسر للواجهة

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchCurriculum } from "../lib/curriculumSearch";

const GREETING =
  "اكتب سؤالك وسأنقلك مباشرة للدرس المناسب. مثال: أريد درس الأعداد النسبية.";

export default function CurriculumChatbot({ stageId = "m1" }) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "bot", text: GREETING }]);

  function goTo(result) {
    navigate(result.url);
  }

  function handleSubmit(e) {
    if (e) e.preventDefault();
    const q = input.trim();
    if (!q) return;

    const res = searchCurriculum(q, stageId);
    setInput("");
    setMessages((prev) => {
      const next = [...prev, { role: "user", text: q }];
      if (res.status === "exact") {
        next.push({ role: "bot", text: res.message });
      } else if (res.status === "multiple") {
        next.push({ role: "bot", text: res.message, options: res.results, hint: true });
      } else {
        next.push({ role: "bot", text: res.message });
      }
      return next;
    });

    // الحالة 1: تنقّل مباشر بعد إظهار رسالة التأكيد
    if (res.status === "exact") {
      goTo(res.results[0]);
    }
  }

  return (
    <section className="curriculum-chatbot" aria-label="مساعد التنقل في المناهج" dir="rtl">
      <div className="chat-log" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-${m.role}`}>
            <p className="chat-text">{m.text}</p>

            {m.options && m.options.length > 0 && (
              <ul className="chat-options">
                {m.options.map((opt) => (
                  <li key={opt.url}>
                    <button
                      type="button"
                      className="chat-option card"
                      onClick={() => goTo(opt)}
                    >
                      {opt.lessonTitle} — {opt.subjectName}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {m.hint && (
              <p className="chat-hint">
                للانتقال المباشر، اكتب اسم الدرس بدقة أكبر (وضّح أكثر).
              </p>
            )}
          </div>
        ))}
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك... مثال: أريد درس الأعداد النسبية"
          aria-label="سؤالك"
        />
        <button type="submit">أرسل</button>
      </form>
    </section>
  );
}
