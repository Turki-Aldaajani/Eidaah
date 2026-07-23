// طبقة بيانات النقاط (مهمة F6) — قراءة الرصيد وتسجيل نقاط في جدول points_ledger.
// الرصيد = مجموع points لصفوف المستخدم. سياسة RLS في سكيما G1 تقصر
// القراءة والكتابة على صاحب الصفوف فقط.
import { getSupabaseClient } from './supabaseClient';

// النقاط لكل سبب. الأسباب مطابقة لتعليق سكيما G1 على points_ledger.reason
// (completed_material · completed_quiz_round) — لا نكافئ سبباً غير معروف.
export const POINTS_BY_REASON = {
  completed_quiz_round: 10,
  completed_material: 25,
};

// ثلاثة مستويات (النطاق الضيق المتفق عليه في F6): كل مستوى يبدأ من min نقطة.
export const LEVELS = [
  { level: 1, name: 'مُبتدئ', min: 0 },
  { level: 2, name: 'مُثابِر', min: 50 },
  { level: 3, name: 'مُتمكّن', min: 150 },
];

// المستوى المقابل لرصيد معيّن: أعلى مستوى min-هُ ≤ الرصيد.
export function levelForBalance(balance) {
  const b = Number.isFinite(balance) ? balance : 0;
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (b >= lvl.min) current = lvl;
  }
  return current;
}

// نقاط سبب معيّن (0 لسبب مجهول).
export function pointsForReason(reason) {
  return POINTS_BY_REASON[reason] || 0;
}

// رصيد المستخدم = مجموع كل صفوفه في points_ledger. يرجع 0 بدون جلسة.
export async function fetchPointsBalance() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data, error } = await supabase
    .from('points_ledger')
    .select('points')
    .eq('user_id', user.id);
  if (error) {
    throw new Error(`تعذّر تحميل رصيد النقاط: ${error.message}`);
  }
  return (data || []).reduce((sum, row) => sum + (row.points || 0), 0);
}

// تسجيل نقاط لسبب معيّن في points_ledger. يرجع النقاط المُسجَّلة
// (0 إذا كان السبب مجهولاً أو لا توجد جلسة).
export async function awardPoints(reason, { materialId = null } = {}) {
  const points = pointsForReason(reason);
  if (points <= 0) return 0;
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { error } = await supabase.from('points_ledger').insert({
    user_id: user.id,
    points,
    reason,
    material_id: materialId,
  });
  if (error) {
    throw new Error(`تعذّر تسجيل النقاط: ${error.message}`);
  }
  return points;
}
