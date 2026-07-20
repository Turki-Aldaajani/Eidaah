# إدخال المناهج إلى Supabase — مهمة C2 (#50)

هذا المجلد يحوي **manifest** المواد التسعة المستهدفة وخط إدخالها. المرجع الكامل
للسياق: [docs/HACKATHON_PLAN.md](../../docs/HACKATHON_PLAN.md) (قسم C2).

المكوّنات:

| الملف | الغرض |
|---|---|
| [`manifest.json`](manifest.json) | المواد التسعة + مصدر كل كتاب وحالته. تُعبّأ فيه أسماء الوحدات/الدروس ونطاقات صفحاتها من فهرس الكتاب الحقيقي. |
| [`../curriculum_ingest.py`](../curriculum_ingest.py) | يقرأ الكتاب، يعالج كل درس عبر خط I3 (شرح + تلخيص)، ويخزّن في Supabase بشكل idempotent. |
| [`../../supabase/migrations/20260720000000_c2_curriculum_schema.sql`](../../supabase/migrations/20260720000000_c2_curriculum_schema.sql) | جداول `curriculum_units` · `curriculum_lessons` · `curriculum_lesson_content` + RLS. |

## الجداول

- **`curriculum_units`** — `unit_name` (من الكتاب) · `subject` · `stage` · `semester` · `unit_order` (حقل «order» في البطاقة، `order` كلمة محجوزة).
- **`curriculum_lessons`** — `lesson_title` (من الكتاب) · `unit_id` · `content_url` · `processed`.
- **`curriculum_lesson_content`** — `explanation` + `summary` (+ `example` · `source_excerpt` · `model`): «المحتوى المعالج» الذي يظهر في الواجهة. صف واحد لكل درس، يُخزَّن مرة واحدة فيُستهلك بلا استدعاء Groq جديد (مبدأ I3).

## حالة الكتب المصدر (شفافية — محدّثة بعد فحص الملفات فعلياً)

الكتب في `backend/data/Books/` **لا تُرفع إلى git** (كبيرة؛ تُرفع إلى Supabase Storage).
عند فحص استخراج النص تبيّن التالي، وهو ما يحدّد ما يلزم قبل إدخال كل مادة:

| المادة | المرحلة | الملف | الحالة | المطلوب |
|---|---|---|---|---|
| رياضيات | م١ | `book-riadiaat-1mm.pdf` | `needs_ocr` (سكان صور، لا نص) | OCR عربي ثم تعبئة الوحدات |
| رياضيات | م٢ | `riadiaat-2mutawasit.pdf` | `encoded_glyphs` (طبقة نص برموز خطّ خاصة غير قابلة للفك) | OCR عربي |
| رياضيات | م٣ | `book-riadiaat-3mm.pdf` | `needs_ocr` | OCR عربي |
| لغتي | م١ | `book-lughti-1mm.pdf` | `needs_ocr` | OCR عربي |
| لغتي | م٢ | `lughati-2mm.pdf` | `needs_ocr` (نص معكوس/مشوّه جزئياً — غير موثوق) | OCR عربي |
| لغتي | م٣ | `book-lughti-3mm.pdf` | `needs_ocr` | OCR عربي |
| مهارات رقمية | م١ | `book-raqmia-1mm.pdf` | `needs_ocr` | OCR عربي |
| مهارات رقمية | م٢ | — | `missing_source` | **الكتاب غير متوفّر** (`book-raqmia1m1.pdf` نسخة طبق الأصل من م١) |
| مهارات رقمية | م٣ | `book-raqmia-3mm.pdf` | `needs_ocr` | OCR عربي |

> الخط والتحقق (السكيما + منطق المعالجة + الحوكمة ضد الأسماء الوهمية) جاهزة ومختبَرة.
> ما يتبقّى لإكمال معيار القبول لكل مادة عمليّاً: (١) نصّ الكتاب (OCR للسكان، أو الكتاب
> المفقود لمهارات م٢)، (٢) مفتاح `GROQ_API_KEY`، (٣) مفاتيح Supabase.

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
   cd backend && python curriculum_ingest.py            # كل المواد الجاهزة
   cd backend && python curriculum_ingest.py --subject arabic   # مادة بعينها
   ```

## التحقق من معيار القبول

```bash
cd backend && python -m pytest tests/test_curriculum_schema.py tests/test_curriculum_ingest.py
```

استعلام Supabase للتأكد من ظهور أسماء حقيقية ومحتوى معالج مرتبط:

```sql
select u.subject, u.stage, u.unit_name, l.lesson_title,
       (c.explanation is not null and c.summary is not null) as has_processed_content
from curriculum_units u
join curriculum_lessons l on l.unit_id = u.id
left join curriculum_lesson_content c on c.lesson_id = l.id
order by u.subject, u.stage, u.unit_order, l.lesson_order;
```
