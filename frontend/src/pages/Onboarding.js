// الأونبوردنق السياقي (مهمة F1): أربع أسئلة قصيرة قابلة للتخطي بعد أول دخول.
// تُحفظ في profiles، والطالب يقدر يتخطاها كلها أو يكملها ثم يعدّل من الإعدادات.
import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../Footer';
import Icon from '../components/Icon';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../profile/ProfileContext';
import { isProfileComplete } from '../lib/profile';
import {
  UNIVERSITY_SUGGESTIONS,
  COLLEGE_SUGGESTIONS,
  LEVELS,
} from '../data/academicOptions';

const STEPS = [
  {
    key: 'university',
    icon: 'grad-cap',
    title: 'ما جامعتك؟',
    hint: 'يفتح لك مكتبة جامعتك',
    type: 'suggest',
    options: UNIVERSITY_SUGGESTIONS,
    listId: 'onb-universities',
    placeholder: 'اكتب أو اختر جامعتك',
  },
  {
    key: 'college',
    icon: 'layers',
    title: 'ما كليتك؟',
    hint: 'اختياري — يساعدنا نرشّح موادك',
    type: 'suggest',
    options: COLLEGE_SUGGESTIONS,
    listId: 'onb-colleges',
    placeholder: 'اكتب أو اختر كليتك',
  },
  {
    key: 'major',
    icon: 'code',
    title: 'ما تخصصك؟',
    hint: 'اختياري',
    type: 'text',
    placeholder: 'مثال: علوم حاسب',
  },
  {
    key: 'level',
    icon: 'chart',
    title: 'ما مستواك الدراسي؟',
    hint: 'يوصلك مباشرة لمواد مستواك',
    type: 'select',
    options: LEVELS,
    placeholder: 'اختر المستوى',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { profile, saveProfile, skipOnboarding } = useProfile();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(() => ({
    university: profile?.university || '',
    college: profile?.college || '',
    major: profile?.major || '',
    level: profile?.level || '',
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / STEPS.length) * 100),
    [stepIndex]
  );

  // بدون جلسة لا معنى للأونبوردنق — للدخول أولاً
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  function setValue(value) {
    setAnswers((a) => ({ ...a, [step.key]: value }));
  }

  function goNext() {
    setError('');
    if (!isLast) setStepIndex((i) => i + 1);
  }

  function goBack() {
    setError('');
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function finish() {
    setError('');
    setBusy(true);
    try {
      const saved = await saveProfile(answers);
      // لو خرج ببيانات ناقصة (تخطّى الأساسيات) نعدّه تخطياً حتى لا نلاحقه
      if (!isProfileComplete(saved)) skipOnboarding();
      navigate('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function skipAll() {
    skipOnboarding();
    navigate('/');
  }

  return (
    <>
      <TopNav />
      <section className="view">
        <div className="container auth-wrap">
          <div className="card auth-card onb-card anim">
            <div className="onb-top">
              <span className="hero-kicker">
                <Icon name="sparkles" /> لنجهّز تجربتك
              </span>
              <button type="button" className="onb-skip-all" onClick={skipAll} disabled={busy}>
                تخطّي الإعداد
              </button>
            </div>

            <div className="onb-progress" aria-hidden="true">
              <div className="onb-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <p className="onb-step-count">
              السؤال {stepIndex + 1} من {STEPS.length}
            </p>

            <div className="onb-q">
              <span className="onb-q-icon">
                <Icon name={step.icon} />
              </span>
              <h1 className="auth-title">{step.title}</h1>
              <p className="auth-note">{step.hint}</p>
            </div>

            <label className="auth-label" htmlFor={`onb-${step.key}`}>
              {step.title}
            </label>
            {step.type === 'select' ? (
              <select
                id={`onb-${step.key}`}
                className="auth-input"
                value={answers[step.key]}
                onChange={(e) => setValue(e.target.value)}
              >
                <option value="">{step.placeholder}</option>
                {step.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  id={`onb-${step.key}`}
                  className="auth-input"
                  type="text"
                  list={step.type === 'suggest' ? step.listId : undefined}
                  placeholder={step.placeholder}
                  value={answers[step.key]}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                />
                {step.type === 'suggest' && (
                  <datalist id={step.listId}>
                    {step.options.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                )}
              </>
            )}

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <div className="onb-actions">
              {stepIndex > 0 && (
                <button type="button" className="btn ghost" onClick={goBack} disabled={busy}>
                  السابق
                </button>
              )}
              {!isLast ? (
                <>
                  <button type="button" className="btn ghost" onClick={goNext} disabled={busy}>
                    تخطّي
                  </button>
                  <button type="button" className="btn" onClick={goNext} disabled={busy}>
                    التالي <Icon name="arrow" />
                  </button>
                </>
              ) : (
                <button type="button" className="btn onb-finish" onClick={finish} disabled={busy}>
                  {busy ? 'جارٍ الحفظ…' : 'حفظ ودخول'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
