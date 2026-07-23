-- ============================================================
-- I2 · حوكمة رفع المواد + موافقة الأدمن (Closes #15)
-- إيضاح — سبرينت الهاكاثون (docs/HACKATHON_PLAN.md)
--
-- الفكرة: رفع المادة للمكتبة العامة يدخل كـ«طلب» (material_requests)
-- بحالة pending، وأدمن (محدَّد بإيميله) يقبل أو يرفض. القبول يُدرج المادة
-- في materials (scope=library) فتظهر بالمكتبة.
--
-- يشدّ ثغرة بقيت من G1/S1: كانت سياسة materials_authenticated_insert
-- (check true) تتيح لأي مستخدم إدراج مادة مكتبة مباشرة — يقوّض الحوكمة
-- والخصوصية. نستبدلها بصلاحية أدمن للمكتبة + إبقاء إدراج المادة الشخصية
-- (S1) لصاحبها. الكتابة على المواد الشخصية للمعالجة تبقى عبر service_role.
--
-- طريقة التطبيق: SQL Editor بعد G1 وS1. عدّل قائمة إيميلات الأدمن أدناه.
-- ============================================================

-- ------------------------------------------------------------
-- is_admin() — هل صاحب الجلسة أدمن؟ (يُطابق إيميله بقائمة الأدمن)
-- عدّل القائمة لتضيف/تحذف أدمن. أبقِها متوافقة مع
-- frontend/src/data/admins.js (الأخيرة للواجهة فقط؛ الأمان هنا في RLS).
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = any (array[
    'azozdhaif@gmail.com'
  ]);
$$;

-- ============================================================
-- materials — تشديد الكتابة: المكتبة للأدمن، والشخصية لصاحبها (S1)
-- ============================================================
-- إزالة سياسات G1 المتساهلة (check true) التي تقوّض الحوكمة/الخصوصية
drop policy if exists "materials_authenticated_insert" on public.materials;
drop policy if exists "materials_authenticated_update" on public.materials;

-- إدراج مادة مكتبة: للأدمن فقط (بوابة الموافقة)
drop policy if exists "materials_admin_insert_library" on public.materials;
create policy "materials_admin_insert_library" on public.materials
  for insert to authenticated
  with check (scope = 'library' and public.is_admin());

-- تحديث مادة المكتبة: للأدمن فقط
drop policy if exists "materials_admin_update_library" on public.materials;
create policy "materials_admin_update_library" on public.materials
  for update to authenticated
  using (scope = 'library' and public.is_admin())
  with check (scope = 'library' and public.is_admin());

-- (إدراج المادة الشخصية لصاحبها يبقى من S1: materials_insert_own_personal.
--  ومعالجة المواد الشخصية/المكتبة تتم عبر service_role الذي يتجاوز RLS.)

-- ============================================================
-- material_requests — صلاحية الأدمن: رؤية كل الطلبات ومراجعتها
-- (يبقى من G1: الطالب يُدرج/يرى/يحذف طلبه pending)
-- ============================================================
drop policy if exists "material_requests_admin_select" on public.material_requests;
create policy "material_requests_admin_select" on public.material_requests
  for select to authenticated
  using (public.is_admin());

drop policy if exists "material_requests_admin_update" on public.material_requests;
create policy "material_requests_admin_update" on public.material_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
