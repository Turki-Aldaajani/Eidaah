// عميل Supabase للواجهة (مهمة G1) — يخدم I1 وF2 وF6 لاحقاً.
// المفاتيح من frontend/.env (انظر .env.example وsupabase/README.md).
import { createClient } from '@supabase/supabase-js';

// عميل Supabase يريد أصل المشروع فقط (https://<ref>.supabase.co). لو أضيف
// مسار زائد بالخطأ في متغيّر البيئة (مثل .../rest/v1/) تفشل نداءات المصادقة بـ
// «Invalid path specified in request URL». نأخذ الأصل فقط لنكون محصّنين.
export function normalizeSupabaseUrl(url) {
  if (!url) return url;
  const trimmed = String(url).trim();
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

const SUPABASE_URL = normalizeSupabaseUrl(process.env.REACT_APP_SUPABASE_URL);
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

let client = null;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase غير مهيأ: عرّف REACT_APP_SUPABASE_URL وREACT_APP_SUPABASE_ANON_KEY في frontend/.env (انظر supabase/README.md)'
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

// عملية القراءة التجريبية (معيار قبول G1):
// المواد المعتمدة قراءتها عامة حسب سياسة RLS — بدون تسجيل دخول.
export async function fetchMaterials({ limit = 20 } = {}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('materials')
    .select('id, title, description, university, college, major, level, processing_status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(`تعذّرت قراءة المواد: ${error.message}`);
  }
  return data;
}

// عملية الكتابة التجريبية (معيار قبول G1):
// الكتابة للمسجلين فقط — تسجيل طلب مادة بحالة pending (حوكمة I2).
export async function submitMaterialRequest({
  title,
  description = null,
  university = null,
  college = null,
  major = null,
  level = null,
  filePath = null,
}) {
  if (!title) {
    throw new Error('عنوان المادة مطلوب');
  }
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('الكتابة للمسجلين فقط: سجّل الدخول قبل إرسال طلب مادة');
  }
  const { data, error } = await supabase
    .from('material_requests')
    .insert({
      requester_id: user.id,
      title,
      description,
      university,
      college,
      major,
      level,
      file_path: filePath,
      status: 'pending',
    })
    .select()
    .single();
  if (error) {
    throw new Error(`تعذّر تسجيل طلب المادة: ${error.message}`);
  }
  return data;
}
