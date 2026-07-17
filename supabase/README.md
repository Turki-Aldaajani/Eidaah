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

## إعداد دخول OTP عبر الإيميل (مهمة I1 — مرة واحدة)

1. من لوحة Supabase: **Authentication → Email Templates → Magic Link**.
2. الافتراضي يرسل **رابطاً** فقط — عدّل القالب ليعرض **الرمز الرقمي** بإضافة `{{ .Token }}`، مثال:

   ```html
   <h2>رمز الدخول إلى إيضاح</h2>
   <p>رمزك هو: <b>{{ .Token }}</b></p>
   <p>الرمز صالح لمدة ساعة. إذا لم تطلب الدخول تجاهل هذه الرسالة.</p>
   ```

3. ⚠️ خدمة الإيميل المدمجة محدودة جداً (رسالتان بالساعة تقريباً) — تكفي للتطوير والديمو.
   قبل يوم العرض فعّلوا **Custom SMTP** من Project Settings → Authentication لرفع الحد.

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
