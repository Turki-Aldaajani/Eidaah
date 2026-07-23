// استبيان المساهمة في المكتبة (مهمة I2): بعد إضافة الطالب مقرراً خاصاً، نعرض
// استبياناً سريعاً — إن كان المقرر من منهج الجامعة يقدّمه للمكتبة (طلب يراجعه
// المشرف)، وإلا يتخطّى فيبقى المقرر خاصاً به وحده.
import React, { useState } from 'react';
import Icon from './Icon';
import { submitMaterialRequest } from '../lib/governance';

export default function ContributeSurvey({ course, profile, onClose }) {
  const [step, setStep] = useState('ask'); // ask | details | done
  const [name, setName] = useState(course?.name || '');
  const [complete, setComplete] = useState('complete'); // complete | partial
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const completeness = complete === 'complete' ? 'المحتوى مكتمل' : 'يوجد محتوى متبقٍ';
      const description = [note.trim(), `مساهمة طالب · ${completeness}`].filter(Boolean).join(' · ');
      await submitMaterialRequest({
        title: name.trim(),
        description,
        university: profile?.university || course?.university || null,
        college: profile?.college || null,
        major: profile?.major || null,
        level: course?.default_level || profile?.level || null,
      });
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-label="مساهمة في المكتبة">
      <div className="card modal-card anim" style={{ textAlign: step === 'details' ? 'start' : 'center' }}>
        {step === 'ask' && (
          <>
            <span className="s-icon" style={{ margin: '0 auto' }}>
              <Icon name="users" />
            </span>
            <h2>ساهم في المكتبة؟</h2>
            <p className="s-desc">
              هل «{course?.name}» من منهج جامعتك؟ ساهم به ليستفيد زملاؤك — بعد مراجعة المشرف يظهر في المكتبة.
              وإلا يبقى خاصاً بك وحدك.
            </p>
            <div className="endterm-choices">
              <button type="button" className="btn" onClick={() => setStep('details')}>
                نعم، من منهج جامعتي
              </button>
              <button type="button" className="btn ghost" onClick={onClose}>
                تخطّي — يبقى خاصاً بي
              </button>
            </div>
          </>
        )}

        {step === 'details' && (
          <>
            <h2>تفاصيل المساهمة</h2>
            <label className="auth-label" htmlFor="cs-name">اسم المقرر</label>
            <input
              id="cs-name"
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <span className="auth-label">هل رفعت كل محتوى المقرر؟</span>
            <div className="seg" role="group" aria-label="اكتمال المحتوى">
              <button
                type="button"
                className={complete === 'complete' ? 'seg-btn active' : 'seg-btn'}
                onClick={() => setComplete('complete')}
              >
                مكتمل
              </button>
              <button
                type="button"
                className={complete === 'partial' ? 'seg-btn active' : 'seg-btn'}
                onClick={() => setComplete('partial')}
              >
                يوجد متبقٍ
              </button>
            </div>
            <label className="auth-label" htmlFor="cs-note">ملاحظة للمشرف (اختياري)</label>
            <input
              id="cs-note"
              className="auth-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: الفصل الأول فقط"
            />
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <div className="moadi-actions">
              <button type="button" className="btn" onClick={submit} disabled={busy || !name.trim()}>
                {busy ? 'جارٍ الإرسال…' : 'أرسل للمراجعة'}
              </button>
              <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
                تخطّي
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <span className="s-icon" style={{ margin: '0 auto' }}>
              <Icon name="check" />
            </span>
            <h2>وصلت مساهمتك ✓</h2>
            <p className="s-desc">سيراجعها المشرف، وبعد الموافقة تظهر في مكتبة جامعتك للجميع.</p>
            <button type="button" className="btn" onClick={onClose}>
              تم
            </button>
          </>
        )}
      </div>
    </div>
  );
}
