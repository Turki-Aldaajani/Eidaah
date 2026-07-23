// طبقة حوكمة رفع المواد (مهمة I2): طلبات الطلاب ومراجعة الأدمن.
// الطالب يرسل طلباً (pending)؛ الأدمن يقبل (يُدرج المادة في المكتبة) أو يرفض.
// الصلاحيات محروسة بـ RLS (is_admin())؛ الواجهة تحرس العرض فقط.
import { getSupabaseClient } from './supabaseClient';

export { submitMaterialRequest } from './supabaseClient';

// قائمة الطلبات المعلّقة (للأدمن) — RLS يسمح للأدمن برؤية كل الطلبات.
export async function fetchPendingRequests() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('material_requests')
    .select('id, title, description, university, college, major, level, file_path, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) {
    throw new Error(`تعذّر تحميل الطلبات: ${error.message}`);
  }
  return data || [];
}

// قبول طلب: يُدرج المادة في المكتبة (scope=library) ثم يعلّم الطلب approved.
// المادة تظهر بالمكتبة (F2)؛ معالجتها (I3) خطوة خادمية لاحقة.
export async function approveRequest(request) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: material, error: matErr } = await supabase
    .from('materials')
    .insert({
      title: request.title,
      description: request.description,
      university: request.university,
      college: request.college,
      major: request.major,
      level: request.level,
      file_path: request.file_path,
      scope: 'library',
      processing_status: 'pending',
      created_by: user?.id || null,
    })
    .select('id')
    .single();
  if (matErr) {
    throw new Error(`تعذّر إنشاء المادة: ${matErr.message}`);
  }

  const { error: reqErr } = await supabase
    .from('material_requests')
    .update({
      status: 'approved',
      material_id: material.id,
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', request.id);
  if (reqErr) {
    throw new Error(`تعذّر تحديث الطلب: ${reqErr.message}`);
  }
  return material.id;
}

// رفض طلب مع سبب اختياري.
export async function rejectRequest(requestId, note = null) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('material_requests')
    .update({
      status: 'rejected',
      review_note: note,
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  if (error) {
    throw new Error(`تعذّر رفض الطلب: ${error.message}`);
  }
}
