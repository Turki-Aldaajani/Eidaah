// صفحة «مقرراتي» (مهمة S2): مقررات الطالب المختارة للفصل — رؤية اختيار المقررات.
// الإضافة مجمّعة (تحديد محلي ثم دفعة واحدة، تخفّف ضغط السيرفر)، مع بحث فوري،
// ودورة فصل بخيارين (تجاوزت / لم أتجاوز) تُفعَّل تلقائياً بنهاية الفصل.
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
import { isTermEnded } from '../data/academicCalendar';
import {
  fetchCourseCatalog,
  fetchStudentCourses,
  fetchCompletedCourseIds,
  markCoursesCompleted,
  selectCourses,
  unselectCourse,
  addCustomCourse,
  updateStudentCourseStatus,
  electiveLabel,
  isCourseUnlocked,
} from '../lib/courses';

const DEFAULT_TERM = 'الفصل الحالي';
const STATUS_LABELS = { in_progress: 'جارٍ', completed: 'تجاوزته', dropped: 'لم أتجاوزه', failed: 'لم أتجاوزه' };

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
  const [completedIds, setCompletedIds] = useState([]); // سجل المقررات المُجتازة (كل الفصول)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [levelFilter, setLevelFilter] = useState('');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [search, setSearch] = useState('');
  const [staged, setStaged] = useState(() => new Set()); // تحديد محلي قبل الإضافة المجمّعة
  const [confirmCourse, setConfirmCourse] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [custom, setCustom] = useState({ name: '', level: '', elective: 'required' });
  const [endTerm, setEndTerm] = useState(null); // { [scId]: 'passed' | 'not' }
  const [endTermDismissed, setEndTermDismissed] = useState(false);
  const [popup, setPopup] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cat, sel, done] = await Promise.all([
        fetchCourseCatalog({ university }),
        fetchStudentCourses(term),
        fetchCompletedCourseIds(),
      ]);
      setCatalog(cat);
      setSelected(sel);
      setCompletedIds(done);
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

  // الافتراضي: مقررات مستوى الطالب (لا كل المستويات)
  useEffect(() => {
    setLevelFilter((prev) =>
      prev === '' && profile?.level != null ? String(profile.level) : prev
    );
  }, [profile?.level]);

  const termEnded = isTermEnded(term);

  // تفعيل «أنهيت الفصل» تلقائياً بنهاية الفصل الدراسي
  useEffect(() => {
    if (termEnded && !endTermDismissed && !endTerm && selected.length > 0) {
      setEndTerm(Object.fromEntries(selected.map((s) => [s.id, 'passed'])));
    }
  }, [termEnded, endTermDismissed, endTerm, selected]);

  if (!session) return <Navigate to="/login" replace />;

  const selectedIds = new Set(selected.map((s) => s.course?.id));
  const completedSet = new Set(completedIds);
  const nameById = Object.fromEntries(catalog.map((c) => [c.id, c.name]));
  const searchLc = search.trim().toLowerCase();

  // التوفّر يحكمه المتطلب لا المستوى: نعرض المتاح (المتطلب مُستوفى) افتراضياً،
  // والمستوى يقيّد الإجبارية التخصصية فقط (الحرة/الاختيارية تُعرض بلا قيد مستوى).
  // الـ checkbox يكشف «غير المتوفرة» = المقفلة بمتطلبات، بغضّ النظر عن المستوى.
  const available = catalog
    .filter((c) => !selectedIds.has(c.id))
    .filter((c) => !completedSet.has(c.id)) // لا نعرض ما اجتازه الطالب
    .filter((c) => {
      const unlocked = isCourseUnlocked(c, completedIds);
      if (!unlocked) return showUnavailable; // مقفل → يظهر فقط عند «إظهار غير المتوفرة»
      if (c.elective_type === 'required') {
        return !levelFilter || String(c.default_level) === String(levelFilter);
      }
      return true; // الحرة/الاختيارية غير مقيّدة بالمستوى
    })
    .filter((c) => !searchLc || `${c.name} ${c.code || ''}`.toLowerCase().includes(searchLc));

  function prereqNamesFor(course) {
    return (course.prerequisites || []).map((id) => nameById[id] || '؟').join('، ');
  }

  // تبديل تحديد مقرر محلياً (بلا اتصال بالسيرفر) — الإضافة الفعلية دفعة واحدة
  function toggleStage(course) {
    if (staged.has(course.id)) {
      setStaged((prev) => {
        const next = new Set(prev);
        next.delete(course.id);
        return next;
      });
      return;
    }
    if (!isCourseUnlocked(course, completedIds)) {
      setConfirmCourse(course); // مقفل — نطلب تأكيد اجتياز المتطلب قبل التحديد
      return;
    }
    setStaged((prev) => new Set(prev).add(course.id));
  }

  // خيار (أ): الطالب أنهى المتطلب فعلاً — نسجّله مُجتازاً (يفتح تابعيه ولا يظهر)
  async function confirmPrereqDone() {
    const course = confirmCourse;
    setConfirmCourse(null);
    if (!course) return;
    const prereqs = course.prerequisites || [];
    try {
      if (prereqs.length) {
        await markCoursesCompleted(prereqs);
        setCompletedIds((prev) => [...new Set([...prev, ...prereqs])]);
      }
    } catch (err) {
      setError(err.message);
    }
    setStaged((prev) => new Set(prev).add(course.id));
  }

  // خيار (ب): لم ينهِ المتطلب لكن الإرشاد سمح استثناءً — نضيف بلا تسجيل المتطلب
  function confirmPrereqWaived() {
    if (confirmCourse) setStaged((prev) => new Set(prev).add(confirmCourse.id));
    setConfirmCourse(null);
  }

  // الإضافة المجمّعة: كل المحدد في طلب واحد
  async function commitStaged() {
    if (staged.size === 0) return;
    setBusy(true);
    setError('');
    try {
      await selectCourses([...staged], term);
      setStaged(new Set());
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
      setCatalog((prev) => [created, ...prev]); // يظهر فوراً بلا إعادة تحميل
      setStaged((prev) => new Set(prev).add(created.id)); // يُحدَّد للإضافة المجمّعة
      setCustom({ name: '', level: '', elective: 'required' });
      setShowAdd(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmEndTerm() {
    setBusy(true);
    setError('');
    try {
      let passed = 0;
      for (const sc of selected) {
        const status = endTerm[sc.id] === 'passed' ? 'completed' : 'dropped';
        if (status !== sc.status) await updateStudentCourseStatus(sc.id, status);
        if (status === 'completed') passed += 1;
      }
      const advanced = passed > 0;
      const nextLevel = advanced ? Math.min(Number(profile?.level || 0) + 1, 8) : profile?.level;
      const nextTerm = `${term} — التالي`;
      await saveProfile({ level: nextLevel, current_term: nextTerm });
      setEndTerm(null);
      setEndTermDismissed(true);
      setPopup(
        advanced
          ? `إجازة سعيدة! 🎉 تجاوزت ${passed} مقرر${passed > 1 ? 'ات' : ''} — متحمسون لاختيارك مقررات ${
              nextLevel ? levelLabel(nextLevel) : 'الفصل القادم'
            }.`
          : 'انتهى الفصل. جاهزون لاختيار مقررات الفصل القادم متى استعددت.'
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
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setEndTerm(Object.fromEntries(selected.map((s) => [s.id, 'passed'])))}
                  disabled={busy}
                >
                  <Icon name="check" /> أنهيت الفصل
                </button>
              )}
            </div>
          </div>

          {termEnded && !endTerm && (
            <div className="moadi-banner anim">
              <span>
                <Icon name="calendar" /> انتهى الفصل الدراسي — أكّد مقرراتك لبدء الفصل القادم.
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setEndTerm(Object.fromEntries(selected.map((s) => [s.id, 'passed'])))}
              >
                إنهاء الفصل الآن
              </button>
            </div>
          )}

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
                  لم تختر مقررات بعد — ابحث أو اختر من الكتالوج بالأسفل ثم أضِفها دفعة واحدة.
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
                          <button type="button" className="btn ghost" onClick={() => handleRemove(sc)} disabled={busy}>
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* الكتالوج + البحث */}
              <div className="moadi-catalog-head">
                <h2 className="moadi-section">أضف من الكتالوج</h2>
                <div className="moadi-filters">
                  <label className="moadi-checkbox">
                    <input
                      type="checkbox"
                      checked={showUnavailable}
                      onChange={(e) => setShowUnavailable(e.target.checked)}
                    />
                    إظهار المقررات غير المتوفرة (المقفلة بمتطلبات)
                  </label>
                  <select
                    className="auth-input moadi-level"
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    aria-label="فلترة حسب المستوى"
                  >
                    <option value="">كل المستويات</option>
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="moadi-search">
                <Icon name="eye" />
                <input
                  type="search"
                  className="auth-input"
                  placeholder="ابحث عن مقرر بالاسم أو الرمز…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="بحث المقررات"
                />
              </div>

              {available.length === 0 ? (
                <p className="s-desc">
                  {searchLc ? 'لا نتائج للبحث.' : 'لا مقررات متاحة الآن'} — فعّل «إظهار المقررات غير
                  المتوفرة» أعلاه، أو أضف مقرراً خاصاً بالأسفل.
                </p>
              ) : (
                <div className="grid subjects moadi-grid">
                  {available.map((c) => {
                    const unlocked = isCourseUnlocked(c, completedIds);
                    const isStaged = staged.has(c.id);
                    return (
                      <div
                        className={`card subject-card lib-card${unlocked ? '' : ' course-needs-prereq'}${
                          isStaged ? ' course-staged' : ''
                        }`}
                        key={c.id}
                        style={{ '--c': 'var(--pri)' }}
                      >
                        <span className="s-icon">
                          <Icon name="book-open" />
                        </span>
                        <div className="s-body">
                          <h3>{c.name}</h3>
                          <div className="course-tags">
                            <ElectiveBadge type={c.elective_type} />
                            {c.default_level && (
                              <span className="course-badge">{levelLabel(c.default_level)}</span>
                            )}
                          </div>
                          {!unlocked && <span className="course-locked">يتطلب: {prereqNamesFor(c)}</span>}
                          <div className="moadi-actions">
                            <button
                              type="button"
                              className={isStaged ? 'btn ghost' : 'btn'}
                              onClick={() => toggleStage(c)}
                              disabled={busy}
                            >
                              <Icon name="check" /> {isStaged ? 'محدَّد' : 'أضف'}
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
                        {busy ? 'جارٍ…' : 'أضِف وحدّد'}
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

      {/* شريط الإضافة المجمّعة */}
      {staged.size > 0 && (
        <div className="moadi-commit-bar">
          <span>{staged.size} مقرر محدَّد</span>
          <div className="moadi-actions">
            <button type="button" className="btn ghost" onClick={() => setStaged(new Set())} disabled={busy}>
              مسح التحديد
            </button>
            <button type="button" className="btn" onClick={commitStaged} disabled={busy}>
              {busy ? 'جارٍ الإضافة…' : `أضِف ${staged.size} إلى مقرراتي`}
            </button>
          </div>
        </div>
      )}

      {/* تأكيد إضافة مقرر مقفل — ثلاثة خيارات */}
      {confirmCourse && (
        <div className="modal-overlay" role="dialog" aria-label="تأكيد المتطلب">
          <div className="card modal-card anim">
            <h2>متطلب هذا المقرر</h2>
            <p className="s-desc">
              «{confirmCourse.name}» يتطلب إتمام: {prereqNamesFor(confirmCourse)}. اختر ما ينطبق عليك:
            </p>
            <div className="endterm-choices">
              <button type="button" className="btn" onClick={confirmPrereqDone} disabled={busy}>
                نعم، أنهيت المتطلب
              </button>
              <button type="button" className="btn ghost" onClick={confirmPrereqWaived} disabled={busy}>
                لم أنهه، لكن الإرشاد سمح لي (استثناء)
              </button>
              <button type="button" className="btn ghost" onClick={() => setConfirmCourse(null)} disabled={busy}>
                إلغاء
              </button>
            </div>
            <p className="s-desc" style={{ fontSize: '.78rem' }}>
              «أنهيت المتطلب» يسجّله في سجلك فلا يظهر مجدداً ويفتح المقررات التي تعتمد عليه.
            </p>
          </div>
        </div>
      )}

      {/* نافذة إنهاء الفصل — خياران فقط */}
      {endTerm && (
        <div className="modal-overlay" role="dialog" aria-label="إنهاء الفصل">
          <div className="card modal-card anim">
            <h2>إنهاء الفصل</h2>
            <p className="s-desc">لكل مقرر: هل تجاوزته؟ المقررات المتجاوَزة ترفع مستواك للفصل القادم.</p>
            <div className="endterm-list">
              {selected.map((sc) => (
                <div className="endterm-row" key={sc.id}>
                  <span>{sc.course?.name}</span>
                  <div className="seg" role="group" aria-label={`حالة ${sc.course?.name}`}>
                    <button
                      type="button"
                      className={endTerm[sc.id] === 'passed' ? 'seg-btn active' : 'seg-btn'}
                      onClick={() => setEndTerm({ ...endTerm, [sc.id]: 'passed' })}
                    >
                      تجاوزت
                    </button>
                    <button
                      type="button"
                      className={endTerm[sc.id] === 'not' ? 'seg-btn active' : 'seg-btn'}
                      onClick={() => setEndTerm({ ...endTerm, [sc.id]: 'not' })}
                    >
                      لم أتجاوز
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="moadi-actions">
              <button type="button" className="btn" onClick={confirmEndTerm} disabled={busy}>
                {busy ? 'جارٍ…' : 'تأكيد وبدء فصل جديد'}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setEndTerm(null);
                  setEndTermDismissed(true);
                }}
                disabled={busy}
              >
                لاحقاً
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
