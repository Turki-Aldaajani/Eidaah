// طبقة بيانات المقررات واختيار الطالب (مهمة S2) — كتالوج منسّق + إضافة الطالب.
// «موادي» = مقررات الطالب المختارة للفصل، بمتطلبات وأنواع (إجباري/حر/اختياري).
import { getSupabaseClient } from './supabaseClient';

const COURSE_COLS =
  'id, code, name, description, university, college, major, cohort_year, default_level, elective_type, is_curated, created_by';

export const ELECTIVE_LABELS = {
  required: 'إجباري',
  free_elective: 'حر (يحتاج متطلب)',
  pure_elective: 'اختياري',
};

export function electiveLabel(type) {
  return ELECTIVE_LABELS[type] || '';
}

// مقرر بلا متطلبات = متاح دائماً؛ وإلا يتطلب إتمام كل متطلباته.
export function isCourseUnlocked(course, completedCourseIds = []) {
  const prereqs = course?.prerequisites || [];
  if (prereqs.length === 0) return true;
  const done = new Set(completedCourseIds);
  return prereqs.every((pid) => done.has(pid));
}

async function currentUser(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// كتالوج مقررات الجامعة (المنسّقة) + مقررات الطالب المضافة، مع متطلبات كل مقرر.
export async function fetchCourseCatalog({ university = null } = {}) {
  const supabase = getSupabaseClient();
  const user = await currentUser(supabase);

  const collected = new Map();
  if (university) {
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_COLS)
      .eq('university', university);
    if (error) throw new Error(`تعذّر تحميل المقررات: ${error.message}`);
    (data || []).forEach((c) => collected.set(c.id, c));
  }
  if (user) {
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_COLS)
      .eq('created_by', user.id);
    if (error) throw new Error(`تعذّر تحميل مقرراتك: ${error.message}`);
    (data || []).forEach((c) => collected.set(c.id, c));
  }

  const courses = [...collected.values()];
  const ids = courses.map((c) => c.id);
  const prereqMap = {};
  if (ids.length) {
    const { data, error } = await supabase
      .from('course_prerequisites')
      .select('course_id, prerequisite_course_id')
      .in('course_id', ids);
    if (error) throw new Error(`تعذّر تحميل المتطلبات: ${error.message}`);
    (data || []).forEach((p) => {
      (prereqMap[p.course_id] = prereqMap[p.course_id] || []).push(p.prerequisite_course_id);
    });
  }
  return courses.map((c) => ({ ...c, prerequisites: prereqMap[c.id] || [] }));
}

// الطالب يضيف مقرراً خاصاً (غير منسّق) — لأي جامعة/كورس خارج الكتالوج.
export async function addCustomCourse({
  name,
  code = null,
  university = null,
  college = null,
  major = null,
  level = null,
  electiveType = 'required',
}) {
  if (!name || !name.trim()) throw new Error('اسم المقرر مطلوب');
  const supabase = getSupabaseClient();
  const user = await currentUser(supabase);
  if (!user) throw new Error('سجّل الدخول لإضافة مقرر');
  const { data, error } = await supabase
    .from('courses')
    .insert({
      name: name.trim(),
      code: code || null,
      university,
      college,
      major,
      default_level: level || null,
      elective_type: electiveType,
      is_curated: false,
      created_by: user.id,
    })
    .select(COURSE_COLS)
    .single();
  if (error) throw new Error(`تعذّر إضافة المقرر: ${error.message}`);
  return { ...data, prerequisites: [] };
}

// اختيار الطالب لهذا الفصل (مع بيانات المقرر المرتبط).
export async function fetchStudentCourses(term) {
  const supabase = getSupabaseClient();
  const user = await currentUser(supabase);
  if (!user) return [];
  const { data, error } = await supabase
    .from('student_courses')
    .select(`id, status, term, added_at, course:course_id (${COURSE_COLS})`)
    .eq('user_id', user.id)
    .eq('term', term)
    .order('added_at', { ascending: true });
  if (error) throw new Error(`تعذّر تحميل موادك: ${error.message}`);
  return data || [];
}

export async function selectCourse(courseId, term) {
  const supabase = getSupabaseClient();
  const user = await currentUser(supabase);
  if (!user) throw new Error('سجّل الدخول لإضافة مقرر');
  const { data, error } = await supabase
    .from('student_courses')
    .insert({ user_id: user.id, course_id: courseId, term, status: 'in_progress' })
    .select('id, status, term')
    .single();
  if (error) throw new Error(`تعذّر إضافة المقرر لموادك: ${error.message}`);
  return data;
}

// إضافة مجمّعة: كل المقررات المحددة في طلب واحد (تخفّف تكرار الاتصالات).
export async function selectCourses(courseIds, term) {
  const ids = [...new Set(courseIds)].filter(Boolean);
  if (ids.length === 0) return [];
  const supabase = getSupabaseClient();
  const user = await currentUser(supabase);
  if (!user) throw new Error('سجّل الدخول لإضافة مقررات');
  const rows = ids.map((id) => ({
    user_id: user.id,
    course_id: id,
    term,
    status: 'in_progress',
  }));
  const { data, error } = await supabase
    .from('student_courses')
    .insert(rows)
    .select('id, course_id, status');
  if (error) throw new Error(`تعذّر إضافة المقررات: ${error.message}`);
  return data || [];
}

export async function unselectCourse(courseId, term) {
  const supabase = getSupabaseClient();
  const user = await currentUser(supabase);
  if (!user) throw new Error('سجّل الدخول أولاً');
  const { error } = await supabase
    .from('student_courses')
    .delete()
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .eq('term', term);
  if (error) throw new Error(`تعذّر حذف المقرر: ${error.message}`);
}

// تحديث حالة مقرر (دورة الفصل: مكتمل/محذوف/راسب).
export async function updateStudentCourseStatus(studentCourseId, status) {
  const supabase = getSupabaseClient();
  const user = await currentUser(supabase);
  if (!user) throw new Error('سجّل الدخول أولاً');
  const { data, error } = await supabase
    .from('student_courses')
    .update({ status })
    .eq('id', studentCourseId)
    .eq('user_id', user.id)
    .select('id, status')
    .single();
  if (error) throw new Error(`تعذّر تحديث حالة المقرر: ${error.message}`);
  return data;
}
