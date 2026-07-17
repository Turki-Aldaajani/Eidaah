// صفحة تسجيل الدخول برمز OTP عبر الإيميل (مهمة I1)
// خطوتان: إدخال الإيميل ← إدخال الرمز المرسل. بدون باسوورد وبدون بيانات إضافية.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../Footer';
import Icon from '../components/Icon';
import { useAuth } from '../auth/AuthContext';
import { sendOtpCode, verifyOtpCode, accountTypeFor, signOut } from '../lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { email: normalized } = await sendOtpCode(email);
      setEmail(normalized);
      setStep('code');
      setNotice('أرسلنا رمز التحقق إلى بريدك — تفقد الوارد (والمزعج أحياناً)');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await verifyOtpCode(email, code);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleResend() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await sendOtpCode(email);
      setNotice('أُعيد إرسال الرمز — انتظر دقيقة قبل طلبه مجدداً');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      setStep('email');
      setCode('');
      setNotice('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const account = accountTypeFor(email);

  // مسجَّل دخول بالفعل: نعرض حالته وزر الخروج (دورة دخول/خروج كاملة)
  if (session) {
    const sessionAccount = accountTypeFor(session.user?.email);
    return (
      <>
        <TopNav />
        <section className="view">
          <div className="container auth-wrap">
            <div className="card auth-card anim">
              <h1 className="auth-title">أنت مسجّل الدخول</h1>
              <p className="auth-sub">{session.user?.email}</p>
              <p className="auth-note">
                {sessionAccount?.type === 'university'
                  ? `حساب جامعي${sessionAccount.university ? ` — ${sessionAccount.university}` : ''} · مكتبة جامعتك مفتوحة`
                  : 'حساب تجربة حرة'}
              </p>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <div className="auth-actions">
                <Link className="btn" to="/">
                  الرئيسية <Icon name="arrow" />
                </Link>
                <button type="button" className="btn ghost" onClick={handleSignOut} disabled={busy}>
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <TopNav />
      <section className="view">
        <div className="container auth-wrap">
          <div className="card auth-card anim">
            <span className="hero-kicker">
              <Icon name="sparkles" /> بدون باسوورد — رمز يصلك على بريدك
            </span>
            <h1 className="auth-title">تسجيل الدخول</h1>

            {step === 'email' && (
              <form onSubmit={handleSendCode} className="auth-form">
                <p className="auth-sub">
                  أدخل بريدك الإلكتروني — البريد الجامعي (.edu.sa) يفتح مكتبة جامعتك،
                  وأي بريد آخر يدخل بالتجربة الحرة.
                </p>
                <label className="auth-label" htmlFor="login-email">
                  البريد الإلكتروني
                </label>
                <input
                  id="login-email"
                  className="auth-input"
                  type="email"
                  dir="ltr"
                  placeholder="you@imamu.edu.sa"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button className="btn auth-submit" type="submit" disabled={busy}>
                  {busy ? 'جارٍ الإرسال…' : 'أرسل رمز التحقق'}
                </button>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={handleVerify} className="auth-form">
                <p className="auth-sub">
                  أدخل الرمز المرسل إلى <b dir="ltr">{email}</b>
                </p>
                <p className="auth-note">
                  {account.type === 'university'
                    ? `بريد جامعي${account.university ? ` — ${account.university}` : ''} · ستُفتح مكتبة جامعتك`
                    : 'بريد غير جامعي · ستدخل بالتجربة الحرة'}
                </p>
                <label className="auth-label" htmlFor="login-code">
                  رمز التحقق
                </label>
                <input
                  id="login-code"
                  className="auth-input auth-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                  required
                />
                {notice && <p className="auth-notice">{notice}</p>}
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button className="btn auth-submit" type="submit" disabled={busy}>
                  {busy ? 'جارٍ التحقق…' : 'تأكيد الدخول'}
                </button>
                <div className="auth-actions">
                  <button type="button" className="btn ghost" onClick={handleResend} disabled={busy}>
                    إعادة إرسال الرمز
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setStep('email');
                      setCode('');
                      setError('');
                      setNotice('');
                    }}
                    disabled={busy}
                  >
                    تغيير البريد
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
