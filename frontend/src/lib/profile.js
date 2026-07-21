// طبقة بيانات الملف الشخصي (مهمة F1) — قراءة/حفظ صف المستخدم في جدول profiles.
// الصف يُنشأ تلقائياً عند التسجيل (trigger في سكيما G1)، فالحفظ upsert آمن.
import { getSupabaseClient } from './supabaseClient';

export const PROFILE_FIELDS = ['university', 'college', 'major', 'level'];

// الأونبوردنق يُعد «مكتملاً» بوجود الجامعة والمستوى — هما ما يفلتر المكتبة.
export function isProfileComplete(profile) {
  return Boolean(profile && profile.university && profile.level);
}

// تذكّر تخطّي الأونبوردنق لكل مستخدم حتى لا نلاحقه بعد كل إعادة تحميل.
const SKIP_KEY_PREFIX = 'eidaah-onboarding-skipped:';

export function markOnboardingSkipped(userId) {
  if (userId) localStorage.setItem(SKIP_KEY_PREFIX + userId, '1');
}

export function hasSkippedOnboarding(userId) {
  return Boolean(userId && localStorage.getItem(SKIP_KEY_PREFIX + userId) === '1');
}

export function clearOnboardingSkip(userId) {
  if (userId) localStorage.removeItem(SKIP_KEY_PREFIX + userId);
}

// تطبيع قيمة حقل قبل الحفظ: قص النصوص، الفارغ → null، والمستوى رقم.
function normalizeField(key, value) {
  if (key === 'level') {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value ?? null;
}

export async function fetchProfile() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, university, college, major, level')
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    throw new Error(`تعذّر تحميل الملف الشخصي: ${error.message}`);
  }
  return data;
}

// يحفظ الحقول الممرّرة فقط (يسمح بتحديث جزئي من الإعدادات).
export async function saveProfile(fields) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('يجب تسجيل الدخول لحفظ بياناتك');
  }
  const payload = { id: user.id };
  for (const key of PROFILE_FIELDS) {
    if (key in fields) {
      payload[key] = normalizeField(key, fields[key]);
    }
  }
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, university, college, major, level')
    .single();
  if (error) {
    throw new Error(`تعذّر حفظ البيانات: ${error.message}`);
  }
  return data;
}
