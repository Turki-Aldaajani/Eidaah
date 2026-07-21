# إدخال المناهج إلى Supabase — مهمة C2 (#50)

هذا المجلد يحوي **manifest** المواد المستهدفة وخط إدخالها. النطاق مقصور على المادتين
المعتمدتين (**رياضيات + مهارات رقمية × م١/م٢/م٣ · الفصل الأول**). المرجع الكامل
للسياق: [docs/HACKATHON_PLAN.md](../../docs/HACKATHON_PLAN.md) (قسم C2).

المكوّنات:

| الملف | الغرض |
|---|---|
| [`manifest.json`](manifest.json) | المواد المعتمدة + مصدر كل كتاب وحالته. تُعبّأ فيه أسماء الوحدات/الدروس ونطاقات صفحاتها من فهرس الكتاب الحقيقي. |
| [`../curriculum_ingest.py`](../curriculum_ingest.py) | يقرأ الكتاب، يعالج كل درس عبر خط I3 (شرح + تلخيص)، ويخزّن في Supabase بشكل idempotent. |
| [`../../supabase/migrations/20260720000000_c2_curriculum_schema.sql`](../../supabase/migrations/20260720000000_c2_curriculum_schema.sql) | جداول `curriculum_units` · `curriculum_lessons` · `curriculum_lesson_content` + RLS. |

## الجداول

- **`curriculum_units`** — `unit_name` (من الكتاب) · `subject` · `stage` · `semester` · `unit_order` (حقل «order» في البطاقة، `order` كلمة محجوزة).
- **`curriculum_lessons`** — `lesson_title` (من الكتاب) · `unit_id` · `content_url` · `processed`.
- **`curriculum_lesson_content`** — `explanation` + `summary` (+ `example` · `source_excerpt` · `model`): «المحتوى المعالج» الذي يظهر في الواجهة. صف واحد لكل درس، يُخزَّن مرة واحدة فيُستهلك بلا استدعاء Groq جديد (مبدأ I3).

## حالة الكتب المصدر (شفافية — محدّثة بعد فحص الملفات فعلياً)

الكتب في `backend/data/Books/` **لا تُرفع إلى git** (كبيرة؛ تُرفع إلى Supabase Storage).
عند فحص استخراج النص تبيّن التالي، وهو ما يحدّد ما يلزم قبل إدخال كل مادة:

النطاق مقصور على **المادتين المعتمدتين: رياضيات + مهارات رقمية × م١/م٢/م٣** (تحديث ٢١ يوليو).
بعد استبدال الكتب بنسخ نصّية، أصبحت **الستة كلها قابلة للاستخراج**:

| المادة | المرحلة | الملف | الحالة |
|---|---|---|---|
| رياضيات | م١ | `كتاب-الرياضيات-الاول-متوسط-الجزء-الأول-من-المقرر.pdf` | `text_ok` (٦٥٪ عربي · ٥٪ رموز معادلات) |
| رياضيات | م٢ | `كتاب-الرياضيات-ثاني-متسوط-الجزء-الاول-من-المقرر.pdf` | `text_ok` (٦٩٪ عربي · ٧٪ رموز) |
| رياضيات | م٣ | `كتاب-الرياضيات-ثالث-متوسط-الجزء-الاول-من-المقرر.pdf` | `text_ok` (٧٩٪ عربي · ٤٪ رموز) |
| مهارات رقمية | م١ | `كتاب-مهارات-رقمية-اول-متوسط-1.pdf` | `text_ok` (٩٠٪ عربي · نظيف) |
| مهارات رقمية | م٢ | `مهارات-رقمية-ثاني-متوسط.pdf` | `text_ok` (٨٧٪ عربي · نظيف) |
| مهارات رقمية | م٣ | `كتاب-مهارات-رقمية-ثالث-متوسط-1.pdf` | `text_ok` (٩١٪ عربي · نظيف) |

> **جاهز:** الستة كلها. كتب الرياضيات فيها نسبة رموز خطّ خاصة (معادلات) لا تؤثر على أسماء
> الوحدات/الدروس النصية.
> ملاحظة جودة: النص المُستخرَج بترتيب حروف معكوس (RTL بصري) والأرقام تنعكس أيضاً؛ قد يخفض
> جودة الشرح/التلخيص من Groq — يُفضَّل خطوة تطبيع BiDi (python-bidi) قبل المعالجة.
> الخط والتحقق (السكيما + منطق المعالجة + الحوكمة ضد الأسماء الوهمية) جاهزة ومختبَرة.
> ما يتبقّى عمليّاً: (١) تعبئة الوحدات/الدروس ونطاقات الصفحات من الفهرس، (٢) `GROQ_API_KEY`،
> (٣) مفاتيح Supabase، ثم تشغيل الإدخال والتحقق.

## طريقة الإدخال (لكل كتاب جاهز)

1. **طبّق السكيما** مرة واحدة (SQL Editor أو `supabase db push`).
2. **عبّئ `manifest.json`**: لكل مادة، انسخ أسماء الوحدات والدروس من فهرس الكتاب،
   وحدّد `pages: [بداية, نهاية]` لكل درس (الصفحات التي يُستخرَج منها نص المعالجة).
3. **جهّز المفاتيح**: `GROQ_API_KEY` و`SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` في `backend/.env`.
4. **معاينة بلا كتابة** (يعالج ويطبع الناتج):
   ```bash
   cd backend && python curriculum_ingest.py --subject math --stage m1 --dry-run
   ```
5. **الإدخال الفعلي** (idempotent — قابل لإعادة التشغيل):
   ```bash
   cd backend && python curriculum_ingest.py                              # كل المواد الجاهزة
   cd backend && python curriculum_ingest.py --subject digital_skills --stage m2   # المادة الجاهزة الآن
   ```

## التحقق من معيار القبول

```bash
cd backend && python -m pytest tests/test_curriculum_schema.py tests/test_curriculum_ingest.py
```

استعلام Supabase للتأكد من ظهور أسماء حقيقية ومحتوى معالج مرتبط (للمادتين المعتمدتين):

```sql
select u.subject, u.stage, u.unit_name, l.lesson_title,
       (c.explanation is not null and c.summary is not null) as has_processed_content
from curriculum_units u
join curriculum_lessons l on l.unit_id = u.id
left join curriculum_lesson_content c on c.lesson_id = l.id
where u.subject in ('math', 'digital_skills')
order by u.subject, u.stage, u.unit_order, l.lesson_order;
```

ملخص التغطية لكل (مادة × صف) — معيار القبول يتحقق عندما تُغطّى المادتان عبر الصفوف الثلاثة
بوحدات ودروس ومحتوى معالج:

```sql
select u.subject, u.stage,
       count(distinct u.id)                                             as units,
       count(l.id)                                                      as lessons,
       count(*) filter (where c.explanation is not null
                          and c.summary is not null)                    as processed_lessons
from curriculum_units u
join curriculum_lessons l on l.unit_id = u.id
left join curriculum_lesson_content c on c.lesson_id = l.id
where u.subject in ('math', 'digital_skills')
group by u.subject, u.stage
order by u.subject, u.stage;
```
