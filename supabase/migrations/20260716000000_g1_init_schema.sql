-- ============================================================
-- G1 · سكيما Supabase — مهمة البوابة (Closes #11)
-- إيضاح — سبرينت الهاكاثون (docs/HACKATHON_PLAN.md)
--
-- الجداول: profiles · materials · material_requests · points_ledger
-- RLS مبدئية: القراءة عامة للمواد المعتمدة، والكتابة للمسجلين.
--
-- طريقة التطبيق: انسخ الملف كاملاً في SQL Editor بلوحة Supabase
-- وشغّله مرة واحدة، أو عبر: supabase db push
-- (راجع supabase/README.md للتفاصيل)
-- ============================================================

-- ------------------------------------------------------------
-- profiles — بيانات الأونبوردنق (جامعة/كلية/تخصص/مستوى)
-- صف واحد لكل مستخدم، يُنشأ تلقائياً عند التسجيل (trigger أدناه)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  university text,
  college    text,
  major      text,
  level      smallint check (level between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- materials — المواد المعتمدة + حالة المعالجة (I3)
-- كل صف هنا مادة معتمدة بحكم التعريف (الطلبات في material_requests)
-- ------------------------------------------------------------
create table if not exists public.materials (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  university        text,
  college           text,
  major             text,
  level             smallint check (level between 1 and 12),
  file_path         text, -- مسار الملف في Supabase Storage
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'processed', 'failed')),
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists materials_university_level_idx
  on public.materials (university, level);
create index if not exists materials_processing_status_idx
  on public.materials (processing_status);

-- ------------------------------------------------------------
-- material_requests — طلبات رفع المواد (الحوكمة، I2)
-- الرفع يدخل كطلب pending، وأدمن يوافق/يرفض قبل النشر
-- ------------------------------------------------------------
create table if not exists public.material_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  description  text,
  university   text,
  college      text,
  major        text,
  level        smallint check (level between 1 and 12),
  file_path    text, -- مسار الملف المرفوع في Supabase Storage
  status       text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_note  text,
  reviewed_by  uuid references auth.users (id) on delete set null,
  reviewed_at  timestamptz,
  material_id  uuid references public.materials (id) on delete set null, -- تُملأ عند القبول
  created_at   timestamptz not null default now()
);

create index if not exists material_requests_status_idx
  on public.material_requests (status);
create index if not exists material_requests_requester_idx
  on public.material_requests (requester_id);

-- ------------------------------------------------------------
-- points_ledger — رصيد النقاط وأسبابها (F6)
-- الرصيد = مجموع points لصفوف المستخدم
-- ------------------------------------------------------------
create table if not exists public.points_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  points      integer not null,
  reason      text not null, -- مثال: completed_material · completed_quiz_round
  material_id uuid references public.materials (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists points_ledger_user_idx
  on public.points_ledger (user_id);

-- ------------------------------------------------------------
-- Triggers — إنشاء البروفايل تلقائياً وتحديث updated_at
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security — السياسة المبدئية المتفق عليها:
-- القراءة عامة للمواد المعتمدة، والكتابة للمسجلين.
-- (تُشدَّد لاحقاً في I2 عند بناء صفحة الأدمن)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.material_requests enable row level security;
alter table public.points_ledger enable row level security;

-- profiles: كل مستخدم يقرأ ويعدّل بروفايله فقط
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- materials: القراءة عامة (كل صف هنا مادة معتمدة)، والكتابة للمسجلين
drop policy if exists "materials_public_read" on public.materials;
create policy "materials_public_read" on public.materials
  for select to anon, authenticated
  using (true);

drop policy if exists "materials_authenticated_insert" on public.materials;
create policy "materials_authenticated_insert" on public.materials
  for insert to authenticated
  with check (true);

drop policy if exists "materials_authenticated_update" on public.materials;
create policy "materials_authenticated_update" on public.materials
  for update to authenticated
  using (true)
  with check (true);

-- material_requests: المسجَّل يقدّم طلباته ويراها ويلغي pending فقط
-- (مراجعة الأدمن في I2 تتم عبر service role الذي يتجاوز RLS)
drop policy if exists "material_requests_insert_own" on public.material_requests;
create policy "material_requests_insert_own" on public.material_requests
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

drop policy if exists "material_requests_select_own" on public.material_requests;
create policy "material_requests_select_own" on public.material_requests
  for select to authenticated
  using (requester_id = auth.uid());

drop policy if exists "material_requests_delete_own_pending" on public.material_requests;
create policy "material_requests_delete_own_pending" on public.material_requests
  for delete to authenticated
  using (requester_id = auth.uid() and status = 'pending');

-- points_ledger: المستخدم يقرأ رصيده ويسجّل نقاطاً لنفسه فقط
drop policy if exists "points_ledger_select_own" on public.points_ledger;
create policy "points_ledger_select_own" on public.points_ledger
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "points_ledger_insert_own" on public.points_ledger;
create policy "points_ledger_insert_own" on public.points_ledger
  for insert to authenticated
  with check (user_id = auth.uid());
