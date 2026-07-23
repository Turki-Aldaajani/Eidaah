-- ============================================================
-- S2 · كتالوج المقررات + اختيار الطالب + دورة الفصل (Closes #44)
-- إيضاح — سبرينت الهاكاثون (docs/HACKATHON_PLAN.md · قسم موادي)
--
-- الرؤية (من واقع كلية الحاسب بجامعة الإمام): «موادي» = مقررات الطالب
-- المختارة للفصل، لا مجرّد ملفات مرفوعة. الخطط تختلف بين الدفعات،
-- والأهلية تحكمها متطلبات كل مقرر (لا رقم المستوى وحده)، وفيه مقررات
-- إجبارية وحرة (تحتاج متطلب) واختيارية بحتة.
--
-- يتعايش مع S1 (المواد الشخصية المرفوعة + progress) لا يكرّره: المقرر
-- المختار يفتح إما محتوى منسّق (I3 · scope=library) أو مادة الطالب
-- المرفوعة (S1 · scope=personal) أو الأداة المباشرة.
--
-- الجداول:
--   courses               — كتالوج المقررات (منسّق + إضافة الطالب)
--   course_prerequisites  — متطلبات كل مقرر (حواف رسم موجّه)
--   student_courses       — اختيار الطالب لكل فصل + حالته
--   + profiles: cohort_year (سنة الدفعة) و current_term (الفصل الحالي)
--
-- RLS: الكتالوج قراءته عامة؛ الطالب يضيف مقرراته الخاصة، ويملك اختياره
-- كاملاً. المنسّق يُكتب عبر service_role. طريقة التطبيق: SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- profiles — سنة الدفعة والفصل الحالي (أساس الفلترة ودورة الفصل)
-- ------------------------------------------------------------
alter table public.profiles add column if not exists cohort_year  smallint;
alter table public.profiles add column if not exists current_term text;

-- ------------------------------------------------------------
-- courses — كتالوج المقررات
-- university = null: مقرر عام صالح لأي طالب (يدعم التوسّع لأي جامعة بلا كاتالوج)
-- elective_type: required (إجباري) / free_elective (حرة تحتاج متطلب) /
--                pure_elective (اختيارية بحتة بلا متطلب)
-- is_curated=false + created_by=uid: مقرر أضافه الطالب بنفسه
-- ------------------------------------------------------------
create table if not exists public.courses (
  id            uuid primary key default gen_random_uuid(),
  code          text,
  name          text not null check (length(btrim(name)) > 0),
  description   text,
  university    text,
  college       text,
  major         text,
  cohort_year   smallint,
  default_level smallint check (default_level between 1 and 12),
  elective_type text not null default 'required'
    check (elective_type in ('required', 'free_elective', 'pure_elective')),
  is_curated    boolean not null default false,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists courses_scope_idx
  on public.courses (university, college, cohort_year, default_level);
create index if not exists courses_owner_idx
  on public.courses (created_by);

-- ------------------------------------------------------------
-- course_prerequisites — متطلبات المقرر (مقرر يحتاج إتمام مقرر آخر)
-- ------------------------------------------------------------
create table if not exists public.course_prerequisites (
  course_id              uuid not null references public.courses (id) on delete cascade,
  prerequisite_course_id uuid not null references public.courses (id) on delete cascade,
  primary key (course_id, prerequisite_course_id),
  check (course_id <> prerequisite_course_id)
);

-- ------------------------------------------------------------
-- student_courses — اختيار الطالب لكل فصل + حالة المقرر
-- status: in_progress (جارٍ) / completed (مكتمل) / dropped (محذوف) / failed (راسب)
-- term: وسم الفصل (مثل "1447-1") — أساس دورة الفصل وreset الملف
-- ------------------------------------------------------------
create table if not exists public.student_courses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  course_id  uuid not null references public.courses (id) on delete cascade,
  term       text not null,
  status     text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'dropped', 'failed')),
  added_at   timestamptz not null default now(),
  unique (user_id, course_id, term)
);

create index if not exists student_courses_user_term_idx
  on public.student_courses (user_id, term);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.courses enable row level security;
alter table public.course_prerequisites enable row level security;
alter table public.student_courses enable row level security;

-- courses: قراءة عامة (الكتالوج مشترك)، والطالب يضيف مقرراته الخاصة فقط
drop policy if exists "courses_public_read" on public.courses;
create policy "courses_public_read" on public.courses
  for select to anon, authenticated
  using (true);

drop policy if exists "courses_student_insert" on public.courses;
create policy "courses_student_insert" on public.courses
  for insert to authenticated
  with check (created_by = auth.uid() and is_curated = false);

drop policy if exists "courses_student_delete_own" on public.courses;
create policy "courses_student_delete_own" on public.courses
  for delete to authenticated
  using (created_by = auth.uid() and is_curated = false);

-- course_prerequisites: قراءة عامة؛ الكتابة عبر service_role (المنسّق)
drop policy if exists "course_prereq_public_read" on public.course_prerequisites;
create policy "course_prereq_public_read" on public.course_prerequisites
  for select to anon, authenticated
  using (true);

-- student_courses: الطالب يملك اختياره كاملاً (قراءة/إضافة/تعديل/حذف)
drop policy if exists "student_courses_select_own" on public.student_courses;
create policy "student_courses_select_own" on public.student_courses
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "student_courses_insert_own" on public.student_courses;
create policy "student_courses_insert_own" on public.student_courses
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "student_courses_update_own" on public.student_courses;
create policy "student_courses_update_own" on public.student_courses
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "student_courses_delete_own" on public.student_courses;
create policy "student_courses_delete_own" on public.student_courses
  for delete to authenticated
  using (user_id = auth.uid());
