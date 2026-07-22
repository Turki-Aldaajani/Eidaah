// صفحة المادة (مهمة F2): تعرض الشرح المخزَّن مسبقاً (I3) بلا رفع ملف وبلا Groq.
// المادة غير المعالَجة تعرض بديلاً: زر لتحليل ملفك مباشرة (إثبات المفهوم).
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../Footer';
import Icon from '../components/Icon';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { fetchMaterialWithContent } from '../lib/library';
import { levelLabel } from '../data/academicOptions';

function TopicBlock({ topic }) {
  return (
    <div className="result-explain-box lib-topic">
      <h3 className="lib-topic-label">{topic.label}</h3>
      {topic.explanation && (
        <>
          <h4>شرح تحليلي:</h4>
          <p>{topic.explanation}</p>
        </>
      )}
      {topic.example && (
        <>
          <h4>مثال واقعي:</h4>
          <p>{topic.example}</p>
        </>
      )}
    </div>
  );
}

export default function MaterialView() {
  const { materialId } = useParams();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('المادة غير متاحة: Supabase غير مهيأ.');
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError('');
    setNotFound(false);
    fetchMaterialWithContent(materialId)
      .then((data) => {
        if (!active) return;
        if (!data) setNotFound(true);
        else setMaterial(data);
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
  }, [materialId]);

  const title = material?.title || 'المادة';
  const meta = material
    ? [material.college, material.major, material.level ? levelLabel(material.level) : null]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <>
      <TopNav />
      <section className="view view-subjects">
        <div className="container">
          <div className="page-head anim">
            <nav className="crumbs">
              <Link to="/">الرئيسية</Link>
              <i className="sep">‹</i>
              <Link to="/library">المكتبة</Link>
              <i className="sep">‹</i>
              <span className="cur">{title}</span>
            </nav>
          </div>

          {loading && <p className="upload-filename">جارٍ تحميل المادة…</p>}
          {error && !loading && (
            <p className="upload-error" role="alert">
              {error}
            </p>
          )}
          {notFound && !loading && (
            <div className="card lib-empty anim">
              <h3>المادة غير موجودة</h3>
              <Link className="btn ghost" to="/library">
                <Icon name="arrow" /> رجوع للمكتبة
              </Link>
            </div>
          )}

          {!loading && !error && material && (
            <>
              <div className="page-head anim">
                <h1>{title}</h1>
                {meta && <p>{meta}</p>}
              </div>

              {material.isProcessed ? (
                <div className="lib-content anim">
                  {material.summary && (
                    <div className="card result-card lib-summary">
                      <h2>ملخّص المادة</h2>
                      <p>{material.summary}</p>
                      {material.slideCount > 0 && (
                        <span className="s-meta">{material.slideCount} شرائح معالَجة</span>
                      )}
                    </div>
                  )}
                  <div className="card result-card">
                    <h2>مواضيع المادة</h2>
                    {material.topics.map((topic) => (
                      <TopicBlock topic={topic} key={topic.topic_order} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card lib-empty anim">
                  <span className="s-icon">
                    <Icon name="sparkles" />
                  </span>
                  <h3>هذه المادة لم تُعالَج بعد</h3>
                  <p className="s-desc">
                    محتوى هذه المادة قيد التجهيز. تقدر تجرّب أداة إيضاح مباشرة برفع ملفك الآن
                    وتحصل على الشرح فوراً.
                  </p>
                  <Link className="btn" to="/analyze">
                    <Icon name="sparkles" /> حلّل ملفاتك بنفسك
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
