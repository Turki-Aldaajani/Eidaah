// مصادقة OTP عبر الإيميل (مهمة I1) — Supabase Auth بدون باسوورد.
// الإيميل الجامعي يفتح مكتبة الجامعة، وأي إيميل آخر يدخل بالتجربة الحرة.
import { getSupabaseClient } from './supabaseClient';

// الجامعات المعروفة بالاسم — أي نطاق .edu.sa آخر يُعد جامعياً أيضاً
const UNIVERSITY_DOMAINS = {
  'imamu.edu.sa': 'جامعة الإمام محمد بن سعود الإسلامية',
  'ksu.edu.sa': 'جامعة الملك سعود',
  'kau.edu.sa': 'جامعة الملك عبدالعزيز',
  'kfupm.edu.sa': 'جامعة الملك فهد للبترول والمعادن',
  'pnu.edu.sa': 'جامعة الأميرة نورة',
};

// أخطاء Supabase قد تصل برسالة فارغة أو "{}" (مثل فشل SMTP بخطأ 500)
function describeAuthError(error) {
  const message = String(error?.message || '').trim();
  if (message && message !== '{}') return message;
  return `خطأ من الخادم${error?.status ? ` (${error.status})` : ''} — جرّب لاحقاً أو راجع إعدادات الإرسال`;
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

// نوع الحساب حسب نطاق الإيميل:
// { type: 'university', university } للنطاقات الجامعية — { type: 'free' } لغيرها
export function accountTypeFor(email) {
  const normalized = normalizeEmail(email);
  const domain = normalized.split('@')[1] || '';
  if (UNIVERSITY_DOMAINS[domain]) {
    return { type: 'university', university: UNIVERSITY_DOMAINS[domain] };
  }
  if (domain.endsWith('.edu.sa')) {
    return { type: 'university', university: null };
  }
  return { type: 'free' };
}

// الخطوة ١: إرسال رمز التحقق إلى الإيميل (ينشئ الحساب تلقائياً إن لم يوجد)
export async function sendOtpCode(email) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error('أدخل بريداً إلكترونياً صحيحاً');
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: { shouldCreateUser: true },
  });
  if (error) {
    throw new Error(`تعذّر إرسال رمز التحقق: ${describeAuthError(error)}`);
  }
  return { email: normalized };
}

// الخطوة ٢: التحقق من الرمز — نجاحها ينشئ جلسة تبقى بعد إعادة التحميل
// (supabase-js يخزنها في localStorage ويجددها تلقائياً)
export async function verifyOtpCode(email, code) {
  const normalized = normalizeEmail(email);
  const token = String(code || '').trim();
  if (!token) {
    throw new Error('أدخل رمز التحقق المرسل إلى بريدك');
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalized,
    token,
    type: 'email',
  });
  if (error) {
    throw new Error(`رمز غير صحيح أو منتهي: ${describeAuthError(error)}`);
  }
  return data.session;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`تعذّر تسجيل الخروج: ${error.message}`);
  }
}

export async function getCurrentSession() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

// الاشتراك بتغيّرات الجلسة (دخول/خروج/تجديد) — ترجع دالة إلغاء الاشتراك
export function onAuthChange(callback) {
  const supabase = getSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session || null);
  });
  return () => data.subscription.unsubscribe();
}
