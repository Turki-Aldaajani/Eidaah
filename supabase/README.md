# Supabase — قاعدة بيانات إيضاح (مهمة G1)

هذا المجلد يحتوي سكيما قاعدة البيانات وسياسات الأمان (RLS) لمشروع إيضاح.
المرجع الكامل للسياق: [docs/HACKATHON_PLAN.md](../docs/HACKATHON_PLAN.md).

## الجداول

| الجدول | الغرض | يخدم المهام |
|---|---|---|
| `profiles` | بيانات الأونبوردنق: جامعة / كلية / تخصص / مستوى (صف لكل مستخدم، يُنشأ تلقائياً عند التسجيل) | I1 · F1 |
| `materials` | المواد **المعتمدة** + حالة المعالجة (`pending / processing / processed / failed`) | I3 · F2 |
| `material_requests` | طلبات رفع المواد بحالة `pending / approved / rejected` (الحوكمة) | I2 |
| `points_ledger` | سجل النقاط وأسبابها — الرصيد = مجموع `points` للمستخدم | F6 |
| `material_content` | ناتج معالجة المادة (تلخيص) — صف لكل مادة (1:1) | I3 · F2 |
| `material_topics` | مواضيع المادة المعالجة (شرح + مثال لكل موضوع) | I3 · F2 |
| `courses` | كتالوج المقررات (منسّق + إضافة الطالب) + نوع المقرر | S2 |
| `course_prerequisites` | متطلبات كل مقرر | S2 |
| `student_courses` | اختيار الطالب لكل فصل + حالة المقرر | S2 |

## سياسة RLS المبدئية (قرار الفريق)

- **القراءة عامة للمواد المعتمدة:** أي زائر (حتى بدون تسجيل) يقرأ جدول `materials`.
- **الكتابة للمسجلين:** الإدراج والتعديل يتطلبان جلسة مسجّلة، وكل مستخدم يرى بياناته الخاصة فقط في `profiles` و`material_requests` و`points_ledger`.
- مراجعة الأدمن (I2) تتم عبر مفتاح `service_role` في الباك اند، وهو يتجاوز RLS.

## خطوات الإعداد (مرة واحدة)

1. أنشئ مشروعاً على [supabase.com](https://supabase.com) (الخطة المجانية تكفي للهاكاثون).
2. من لوحة المشروع افتح **SQL Editor** والصق محتوى
   [`migrations/20260716000000_g1_init_schema.sql`](migrations/20260716000000_g1_init_schema.sql) كاملاً وشغّله.
   (بديل لمستخدمي Supabase CLI: `supabase link` ثم `supabase db push`.)
3. من **Project Settings → API** انسخ:
   - `Project URL`
   - مفتاح `anon public`
   - مفتاح `service_role` (سرّي — للباك اند فقط، لا يوضع في الفرونت أبداً)
4. عبّئ المفاتيح محلياً:
   - الفرونت: `frontend/.env` من [`frontend/.env.example`](../frontend/.env.example)
   - الباك: `backend/.env` من [`backend/.env.example`](../backend/.env.example)
5. للنشر: أضف نفس المتغيرات في إعدادات Vercel (الفرونت) وRender (الباك).
6. لتجربة الكتابة في سكربت التحقق أدناه: فعّل **Anonymous Sign-ins** من
   **Authentication → Providers** (أو مرّر بيانات مستخدم تجريبي — انظر السكربت).

## إعداد دخول OTP عبر الإيميل (مهمة I1 — مرة واحدة، مطبَّق فعلاً)

> على الخطة المجانية **لا يمكن تعديل قوالب الإيميل بدون Custom SMTP**، والخدمة المدمجة
> محدودة بـ ~رسالتين/ساعة — لذلك الترتيب التالي إلزامي:

1. **فعّل Custom SMTP**: من **Authentication → Emails → SMTP Settings**.
   إعدادات Gmail المجربة (استخدموا حساباً باسم المشروع لا حساباً شخصياً):
   - Host: `smtp.gmail.com` · Port: `587`
   - Username: عنوان Gmail كاملاً · Password: **App Password من 16 حرفاً بدون مسافات**
     (تُنشأ من إعدادات حساب قوقل → Security → App passwords، وتتطلب 2FA)
   - Sender email: نفس حساب Gmail · Sender name: `إيضاح`
2. **عدّل القالب**: من **Authentication → Emails → Templates → قالب Magic Link** —
   بدّل العرض إلى **Source** والصق (الافتراضي يرسل رابطاً بلا رمز):

   ```html
   <h2>رمز الدخول إلى إيضاح</h2>
   <p>رمزك هو:</p>
   <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{{ .Token }}</p>
   <p>الرمز صالح لمدة ساعة. إذا لم تطلب الدخول تجاهل هذه الرسالة.</p>
   ```

   وغيّر **Subject** إلى: `رمز الدخول إلى إيضاح`.
3. **ارفع حد الإرسال**: من **Authentication → Rate Limits** — حد الإيميلات بالساعة (مثلاً 30).
4. ملاحظة تشخيص: إذا أظهرت الواجهة «خطأ من الخادم (500/504)» عند إرسال الرمز
   فالمشكلة في إعدادات SMTP (كلمة مرور بمسافات، بورت غير 587، هوست خاطئ) —
   راجع **Logs → Auth** في اللوحة لرؤية الخطأ الفعلي.

## التحقق من معيار القبول (قراءة + كتابة من الواجهة)

بعد تعبئة `frontend/.env`:

```bash
cd frontend
npm run supabase:smoke
```

السكربت يستخدم عميل الواجهة نفسه (`src/lib/supabaseClient.js`) وينفّذ:
**قراءة** من `materials` ← **كتابة** طلب مادة في `material_requests` ← قراءته ← حذفه (تنظيف).

الاختبارات الآلية (بدون اتصال حي):

```bash
cd frontend && npm test -- --watchAll=false supabaseClient   # عميل الواجهة
cd backend && python -m pytest tests/test_supabase_schema.py  # اكتمال السكيما وسياسات RLS
```

## المعالجة المسبقة لمواد المكتبة (مهمة I3 — أساس التوسع)

المادة المعتمدة تُعالَج **مرة واحدة** عبر خط التحليل الحالي (نفس خط صفحة النتائج:
`chunk_slides → detect_topics → generate_summary → generate_topic_analysis`)،
ويُخزَّن الناتج في `material_content` + `material_topics`. بعدها أي فتح للمادة
يقرأ المخزَّن فقط **بلا أي استدعاء لـ Groq** — وهذا ما يخلّي المشروع يتوسّع بلا
حرق رصيد الـ API.

### التطبيق (مرة واحدة)

1. طبّق سكيما I3: الصق [`migrations/20260721000000_i3_material_content.sql`](migrations/20260721000000_i3_material_content.sql)
   في **SQL Editor** وشغّله (يضيف جدولي `material_content` و`material_topics`).
2. تأكد أن `backend/.env` فيه `SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` و`GROQ_API_KEY`
   (نفس مفاتيح C2 التي تعمل عندك أصلاً).

### بذر مادتي الديمو الحقيقيتين

```bash
cd backend
python material_ingest.py --dry-run   # عالج واطبع الناتج بلا كتابة (تحقّق سريع)
python material_ingest.py             # يعالج ويخزّن المادتين في Supabase
```

المادتان في [`backend/demo_materials/`](../backend/demo_materials/): «مقدمة في قواعد
البيانات العلائقية» و«أساسيات التفاضل: المشتقات» — نصّان تعليميّان حقيقيّان.
التشغيل idempotent (يعيد الاستخدام بلا تكرار).

### التحقق من معيار القبول

- **فتح مادة معالجة لا يستدعي Groq إطلاقاً:** مسار القراءة
  (`GET /api/materials/{id}/content` عبر `material_service.py`) لا يستورد ولا يستدعي
  Groq. الاختبار `test_opening_processed_material_calls_groq_zero_times` يثبت أن
  عدد استدعاءات Groq **لا يزيد** عند الفتح بعد المعالجة.
- **مادتان حقيقيتان جاهزتان للديمو:** بعد البذر أعلاه.

```bash
cd backend && python -m pytest tests/test_material_pipeline.py   # خط I3 كاملاً
```

## اختيار المقررات و«مقرراتي» (مهمة S2)

«مقرراتي» = مقررات الطالب المختارة للفصل (لا مجرّد ملفات مرفوعة). يتعايش مع S1:
المقرر المختار يُذاكَر بالأداة المباشرة (رفع الملفات)، وهو المسار الأساسي عالمياً
حين لا يتوفّر كاتالوج لكل جامعة.

### التطبيق (مرة واحدة)

1. طبّق سكيما S2: الصق [`migrations/20260723000000_s2_courses_and_selection.sql`](migrations/20260723000000_s2_courses_and_selection.sql)
   في **SQL Editor** (يضيف `courses` + `course_prerequisites` + `student_courses`
   و`cohort_year`/`current_term` على `profiles`).
2. (اختياري) ابذر كتالوج حاسب الإمام التجريبي:
   الصق [`seeds/courses_cs_imam.sql`](seeds/courses_cs_imam.sql) — 13 مقرراً بمتطلباتها
   (عدّل الأسماء لتطابق خطة دفعتك). idempotent.

### التجربة

بعد أونبوردنق بنفس جامعة الكتالوج، افتح `/moadi`:
اختر مقررات من الكتالوج (يُحترم قفل المتطلبات ونوع المقرر)، أو أضف مقرراً خاصاً،
ثم «أنهيت الفصل» لترقية المستوى وبدء فصل جديد.

```bash
cd frontend && npm test -- --watchAll=false courses Moadi
```

> **رودماب ما بعد الهاكاثون** (محفوظ): المشغّل التلقائي بالتقويم الجامعي بدل زر
> «أنهيت الفصل» اليدوي، وربط كل مقرر بمحتوى معالَج (I3) أو مادة الطالب (S1).
