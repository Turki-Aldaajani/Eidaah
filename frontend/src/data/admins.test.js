import { isAdminEmail, ADMIN_EMAILS } from './admins';

test('isAdminEmail يميّز إيميل المشرف (بلا حساسية حالة/مسافات)', () => {
  const admin = ADMIN_EMAILS[0];
  expect(isAdminEmail(admin)).toBe(true);
  expect(isAdminEmail(`  ${admin.toUpperCase()}  `)).toBe(true);
});

test('isAdminEmail يرفض غير المشرف والفارغ', () => {
  expect(isAdminEmail('someone@gmail.com')).toBe(false);
  expect(isAdminEmail('')).toBe(false);
  expect(isAdminEmail(null)).toBe(false);
});
