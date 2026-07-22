// صفحة المكتبة (مهمة F2): مواد الجامعة مفلترة تلقائياً حسب بيانات الأونبوردنق.
// فتح المادة يعرض الشرح المخزَّن مسبقاً (I3) بلا رفع ملف وبلا استدعاء Groq.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../Footer';
import Icon from '../components/Icon';
import { useProfile } from '../profile/ProfileContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { fetchLibraryMaterials } from '../lib/library';
import { levelLabel } from '../data/academicOptions';

function MaterialCard({ material }) {
  const processed = material.processing_status === 'processed';
  const meta = [material.college, material.level ? levelLabel(material.level) : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Link className="card subject-card anim lib-card" to={`/library/${material.id}`}>
      {processed && <span className="lib-badge">جاهزة</span>}
      <span className="s-icon">
        <Icon name="book-open" />
      </span>
      <div className="s-body">
        <h3>{material.title}</h3>
        {material.description && <p className="s-desc">{material.description}</p>}
        {meta && <span className="s-meta">{meta}</span>}
      </div>
      <span className="s-arrow">
        <Icon name="arrow" />
      </span>
    </Link>
  );
}

export default function Library() {
  const { profile } = useProfile();
  const university = profile?.university || null;
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('المكتبة غير متاحة: Supabase غير مهيأ.');
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError('');
    fetchLibraryMaterials({ university })
      .then((data) => {
        if (active) setMaterials(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [university]);

  return (
    <>
      <TopNav />
      <section className="view view-subjects">
        <div className="container">
          <div className="page-head anim">
            <nav className="crumbs">
              <Link to="/">الرئيسية</Link>
              <i className="sep">‹</i>
              <span className="cur">المكتبة</span>
            </nav>
            <h1>{university ? `مكتبة ${university}` : 'مكتبة المواد'}</h1>
            <p>
              {university
                ? 'مواد جامعتك جاهزة — افتح أي مادة وشاهد الشرح مباشرة بلا رفع ملف.'
                : 'أكمل بياناتك من الإعدادات لعرض مواد جامعتك تلقائياً.'}
            </p>
          </div>

          {loading && <p className="upload-filename">جارٍ تحميل المواد…</p>}
          {error && !loading && (
            <p className="upload-error" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && materials.length === 0 && (
            <div className="card lib-empty anim">
              <span className="s-icon">
                <Icon name="book-open" />
              </span>
              <h3>لا توجد مواد جاهزة بعد</h3>
              <p className="s-desc">
                {university
                  ? 'مواد جامعتك قيد الإضافة. تقدر تجرّب الأداة مباشرة برفع ملفك الآن.'
                  : 'أكمل بياناتك من الإعدادات، أو جرّب الأداة مباشرة برفع ملفك.'}
              </p>
              <Link className="btn" to="/analyze">
                <Icon name="sparkles" /> حلّل ملفاتك بنفسك
              </Link>
            </div>
          )}

          {!loading && !error && materials.length > 0 && (
            <div className="grid subjects">
              {materials.map((m) => (
                <MaterialCard material={m} key={m.id} />
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
