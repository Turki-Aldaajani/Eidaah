// صفحة «موادي» (مهمة S2): مقررات الطالب المختارة للفصل — رؤية اختيار المقررات.
// المستوى قائمة منسدلة، والمقررات بطاقات قابلة للاختيار (منسّقة + إضافة الطالب)
// مع احترام المتطلبات وأنواع المقرر، ودورة فصل تُنهي الفصل وترقّي المستوى.
// يتعايش مع S1 (الرفع المباشر): «ذاكر» يفتح الأداة المباشرة لأي مقرر.
import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../Footer';
import Icon from '../components/Icon';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../profile/ProfileContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { LEVELS, levelLabel } from '../data/academicOptions';
import {
  fetchCourseCatalog,
  fetchStudentCourses,
  selectCourse,
  unselectCourse,
  addCustomCourse,
  updateStudentCourseStatus,
  electiveLabel,
  isCourseUnlocked,
} from '../lib/courses';

const DEFAULT_TERM = 'الفصل الحالي';
const STATUS_LABELS = { in_progress: 'جارٍ', completed: 'مكتمل', dropped: 'محذوف', failed: 'راسب' };

function ElectiveBadge({ type }) {
  return <span className={`course-badge elective-${type}`}>{electiveLabel(type)}</span>;
}

export default function Moadi() {
  const { session } = useAuth();
  const { profile, saveProfile } = useProfile();
  const university = profile?.university || null;
  const term = profile?.current_term || DEFAULT_TERM;

  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [levelFilter, setLevelFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [custom, setCustom] = useState({ name: '', level: '', elective: 'required' });
  const [endTerm, setEndTerm] = useState(null); // خريطة course_id -> status عند إنهاء الفصل
  const [popup, setPopup] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cat, sel] = await Promise.all([
        fetchCourseCatalog({ university }),
        fetchStudentCourses(term),
      ]);
      setCatalog(cat);
      setSelected(sel);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [university, term]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('غير متاح: Supabase غير مهيأ.');
      setLoading(false);
      return;
    }
    if (session) load();
  }, [session, load]);

  if (!session) return <Navigate to="/login" replace />;

  const selectedIds = new Set(selected.map((s) => s.course?.id));
  const completedIds = selected.filter((s) => s.status === 'completed').map((s) => s.course?.id);
  const nameById = Object.fromEntries(catalog.map((c) => [c.id, c.name]));

  const available = catalog.filter(
    (c) => !selectedIds.has(c.id) && (!levelFilter || String(c.default_level) === String(levelFilter))
  );

  async function handleSelect(course) {
    setBusy(true);
    setError('');
    try {
      await selectCourse(course.id, term);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(sc) {
    setBusy(true);
    setError('');
    try {
      await unselectCourse(sc.course.id, term);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddCustom(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await addCustomCourse({
        name: custom.name,
        university,
        level: custom.level ? Number(custom.level) : null,
        electiveType: custom.elective,
      });
      await selectCourse(created.id, term);
      setCustom({ name: '', level: '', elective: 'required' });
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openEndTerm() {
    // افتراضياً: كل المقررات الجارية «مكتملة» — الطالب يعدّل ما رسب/حذف
    const map = {};
    selected.forEach((s) => {
      map[s.id] = s.status === 'in_progress' ? 'completed' : s.status;
    });
    setEndTerm(map);
  }

  async function confirmEndTerm() {
    setBusy(true);
    setError('');
    try {
      let passed = 0;
      for (const sc of selected) {
        const status = endTerm[sc.id] || sc.status;
        if (status !== sc.status) await updateStudentCourseStatus(sc.id, status);
        if (status === 'completed') passed += 1;
      }
      // ترقية المستوى (استدلال مبسّط للـPOC): إتمام أي مقرر يرفع مستواً واحداً
      const advanced = passed > 0;
      const nextLevel = advanced ? Math.min(Number(profile?.level || 0) + 1, 8) : profile?.level;
      const nextTerm = `${term} — التالي`;
      await saveProfile({ level: nextLevel, current_term: nextTerm });
      setEndTerm(null);
      setPopup(
        advanced
          ? `إجازة سعيدة! 🎉 اجتزت ${passed} مقرر${passed > 1 ? 'ات' : ''} — متحمسون لاختيارك مقررات ${
              nextLevel ? levelLabel(nextLevel) : 'الفصل القادم'
            }.`
          : 'تم إنهاء الفصل. جاهزون لاختيار مقررات الفصل القادم.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
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
              <span className="cur">مقرراتي</span>
            </nav>
            <div className="moadi-head">
              <div>
                <h1>مقرراتي</h1>
                <p>
                  {university ? `${university} · ` : ''}
                  {term}
                  {profile?.level ? ` · ${levelLabel(profile.level)}` : ''}
                </p>
              </div>
              {selected.length > 0 && (
                <button type="button" className="btn ghost" onClick={openEndTerm} disabled={busy}>
                  <Icon name="check" /> أنهيت الفصل
                </button>
              )}
            </div>
          </div>

          {error && (
            <p className="upload-error" role="alert">
              {error}
            </p>
          )}
          {loading && <p className="upload-filename">جارٍ التحميل…</p>}

          {!loading && (
            <>
              {/* مقرراتي المختارة */}
              <h2 className="moadi-section">مقرراتي هذا الفصل ({selected.length})</h2>
              {selected.length === 0 ? (
                <p className="s-desc" style={{ marginBottom: 20 }}>
                  لم تختر مقررات بعد — اختر من الكتالوج بالأسفل أو أضف مقرراً خاصاً.
                </p>
              ) : (
                <div className="grid subjects moadi-grid">
                  {selected.map((sc) => (
                    <div className="card subject-card lib-card" key={sc.id} style={{ '--c': 'var(--pri)' }}>
                      <span className={`course-status status-${sc.status}`}>{STATUS_LABELS[sc.status]}</span>
                      <span className="s-icon">
                        <Icon name="book-open" />
                      </span>
                      <div className="s-body">
                        <h3>{sc.course?.name}</h3>
                        <div className="course-tags">
                          {sc.course?.elective_type && <ElectiveBadge type={sc.course.elective_type} />}
                          {sc.course?.default_level && (
                            <span className="course-badge">{levelLabel(sc.course.default_level)}</span>
                          )}
                        </div>
                        <div className="moadi-actions">
                          <Link className="btn" to="/analyze">
                            <Icon name="sparkles" /> ذاكر
                          </Link>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => handleRemove(sc)}
                            disabled={busy}
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* الكتالوج */}
              <div className="moadi-catalog-head">
                <h2 className="moadi-section">أضف من الكتالوج</h2>
                <select
                  className="auth-input moadi-level"
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  aria-label="فلترة حسب المستوى"
                >
                  <option value="">كل المستويات</option>
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {available.length === 0 ? (
                <p className="s-desc">
                  لا مقررات في الكتالوج{levelFilter ? ' لهذا المستوى' : ''} — أضف مقرراً خاصاً بالأسفل.
                </p>
              ) : (
                <div className="grid subjects moadi-grid">
                  {available.map((c) => {
                    const unlocked = isCourseUnlocked(c, completedIds);
                    const prereqNames = (c.prerequisites || []).map((id) => nameById[id] || '؟').join('، ');
                    return (
                      <div
                        className={`card subject-card lib-card${unlocked ? '' : ' subject-card--locked'}`}
                        key={c.id}
                        style={{ '--c': 'var(--pri)' }}
                      >
                        <span className="s-icon">
                          <Icon name={unlocked ? 'book-open' : 'shield'} />
                        </span>
                        <div className="s-body">
                          <h3>{c.name}</h3>
                          <div className="course-tags">
                            <ElectiveBadge type={c.elective_type} />
                            {c.default_level && (
                              <span className="course-badge">{levelLabel(c.default_level)}</span>
                            )}
                          </div>
                          {!unlocked && (
                            <span className="course-locked">يتطلب: {prereqNames}</span>
                          )}
                          <div className="moadi-actions">
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleSelect(c)}
                              disabled={busy || !unlocked}
                            >
                              <Icon name="check" /> أضف لمقرراتي
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* إضافة مقرر خاص */}
              <div className="moadi-add">
                {!showAdd ? (
                  <button type="button" className="btn ghost" onClick={() => setShowAdd(true)}>
                    <Icon name="pen" /> أضف مقرراً خاصاً (خارج الكتالوج)
                  </button>
                ) : (
                  <form className="card auth-card moadi-add-form" onSubmit={handleAddCustom}>
                    <h3>مقرر خاص</h3>
                    <p className="s-desc">لأي كورس خارج كتالوج جامعتك — ستذاكره برفع ملفاتك مباشرة.</p>
                    <label className="auth-label" htmlFor="cc-name">اسم المقرر</label>
                    <input
                      id="cc-name"
                      className="auth-input"
                      value={custom.name}
                      onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                      placeholder="مثال: مقدمة في التعلم الآلي"
                      required
                    />
                    <label className="auth-label" htmlFor="cc-level">المستوى (اختياري)</label>
                    <select
                      id="cc-level"
                      className="auth-input"
                      value={custom.level}
                      onChange={(e) => setCustom({ ...custom, level: e.target.value })}
                    >
                      <option value="">بدون</option>
                      {LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                    <div className="moadi-actions">
                      <button className="btn" type="submit" disabled={busy}>
                        {busy ? 'جارٍ…' : 'أضف واختر'}
                      </button>
                      <button type="button" className="btn ghost" onClick={() => setShowAdd(false)} disabled={busy}>
                        إلغاء
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* نافذة إنهاء الفصل */}
      {endTerm && (
        <div className="modal-overlay" role="dialog" aria-label="إنهاء الفصل">
          <div className="card modal-card anim">
            <h2>إنهاء الفصل</h2>
            <p className="s-desc">أكّد حالة كل مقرر — المكتملة ترفع مستواك للفصل القادم.</p>
            <div className="endterm-list">
              {selected.map((sc) => (
                <div className="endterm-row" key={sc.id}>
                  <span>{sc.course?.name}</span>
                  <select
                    className="auth-input"
                    value={endTerm[sc.id]}
                    onChange={(e) => setEndTerm({ ...endTerm, [sc.id]: e.target.value })}
                  >
                    <option value="completed">نجحت</option>
                    <option value="dropped">حذفت</option>
                    <option value="failed">رسبت</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="moadi-actions">
              <button type="button" className="btn" onClick={confirmEndTerm} disabled={busy}>
                {busy ? 'جارٍ…' : 'تأكيد وبدء فصل جديد'}
              </button>
              <button type="button" className="btn ghost" onClick={() => setEndTerm(null)} disabled={busy}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تنبيه التهنئة */}
      {popup && (
        <div className="modal-overlay" role="dialog" aria-label="تهنئة">
          <div className="card modal-card anim" style={{ textAlign: 'center' }}>
            <span className="s-icon" style={{ margin: '0 auto' }}>
              <Icon name="sparkles" />
            </span>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.9 }}>{popup}</p>
            <button type="button" className="btn" onClick={() => setPopup('')}>
              اختيار مقررات الفصل القادم
            </button>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
