// ─── C3 (#52): شات بوت التنقل الذكي في المناهج ────────────────────────────────
// واجهة محادثة بارزة (Hero Search) تختصر التنقّل الهرمي (المرحلة، المادة،
// الفصل، الوحدة، الدرس) إلى خطوة واحدة: يكتب الطالب نيّته بلغة حرة، فنبحث في
// فهرس المناهج المحلي (بلا توليد، بلا شبكة) وننقله مباشرة أو نعرض اقتراحات.
//
// ثلاث حالات (من searchCurriculum):
//   exact    → رسالة + تنقّل مباشر لصفحة الدرس (عند تحديد الصف)
//   multiple → أزرار اقتراحات (≤4): "هل تقصد؟" أو "اختر الصف" للدروس المكررة
//   no_match → رد لطيف يذكر المتاح، بلا كسر للواجهة

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { searchCurriculum } from "../lib/curriculumSearch";

export default function CurriculumChatbot({ stageId = null }) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

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
    <section className="cbot card" aria-label="مساعد التنقل في المناهج" dir="rtl">
      <div className="cbot-head">
        <span className="cbot-kicker">
          <Icon name="sparkles" /> بحث ذكي في المناهج
        </span>
        <h2 className="cbot-title">اكتب اسم درس تريد تعلّمه، ونأخذك للدرس مباشرة</h2>
        <p className="cbot-lead">
          بدل التنقّل بين المرحلة والمادة والفصل، اسأل بلغتك، مثل: «الأعداد
          النسبية» أو «سكراتش».
        </p>
      </div>

      {messages.length > 0 && (
        <div className="cbot-log" role="log" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`chat-row chat-row-${m.role}`}>
              <div className={`chat-msg chat-${m.role}`}>
                <p className="chat-text">{m.text}</p>

                {m.options && m.options.length > 0 && (
                  <div className="chat-options">
                    {m.options.map((opt) => (
                      <button
                        type="button"
                        key={opt.url}
                        className="chat-option"
                        onClick={() => goTo(opt)}
                      >
                        <span className="chat-option-t">{opt.lessonTitle}</span>
                        <span className="chat-option-s">{opt.stageName}</span>
                      </button>
                    ))}
                  </div>
                )}

                {m.hint && (
                  <p className="chat-hint">
                    للانتقال المباشر، اكتب اسم الدرس مع الصف (وضّح أكثر).
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <form className="cbot-form" onSubmit={handleSubmit}>
        <input
          className="cbot-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب اسم الدرس... مثال: الأعداد النسبية"
          aria-label="سؤالك"
        />
        <button className="cbot-send" type="submit">
          أرسل
        </button>
      </form>
    </section>
  );
}
