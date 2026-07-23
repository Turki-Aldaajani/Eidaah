// قائمة إيميلات الأدمن للواجهة (إظهار/إخفاء صفحة الأدمن فقط).
// الأمان الفعلي في RLS عبر دالة is_admin() في:
//   supabase/migrations/20260723100000_i2_governance.sql
// أبقِ القائمتين متوافقتين.
export const ADMIN_EMAILS = ['azozdhaif@gmail.com'];

export function isAdminEmail(email) {
  return Boolean(email) && ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
}
