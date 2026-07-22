-- ============================================================
-- I3 · المعالجة المسبقة والتخزين لمواد المكتبة (Closes #14)
-- إيضاح — سبرينت الهاكاثون (docs/HACKATHON_PLAN.md · قسم I3)
--
-- الفكرة: المادة المعتمدة (جدول materials من G1) تُعالَج مرة واحدة عبر
-- خط التحليل الحالي (chunk_slides → detect_topics → generate_summary →
-- generate_topic_analysis)، وتُخزَّن النتائج هنا. أي طالب بعدها يستهلك
-- المخزَّن بلا أي استدعاء جديد لـ Groq — أساس التوسع بلا حرق رصيد الـ API.
--
-- الجداول:
--   material_content — ناتج عام لكل مادة (تلخيص + وسم المعالجة) 1:1
--   material_topics  — مواضيع المادة (شرح + مثال) لكل موضوع N
--
-- يعتمد على G1 (#11). RLS: القراءة عامة (المواد المعتمدة محتوى عام)،
-- والكتابة عبر مفتاح service_role في خط الإدخال (يتجاوز RLS) — نمط C2/G1.
--
-- طريقة التطبيق: انسخ الملف كاملاً في SQL Editor بلوحة Supabase
-- وشغّله مرة واحدة، أو عبر: supabase db push
-- ============================================================

-- دالة updated_at (مُعرَّفة في G1؛ نعيد تعريفها ليبقى الملف ذاتيّ التطبيق)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- material_content — الناتج العام لكل مادة معالجة (1:1 مع materials)
-- summary:        تلخيص المادة كاملة (يظهر أعلى صفحة المادة)
-- source_excerpt: مقتطف النص المستخرج (إثبات أن المحتوى من المادة نفسها)
-- slide_count:    عدد الشرائح المستخرجة من الملف
-- ------------------------------------------------------------
create table if not exists public.material_content (
  material_id    uuid primary key references public.materials (id) on delete cascade,
  summary        text,
  language       text not null default 'ar',
  model          text,
  source_excerpt text,
  slide_count    integer not null default 0,
  processed_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- material_topics — مواضيع المادة (نتيجة detect_topics + التحليل)
-- صف لكل موضوع: عنوان + شرح + مثال، مرتّبة بـ topic_order.
-- تُخزَّن مرة واحدة وتُستهلك بلا استدعاء Groq جديد.
-- ------------------------------------------------------------
create table if not exists public.material_topics (
  id          uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  topic_order integer not null default 0,
  label       text not null check (length(btrim(label)) > 0),
  explanation text,
  example     text,
  created_at  timestamptz not null default now(),
  unique (material_id, topic_order)
);

create index if not exists material_topics_material_idx
  on public.material_topics (material_id, topic_order);

-- ------------------------------------------------------------
-- Trigger — لا يوجد updated_at في هذه الجداول (المحتوى ثابت بعد المعالجة)
-- نكتفي بـ processed_at/created_at. (materials.updated_at يُحدَّث من G1.)
-- ------------------------------------------------------------

-- ============================================================
-- Row Level Security — القراءة عامة، والكتابة عبر service_role فقط
-- ============================================================
alter table public.material_content enable row level security;
alter table public.material_topics enable row level security;

drop policy if exists "material_content_public_read" on public.material_content;
create policy "material_content_public_read" on public.material_content
  for select to anon, authenticated
  using (true);

drop policy if exists "material_topics_public_read" on public.material_topics;
create policy "material_topics_public_read" on public.material_topics
  for select to anon, authenticated
  using (true);

-- لا سياسات كتابة: الإدراج/التحديث يتم عبر مفتاح service_role في
-- backend/material_ingest.py الذي يتجاوز RLS (المعالجة مهمة خادمية).
