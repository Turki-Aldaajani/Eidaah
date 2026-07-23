// صفحة «أضف مقرراً للمكتبة» (مهمة I2): الطالب يقترح مادة للمكتبة العامة.
// تُسجَّل كطلب pending ينتظر موافقة الأدمن قبل الظهور بالمكتبة.
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../Footer';
import Icon from '../components/Icon';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../profile/ProfileContext';
import { UNIVERSITY_SUGGESTIONS, COLLEGE_SUGGESTIONS, LEVELS } from '../data/academicOptions';
import { submitMaterialRequest } from '../lib/governance';

export default function SubmitMaterial() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const [form, setForm] = useState({
    title: '',
    description: '',
    university: profile?.university || '',
    college: profile?.college || '',
    major: profile?.major || '',
    level: profile?.level || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!session) return <Navigate to="/login" replace />;

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await submitMaterialRequest({
        title: form.title,
        description: form.description || null,
        university: form.university || null,
        college: form.college || null,
        major: form.major || null,
        level: form.level ? Number(form.level) : null,
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopNav />
      <section className="view">
        <div className="container auth-wrap">
          <div className="card auth-card anim">
            <span className="hero-kicker">
              <Icon name="layers" /> أضف مقرراً للمكتبة
            </span>
            {done ? (
              <>
                <h1 className="auth-title">وصل طلبك ✓</h1>
                <p className="auth-sub">
                  سيراجعه المشرف قريباً، وبعد الموافقة يظهر المقرر في مكتبة جامعتك للجميع.
                </p>
                <div className="auth-actions">
                  <Link className="btn" to="/library">
                    <Icon name="arrow" /> المكتبة
                  </Link>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setDone(false);
                      setForm((f) => ({ ...f, title: '', description: '' }));
                    }}
                  >
                    إضافة آخر
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="auth-title">اقترح مقرراً</h1>
                <p className="auth-sub">
                  يُراجَع طلبك من المشرف (حوكمة)، وبعد الموافقة يظهر في المكتبة للجميع.
                </p>
                <form onSubmit={handleSubmit} className="auth-form">
                  <label className="auth-label" htmlFor="sm-title">اسم المقرر</label>
                  <input
                    id="sm-title"
                    className="auth-input"
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    placeholder="مثال: مقدمة في قواعد البيانات"
                    required
                  />

                  <label className="auth-label" htmlFor="sm-desc">وصف مختصر (اختياري)</label>
                  <input
                    id="sm-desc"
                    className="auth-input"
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    placeholder="عمّاذا يتحدث المقرر؟"
                  />

                  <label className="auth-label" htmlFor="sm-university">الجامعة</label>
                  <input
                    id="sm-university"
                    className="auth-input"
                    list="sm-universities"
                    value={form.university}
                    onChange={(e) => update('university', e.target.value)}
                  />
                  <datalist id="sm-universities">
                    {UNIVERSITY_SUGGESTIONS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>

                  <label className="auth-label" htmlFor="sm-college">الكلية</label>
                  <input
                    id="sm-college"
                    className="auth-input"
                    list="sm-colleges"
                    value={form.college}
                    onChange={(e) => update('college', e.target.value)}
                  />
                  <datalist id="sm-colleges">
                    {COLLEGE_SUGGESTIONS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>

                  <label className="auth-label" htmlFor="sm-level">المستوى (اختياري)</label>
                  <select
                    id="sm-level"
                    className="auth-input"
                    value={form.level}
                    onChange={(e) => update('level', e.target.value)}
                  >
                    <option value="">بدون</option>
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>

                  {error && (
                    <p className="auth-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="btn auth-submit" type="submit" disabled={busy}>
                    {busy ? 'جارٍ الإرسال…' : 'أرسل الطلب'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
