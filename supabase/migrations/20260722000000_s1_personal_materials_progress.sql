-- ============================================================
-- S1 · المواد الشخصية وتتبع التقدم — امتداد السكيما (Closes #43)
-- إيضاح — سبرينت الهاكاثون (docs/HACKATHON_PLAN.md)
--
-- امتداد فوق G1 (20260716000000_g1_init_schema.sql):
--   • materials: عمودا owner_id و scope
--     (library للمكتبة العامة / personal لمواد الطالب الخاصة).
--   • progress: تتبّع تقدم الطالب في كل مادة
--     (الشرائح المكتملة، متوسط أسئلة المراجعة، آخر نشاط).
--
-- سياسة الخصوصية (معيار القبول): المادة الشخصية لا تظهر لغير صاحبها.
--
-- طريقة التطبيق: شغّله بعد G1 في SQL Editor بلوحة Supabase
-- أو عبر: supabase db push  (راجع supabase/README.md)
-- ============================================================

-- ------------------------------------------------------------
-- materials — امتداد: مالك المادة، وهل هي عامة (library) أم خاصة (personal)
-- الافتراضي library حتى تبقى كل مواد G1 الحالية عامة كما هي
-- ------------------------------------------------------------
alter table public.materials
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

alter table public.materials
  add column if not exists scope text not null default 'library'
    check (scope in ('library', 'personal'));

-- المواد الشخصية تُستعلم دائماً بفلترة على صاحبها
create index if not exists materials_owner_scope_idx
  on public.materials (owner_id, scope);

-- ------------------------------------------------------------
-- progress — تقدم الطالب في مادة (صف واحد لكل مستخدم/مادة)
-- ------------------------------------------------------------
create table if not exists public.progress (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  material_id       uuid not null references public.materials (id) on delete cascade,
  completed_slides  smallint[] not null default '{}',  -- أرقام الشرائح المكتملة فعلياً، لا عدّاد
  total_slides      smallint not null default 0 check (total_slides >= 0),
  avg_review_score  real     not null default 0 check (avg_review_score between 0 and 1),
  last_activity     timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (user_id, material_id)
);

create index if not exists progress_user_idx
  on public.progress (user_id);

-- ============================================================
-- Row Level Security — الخصوصية: المادة الشخصية والتقدم لصاحبهما فقط
-- ============================================================

-- progress: المستخدم يقرأ ويكتب تقدّمه هو فقط
alter table public.progress enable row level security;

drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own" on public.progress
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own" on public.progress
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- materials — إعادة تعريف القراءة بعد إضافة scope:
--   • المكتبة (library): قراءة عامة كما في G1.
--   • الشخصية (personal): يراها صاحبها فقط.
-- سياسات SELECT المتعددة تُجمع بـ OR، فالطالب يرى مواد المكتبة + مواده الخاصة،
-- ولا يرى مواد غيره الشخصية إطلاقاً. (يستبدل سياسة G1 التي كانت using (true))
-- ------------------------------------------------------------
drop policy if exists "materials_public_read" on public.materials;
create policy "materials_public_read" on public.materials
  for select to anon, authenticated
  using (scope = 'library');

drop policy if exists "materials_select_own_personal" on public.materials;
create policy "materials_select_own_personal" on public.materials
  for select to authenticated
  using (scope = 'personal' and owner_id = auth.uid());

-- المادة الشخصية تُرفع مباشرة لصاحبها بلا موافقة أدمن (لأنها خاصة)
drop policy if exists "materials_insert_own_personal" on public.materials;
create policy "materials_insert_own_personal" on public.materials
  for insert to authenticated
  with check (scope = 'personal' and owner_id = auth.uid());
