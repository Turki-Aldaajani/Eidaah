-- ============================================================
-- S1 · خصوصية محتوى المواد الشخصية فوق جداول I3 (Closes #43)
-- إيضاح — سبرينت الهاكاثون (docs/HACKATHON_PLAN.md)
--
-- المشكلة: سياسات I3 على material_content/material_topics
-- (20260721000000_i3_material_content.sql) كانت "using (true)" — قراءة
-- عامة للجميع، بافتراض أن كل صف ينتمي لمادة مكتبة عامة. بعد S1 (عمودا
-- owner_id/scope في materials)، هذا الافتراض لم يعد صحيحاً: لو خُزِّن
-- تلخيص/مواضيع مادة شخصية في هذين الجدولين بلا تعديل، سيقرأهما أي
-- مستخدم (حتى anon) بمجرد معرفة material_id — يخالف مباشرة معيار قبول
-- S1: «المادة الشخصية لا تظهر لغير صاحبها».
--
-- الحل: نفس القراءة العامة لمواد المكتبة (scope='library') كما هي، لكن
-- لمواد الشخصية (scope='personal') تُقيَّد بصاحبها عبر join مع materials.
-- الكتابة تبقى عبر service_role فقط (لا تغيير — نفس تصميم I3).
--
-- طريقة التطبيق: بعد I3 وS1 (schema)، في SQL Editor أو supabase db push.
-- ============================================================

drop policy if exists "material_content_public_read" on public.material_content;
create policy "material_content_public_read" on public.material_content
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.materials m
      where m.id = material_content.material_id
        and (
          m.scope = 'library'
          or (m.scope = 'personal' and m.owner_id = auth.uid())
        )
    )
  );

drop policy if exists "material_topics_public_read" on public.material_topics;
create policy "material_topics_public_read" on public.material_topics
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.materials m
      where m.id = material_topics.material_id
        and (
          m.scope = 'library'
          or (m.scope = 'personal' and m.owner_id = auth.uid())
        )
    )
  );
