import React, { useState } from "react";
import Icon from "../../components/Icon";
import { defaultFilters, applyFilters, toArabicDigits, fmtRate } from "../../data/curriculum";

const FILTER_FIELDS = [
  { key: "rec", label: "حداثة المحتوى", opts: [["all", "أي وقت"], ["y1", "أحدث الشروحات"], ["y2", "آخر سنتين"]] },
  {
    key: "dur",
    label: "مدة الشرح",
    opts: [["all", "الكل"], ["lt5", "أقل من ٥ دقائق"], ["lt10", "أقل من ١٠ دقائق"], ["d10_20", "١٠ – ٢٠ دقيقة"], ["d20_40", "٢٠ – ٤٠ دقيقة"], ["gt40", "أكثر من ٤٠ دقيقة"]],
  },
  {
    key: "views",
    label: "عدد المشاهدات",
    opts: [["all", "الكل"], ["v5k", "أكثر من ٥٬٠٠٠ مشاهدة"], ["v15k", "أكثر من ١٥٬٠٠٠ مشاهدة"], ["v50k", "أكثر من ٥٠٬٠٠٠ مشاهدة"]],
  },
  { key: "rate", label: "تقييم الفيديو", opts: [["all", "الكل"], ["r40", "٤٫٠ فأعلى"], ["r45", "٤٫٥ فأعلى"]] },
];

function VideoCard({ video, onWatch }) {
  return (
    <div className="vid-card card anim">
      <div className="thumb" style={{ background: `linear-gradient(135deg,${video.g[0]},${video.g[1]})` }}>
        {video.thumbnail_url && (
          <img className="thumb-img" src={video.thumbnail_url} alt="" loading="lazy"
               onError={(e) => { e.currentTarget.style.display = "none"; }} />
        )}
        <span className="th-reason">
          <Icon name="sparkles" /> {video.reason}
        </span>
        {!video.thumbnail_url && (
          <span className="th-ic">
            <Icon name={video.icn} />
          </span>
        )}
        <button type="button" className="th-play" aria-label="تشغيل الشرح" onClick={() => onWatch(video)}>
          <Icon name="play" />
        </button>
        <span className="th-dur">{video.dur}</span>
      </div>
      <div className="v-info">
        <h4 className="v-title" dir="auto">
          {video.title}
        </h4>
        <div className="v-ch">
          <span className="ch-ava">{video.init}</span>
          <span className="ch-n">{video.ch}</span>
          {video.ver && (
            <span className="ver" title="قناة معتمدة">
              <Icon name="badge-check" />
            </span>
          )}
        </div>
        <div className="v-stats">
          <span>
            <Icon name="eye" /> {video.viewsT}
          </span>
          <span>
            <Icon name="calendar" /> {toArabicDigits(video.year)}
          </span>
          <span className="v-rate">
            <Icon name="star" filled /> {fmtRate(video.rate)}
          </span>
        </div>
        <div className="v-foot">
          <span className={`match ${video.match.cls}`}>مطابقة المنهج: {video.match.t}</span>
          <button type="button" className="v-watch" onClick={() => onWatch(video)}>
            <Icon name="play" /> مشاهدة
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoGrid({ videos, onWatch }) {
  const [filters, setFilters] = useState(defaultFilters());
  const visible = applyFilters(videos, filters);

  const setField = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const resetFilters = () => setFilters(defaultFilters());

  return (
    <>
      <div className="fbar card">
        <div className="fbar-head">
          <span className="fbar-t">
            <Icon name="filter" /> تصفية الشروحات
          </span>
          <button type="button" className="freset" onClick={resetFilters}>
            <Icon name="refresh" /> إعادة تعيين
          </button>
        </div>
        <div className="fbar-row">
          {FILTER_FIELDS.map((field) => (
            <label className="fsel" key={field.key}>
              <span>{field.label}</span>
              <span className="fsel-w">
                <select
                  aria-label={field.label}
                  value={filters[field.key]}
                  onChange={(e) => setField(field.key, e.target.value)}
                >
                  {field.opts.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Icon name="chev" className="fsel-ic" />
              </span>
            </label>
          ))}
          <button
            type="button"
            className={`fchip${filters.ver ? " on" : ""}`}
            aria-pressed={filters.ver}
            onClick={() => setField("ver", !filters.ver)}
          >
            <Icon name="badge-check" /> قناة معتمدة
          </button>
        </div>
        <p className="fcount">
          عرض {toArabicDigits(visible.length)} من {toArabicDigits(videos.length)} شرحاً مقترحاً
        </p>
      </div>
      <div className="grid vid-grid">
        {visible.length ? (
          visible.map((v, i) => <VideoCard video={v} onWatch={onWatch} key={i} />)
        ) : (
          <div className="v-empty">
            <Icon name="filter" />
            <p>لا توجد شروحات مطابقة للتصفية الحالية</p>
            <button type="button" className="btn ghost" onClick={resetFilters}>
              <Icon name="refresh" /> إعادة تعيين الفلاتر
            </button>
          </div>
        )}
      </div>
    </>
  );
}
