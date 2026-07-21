-- ============================================================
-- C2 · سكيما المناهج + المحتوى المعالج (Closes #50)
-- إيضاح — سبرينت الهاكاثون (docs/HACKATHON_PLAN.md · قسم C2)
--
-- الجداول:
--   curriculum_units          — وحدات المنهج (اسم الوحدة كما في الكتاب)
--   curriculum_lessons        — دروس كل وحدة + حالة المعالجة ومسار المحتوى
--   curriculum_lesson_content — ناتج المعالجة (شرح + تلخيص) لكل درس
--
-- يعتمد على G1 (#11) ويعيد استخدام خط المعالجة I3 (#14) عبر
-- backend/curriculum_ingest.py الذي يملأ هذه الجداول من الكتب الحقيقية.
--
-- RLS: القراءة عامة لمحتوى المنهج (محتوى تعليمي عام)، والكتابة عبر
-- مفتاح service_role في خط الإدخال (يتجاوز RLS) — نفس نمط G1.
--
-- طريقة التطبيق: انسخ الملف كاملاً في SQL Editor بلوحة Supabase
-- وشغّله مرة واحدة، أو عبر: supabase db push
-- ============================================================

-- ------------------------------------------------------------
-- دالة تحديث updated_at (مُعرَّفة أيضاً في G1 — نعيد تعريفها هنا
-- ليبقى هذا الملف قابلاً للتطبيق بذاته)
-- ------------------------------------------------------------
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
-- curriculum_units — وحدات المنهج
-- subject: مفتاح ثابت للمادة (math / arabic / digital_skills)
-- stage:   معرّف المرحلة كما في الواجهة (m1 / m2 / m3 …)
-- unit_name: اسم الوحدة الحقيقي كما ورد في فهرس الكتاب (لا placeholder)
-- unit_order: ترتيب الوحدة داخل المادة (حقل «order» في بطاقة المهمة —
--             order كلمة محجوزة في SQL لذا سُمّي unit_order)
-- ------------------------------------------------------------
create table if not exists public.curriculum_units (
  id         uuid primary key default gen_random_uuid(),
  unit_name  text not null check (length(btrim(unit_name)) > 0),
  subject    text not null,
  stage      text not null,
  semester   smallint not null default 1 check (semester in (1, 2)),
  unit_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject, stage, semester, unit_name)
);

create index if not exists curriculum_units_scope_idx
  on public.curriculum_units (subject, stage, semester, unit_order);

-- ------------------------------------------------------------
-- curriculum_lessons — دروس الوحدة
-- lesson_title: عنوان الدرس الحقيقي كما ورد في الكتاب (لا placeholder)
-- content_url:  مسار المحتوى المعالج (كائن في Supabase Storage)
-- processed:    يصبح true بعد تخزين ناتج المعالجة في curriculum_lesson_content
-- ------------------------------------------------------------
create table if not exists public.curriculum_lessons (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references public.curriculum_units (id) on delete cascade,
  lesson_title text not null check (length(btrim(lesson_title)) > 0),
  lesson_order integer not null default 0,
  content_url  text,
  processed    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (unit_id, lesson_title)
);

create index if not exists curriculum_lessons_unit_idx
  on public.curriculum_lessons (unit_id, lesson_order);
create index if not exists curriculum_lessons_processed_idx
  on public.curriculum_lessons (processed);

-- ------------------------------------------------------------
-- curriculum_lesson_content — ناتج المعالجة (I3) لكل درس
-- صف واحد لكل درس (1:1). يخزَّن مرة واحدة ويُستهلك بلا استدعاء Groq جديد.
-- explanation + summary هما «المحتوى المعالج» الذي يظهر في الواجهة.
-- source_excerpt: مقتطف النص المستخرج من الكتاب الذي بُنيت عليه المعالجة
--                 (إثبات أن المحتوى «من الكتاب» لا مولّد من فراغ).
-- ------------------------------------------------------------
create table if not exists public.curriculum_lesson_content (
  lesson_id      uuid primary key references public.curriculum_lessons (id) on delete cascade,
  explanation    text,
  summary        text,
  example        text,
  source_excerpt text,
  model          text,
  processed_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Triggers — تحديث updated_at تلقائياً
-- ------------------------------------------------------------
drop trigger if exists curriculum_units_set_updated_at on public.curriculum_units;
create trigger curriculum_units_set_updated_at
  before update on public.curriculum_units
  for each row execute function public.set_updated_at();

drop trigger if exists curriculum_lessons_set_updated_at on public.curriculum_lessons;
create trigger curriculum_lessons_set_updated_at
  before update on public.curriculum_lessons
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security — القراءة عامة لمحتوى المنهج، والكتابة عبر service_role
-- ============================================================
alter table public.curriculum_units enable row level security;
alter table public.curriculum_lessons enable row level security;
alter table public.curriculum_lesson_content enable row level security;

drop policy if exists "curriculum_units_public_read" on public.curriculum_units;
create policy "curriculum_units_public_read" on public.curriculum_units
  for select to anon, authenticated
  using (true);

drop policy if exists "curriculum_lessons_public_read" on public.curriculum_lessons;
create policy "curriculum_lessons_public_read" on public.curriculum_lessons
  for select to anon, authenticated
  using (true);

drop policy if exists "curriculum_lesson_content_public_read" on public.curriculum_lesson_content;
create policy "curriculum_lesson_content_public_read" on public.curriculum_lesson_content
  for select to anon, authenticated
  using (true);
