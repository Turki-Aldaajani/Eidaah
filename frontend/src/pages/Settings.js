// الإعدادات (مهمة F1): تعديل بيانات الأونبوردنق في أي وقت.
// الحفظ يمر عبر ProfileContext فينعكس فوراً على «بياناتك الحالية» وبقية الواجهة.
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../Footer';
import Icon from '../components/Icon';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../profile/ProfileContext';
import {
  UNIVERSITY_SUGGESTIONS,
  COLLEGE_SUGGESTIONS,
  LEVELS,
  levelLabel,
} from '../data/academicOptions';

export default function Settings() {
  const { session } = useAuth();
  const { profile, saveProfile } = useProfile();
  const [form, setForm] = useState({
    university: profile?.university || '',
    college: profile?.college || '',
    major: profile?.major || '',
    level: profile?.level || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // الإعدادات للمسجّلين فقط
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await saveProfile(form);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const hasProfile = profile && (profile.university || profile.college || profile.major || profile.level);

  return (
    <>
      <TopNav />
      <section className="view">
        <div className="container auth-wrap">
          <div className="card auth-card anim">
            <span className="hero-kicker">
              <Icon name="settings" /> الإعدادات
            </span>
            <h1 className="auth-title">بياناتك الدراسية</h1>
            <p className="auth-sub">
              عدّل بياناتك في أي وقت — تُحفظ فوراً وتنعكس على المواد المعروضة لك.
            </p>

            {/* ملخص حي يعكس آخر بيانات محفوظة (يتحدث فور الحفظ) */}
            <div className="settings-summary" data-testid="profile-summary">
              <span className="settings-summary-title">بياناتك الحالية</span>
              {hasProfile ? (
                <ul className="settings-summary-list">
                  <li>
                    <span>الجامعة</span>
                    <b>{profile.university || '—'}</b>
                  </li>
                  <li>
                    <span>الكلية</span>
                    <b>{profile.college || '—'}</b>
                  </li>
                  <li>
                    <span>التخصص</span>
                    <b>{profile.major || '—'}</b>
                  </li>
                  <li>
                    <span>المستوى</span>
                    <b>{profile.level ? levelLabel(profile.level) : '—'}</b>
                  </li>
                </ul>
              ) : (
                <p className="auth-note">لم تُدخل بياناتك بعد — املأ الحقول بالأسفل.</p>
              )}
            </div>

            <form onSubmit={handleSave} className="auth-form">
              <label className="auth-label" htmlFor="set-university">
                الجامعة
              </label>
              <input
                id="set-university"
                className="auth-input"
                type="text"
                list="set-universities"
                placeholder="اكتب أو اختر جامعتك"
                value={form.university}
                onChange={(e) => update('university', e.target.value)}
              />
              <datalist id="set-universities">
                {UNIVERSITY_SUGGESTIONS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>

              <label className="auth-label" htmlFor="set-college">
                الكلية
              </label>
              <input
                id="set-college"
                className="auth-input"
                type="text"
                list="set-colleges"
                placeholder="اكتب أو اختر كليتك"
                value={form.college}
                onChange={(e) => update('college', e.target.value)}
              />
              <datalist id="set-colleges">
                {COLLEGE_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              <label className="auth-label" htmlFor="set-major">
                التخصص
              </label>
              <input
                id="set-major"
                className="auth-input"
                type="text"
                placeholder="مثال: علوم حاسب"
                value={form.major}
                onChange={(e) => update('major', e.target.value)}
              />

              <label className="auth-label" htmlFor="set-level">
                المستوى الدراسي
              </label>
              <select
                id="set-level"
                className="auth-input"
                value={form.level}
                onChange={(e) => update('level', e.target.value)}
              >
                <option value="">اختر المستوى</option>
                {LEVELS.map((lvl) => (
                  <option key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </option>
                ))}
              </select>

              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              {saved && (
                <p className="auth-notice" role="status">
                  حُفظت بياناتك ✓
                </p>
              )}
              <button className="btn auth-submit" type="submit" disabled={busy}>
                {busy ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
              </button>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
