// صفحة الأدمن (مهمة I2): مراجعة طلبات رفع المواد — قبول/رفض.
// محروسة بقائمة إيميلات الأدمن في الواجهة، وبـ RLS (is_admin()) في الخادم.
import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../Footer';
import Icon from '../components/Icon';
import { useAuth } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { isAdminEmail } from '../data/admins';
import { levelLabel } from '../data/academicOptions';
import { fetchPendingRequests, approveRequest, rejectRequest } from '../lib/governance';

export default function Admin() {
  const { session } = useAuth();
  const email = session?.user?.email;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRequests(await fetchPendingRequests());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('غير متاح: Supabase غير مهيأ.');
      setLoading(false);
      return;
    }
    if (session && isAdminEmail(email)) load();
  }, [session, email, load]);

  if (!session) return <Navigate to="/login" replace />;

  // حارس الواجهة (الأمان الفعلي في RLS)
  if (!isAdminEmail(email)) {
    return (
      <>
        <TopNav />
        <section className="view">
          <div className="container auth-wrap">
            <div className="card auth-card anim" style={{ textAlign: 'center' }}>
              <h1 className="auth-title">صفحة المشرف</h1>
              <p className="auth-sub">هذه الصفحة للمشرفين فقط.</p>
              <Link className="btn" to="/">الرئيسية</Link>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  async function handleApprove(req) {
    setBusyId(req.id);
    setError('');
    setNotice('');
    try {
      await approveRequest(req);
      setNotice(`تمت الموافقة على «${req.title}» وظهرت في المكتبة.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(req) {
    setBusyId(req.id);
    setError('');
    setNotice('');
    try {
      await rejectRequest(req.id);
      setNotice(`رُفض طلب «${req.title}».`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <TopNav />
      <section className="view view-subjects">
        <div className="container">
          <div className="page-head anim">
            <nav className="crumbs">
              <Link to="/">الرئيسية</Link>
              <i className="sep">‹</i>
              <span className="cur">المشرف</span>
            </nav>
            <h1>طلبات رفع المواد</h1>
            <p>راجع الطلبات المعلّقة — القبول ينشر المادة في المكتبة، والرفض يغلق الطلب.</p>
          </div>

          {notice && (
            <p className="auth-notice" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="upload-error" role="alert">
              {error}
            </p>
          )}
          {loading && <p className="upload-filename">جارٍ التحميل…</p>}

          {!loading && !error && requests.length === 0 && (
            <div className="card lib-empty anim">
              <span className="s-icon">
                <Icon name="check" />
              </span>
              <h3>لا طلبات معلّقة</h3>
              <p className="s-desc">كل الطلبات روجعت.</p>
            </div>
          )}

          {!loading && requests.length > 0 && (
            <div className="admin-list">
              {requests.map((req) => {
                const meta = [req.university, req.college, req.major, req.level ? levelLabel(req.level) : null]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <div className="card admin-req" key={req.id}>
                    <div className="admin-req-body">
                      <h3>{req.title}</h3>
                      {req.description && <p className="s-desc">{req.description}</p>}
                      {meta && <span className="s-meta">{meta}</span>}
                    </div>
                    <div className="admin-req-actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleApprove(req)}
                        disabled={busyId === req.id}
                      >
                        <Icon name="check" /> قبول
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => handleReject(req)}
                        disabled={busyId === req.id}
                      >
                        <Icon name="x" /> رفض
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
