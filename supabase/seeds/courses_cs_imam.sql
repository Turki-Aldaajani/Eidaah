-- ============================================================
-- بذرة منسّقة لمقررات كلية علوم الحاسب — جامعة الإمام (دفعة تجريبية 1445)
-- (S2 · #44) — عدّل الأسماء/الرموز/المتطلبات لتطابق خطة دفعتك الحقيقية.
--
-- التطبيق: الصقه في SQL Editor بعد تطبيق
--   20260723000000_s2_courses_and_selection.sql
-- idempotent: إعادة التشغيل لا تكرّر المقررات (تطابق على code + university).
-- ============================================================

insert into public.courses
  (code, name, university, college, major, cohort_year, default_level, elective_type, is_curated)
select v.code, v.name,
       'جامعة الإمام محمد بن سعود الإسلامية',
       'كلية علوم الحاسب والمعلومات', 'علوم حاسب',
       1445::smallint, v.default_level::smallint, v.elective_type, true
from (values
  ('CS140', 'مقدمة في البرمجة',        1, 'required'),
  ('MATH151','الرياضيات المتقطعة',     1, 'required'),
  ('CS201', 'هياكل البيانات',          2, 'required'),
  ('CS210', 'البرمجة كائنية التوجه',   2, 'required'),
  ('CS215', 'تنظيم الحاسب والمعالجات', 2, 'required'),
  ('CS301', 'تصميم وتحليل الخوارزميات',3, 'required'),
  ('CS310', 'قواعد البيانات',          3, 'required'),
  ('CS320', 'نظم التشغيل',             4, 'required'),
  ('CS330', 'شبكات الحاسب',            4, 'required'),
  ('CS340', 'هندسة البرمجيات',         4, 'required'),
  ('CS410', 'الذكاء الاصطناعي',        5, 'free_elective'),
  ('CS420', 'أمن المعلومات',           5, 'free_elective'),
  ('GEN270','ريادة الأعمال',           3, 'pure_elective')
) as v(code, name, default_level, elective_type)
where not exists (
  select 1 from public.courses c
  where c.code = v.code
    and c.university = 'جامعة الإمام محمد بن سعود الإسلامية'
);

-- المتطلبات (مقرر ← متطلبه) بالرموز، ضمن نفس الجامعة
insert into public.course_prerequisites (course_id, prerequisite_course_id)
select c.id, p.id
from public.courses c
join public.courses p
  on p.university = c.university
where c.university = 'جامعة الإمام محمد بن سعود الإسلامية'
  and (c.code, p.code) in (
    ('CS201', 'CS140'),
    ('CS210', 'CS140'),
    ('CS301', 'CS201'),
    ('CS310', 'CS201'),
    ('CS320', 'CS215'),
    ('CS330', 'CS215'),
    ('CS340', 'CS210'),
    ('CS410', 'CS301'),
    ('CS420', 'CS330')
  )
on conflict do nothing;
