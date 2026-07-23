// تقويم أكاديمي مبسّط (S2 · POC) — نهايات الفصول لتفعيل «أنهيت الفصل» تلقائياً.
// في الإنتاج يُشتق من تقويم الجامعة الرسمي؛ هنا خريطة قابلة للتعديل.
export const TERM_CALENDAR = {
  '1447-1': '2026-01-15', // نهاية الفصل الأول
  '1447-2': '2026-05-30', // نهاية الفصل الثاني
  '1447-3': '2026-08-20', // نهاية الفصل الصيفي
};

export function termEndDate(term) {
  const iso = TERM_CALENDAR[term];
  return iso ? new Date(iso) : null;
}

// هل انتهى الفصل الدراسي؟ يُفعّل تدفق «أنهيت الفصل» تلقائياً من الموقع.
export function isTermEnded(term, today = new Date()) {
  const end = termEndDate(term);
  return end ? today >= end : false;
}
