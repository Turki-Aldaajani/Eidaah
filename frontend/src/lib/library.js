// استعلامات مكتبة المواد (مهمة F2) — قراءة فقط من Supabase، بلا أي استدعاء Groq.
// تعرض المواد المخزّنة مسبقاً (I3) وتفلترها حسب بيانات الأونبوردنق (F1).
import { getSupabaseClient } from './supabaseClient';

// قائمة مواد المكتبة، مفلترة تلقائياً حسب جامعة/مستوى الطالب إن توفّرا.
export async function fetchLibraryMaterials({ university = null, level = null } = {}) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('materials')
    .select('id, title, description, university, college, major, level, processing_status')
    .order('created_at', { ascending: false });
  if (university) query = query.eq('university', university);
  if (level) query = query.eq('level', level);
  const { data, error } = await query;
  if (error) {
    throw new Error(`تعذّر تحميل مواد المكتبة: ${error.message}`);
  }
  return data || [];
}

// مادة واحدة + محتواها المعالج مسبقاً (تلخيص + مواضيع بشرح ومثال).
// قراءة مخزّن فقط — لا يستدعي Groq إطلاقاً (جوهر I3/F2).
export async function fetchMaterialWithContent(materialId) {
  const supabase = getSupabaseClient();

  const { data: material, error: matErr } = await supabase
    .from('materials')
    .select('id, title, description, university, college, major, level, processing_status')
    .eq('id', materialId)
    .maybeSingle();
  if (matErr) {
    throw new Error(`تعذّر تحميل المادة: ${matErr.message}`);
  }
  if (!material) return null;

  const { data: content } = await supabase
    .from('material_content')
    .select('summary, language, slide_count')
    .eq('material_id', materialId)
    .maybeSingle();

  const { data: topics, error: topErr } = await supabase
    .from('material_topics')
    .select('topic_order, label, explanation, example')
    .eq('material_id', materialId)
    .order('topic_order', { ascending: true });
  if (topErr) {
    throw new Error(`تعذّر تحميل مواضيع المادة: ${topErr.message}`);
  }

  const topicList = topics || [];
  return {
    ...material,
    isProcessed:
      material.processing_status === 'processed' && topicList.length > 0,
    summary: content?.summary || null,
    slideCount: content?.slide_count || 0,
    topics: topicList,
  };
}
