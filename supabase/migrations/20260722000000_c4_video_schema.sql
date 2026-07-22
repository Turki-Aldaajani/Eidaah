-- ============================================================
-- C4 · PR 2 — سكيما محرّك الفيديوهات (approved_channels + video_cache)
-- إيضاح — سبرينت الهاكاثون (docs/HACKATHON_PLAN.md · قسم C4)
--
-- الجداول:
--   approved_channels — سجلّ القنوات المعتمدة لكل مادة (يُدار من الأدمن)
--   video_cache       — تخزين نتائج التوصية لكل استعلام (بدل الكاش في الذاكرة)
--
-- RLS: القراءة عامة (بيانات عرض تعليمية عامة)، والكتابة عبر مفتاح
-- service_role من الباك إند (يتجاوز RLS) — نفس نمط G1/C2.
--
-- طريقة التطبيق: انسخ الملف في SQL Editor بلوحة Supabase وشغّله مرة واحدة،
-- أو: supabase db push
-- ============================================================

-- دالة updated_at (مُعرَّفة أيضاً في G1/C2 — نعيد تعريفها ليبقى الملف ذاتيّ التطبيق)
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
-- approved_channels — القنوات المعتمدة لكل مادة
-- subject:        مفتاح المادة كما في الواجهة (math / dig …)
-- channel_name:   اسم القناة للعرض
-- channel_handle: معرّف اليوتيوب (@handle) — مفتاح البحث
-- channel_id:     معرّف القناة المحلول من اليوتيوب (يُخزَّن لتوفير حصة الـ API)
-- nationality:    لهجة/جنسية الشارح (sa / eg / jo / kw) — يخدم فلتر اللهجة
-- priority:       أولوية الظهور (الأعلى أولاً)
-- enabled:        تعطيل القناة دون حذفها (يتحكم به الأدمن)
-- ------------------------------------------------------------
create table if not exists public.approved_channels (
  id             uuid primary key default gen_random_uuid(),
  subject        text not null check (length(btrim(subject)) > 0),
  channel_name   text not null check (length(btrim(channel_name)) > 0),
  channel_handle text not null check (length(btrim(channel_handle)) > 0),
  channel_id     text,
  nationality    text not null default 'sa',
  priority       integer not null default 0,
  enabled        boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (subject, channel_handle)
);

create index if not exists approved_channels_subject_idx
  on public.approved_channels (subject, enabled, priority desc);

-- ------------------------------------------------------------
-- video_cache — نتائج التوصية المخزّنة لكل استعلام (صف لكل فيديو)
-- cache_key:   هوية الاستعلام (subject|grade|lesson|limit)
-- rank:        ترتيب الفيديو داخل النتيجة (0 = الأول)
-- payload:     كائن الفيديو الكامل كما يُرسَل للواجهة (to_public_video)
-- pinned:      تثبيت الأدمن (يظهر أولاً) — لشريحة الإدارة لاحقاً
-- expires_at:  انتهاء صلاحية الكاش — بعده يُعاد البحث
-- ------------------------------------------------------------
create table if not exists public.video_cache (
  id               uuid primary key default gen_random_uuid(),
  cache_key        text not null check (length(btrim(cache_key)) > 0),
  video_id         text not null check (length(btrim(video_id)) > 0),
  rank             integer not null default 0,
  title            text,
  channel_title    text,
  published_at     timestamptz,
  duration_seconds integer,
  view_count       bigint,
  approved         boolean not null default false,
  pinned           boolean not null default false,
  payload          jsonb not null,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null,
  unique (cache_key, video_id)
);

create index if not exists video_cache_lookup_idx
  on public.video_cache (cache_key, expires_at);

-- ------------------------------------------------------------
-- Trigger — تحديث updated_at تلقائياً على approved_channels
-- ------------------------------------------------------------
drop trigger if exists approved_channels_set_updated_at on public.approved_channels;
create trigger approved_channels_set_updated_at
  before update on public.approved_channels
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security — قراءة عامة، كتابة عبر service_role فقط
-- ============================================================
alter table public.approved_channels enable row level security;
alter table public.video_cache enable row level security;

drop policy if exists "approved_channels_public_read" on public.approved_channels;
create policy "approved_channels_public_read" on public.approved_channels
  for select to anon, authenticated
  using (true);

drop policy if exists "video_cache_public_read" on public.video_cache;
create policy "video_cache_public_read" on public.video_cache
  for select to anon, authenticated
  using (true);

-- ============================================================
-- بذرة القنوات المعتمدة (رياضيات + مهارات رقمية) — idempotent
-- تطابق SEED_CHANNELS في backend/approved_channels.py
-- ============================================================
insert into public.approved_channels (subject, channel_name, channel_handle, nationality, priority) values
  ('math', 'منال التويجري رياضيات', '@منالالتويجريرياضيات', 'sa', 100),
  ('math', 'أكاديمية سعيد الشلوي',   '@saeedacademy50',      'sa', 90),
  ('math', 'عين iEN',                '@Ien4edu',             'sa', 80),
  ('math', 'أحمد الفديد',            '@alfded11',            'sa', 70),
  ('dig',  'مهارات رقمية',           '@Digital_Skills',      'sa', 100),
  ('dig',  'عين دروس',               '@iendroos',            'sa', 90)
on conflict (subject, channel_handle) do nothing;
