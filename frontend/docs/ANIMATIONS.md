# Transitions & Animations

توثيق لكل `@keyframes` المعرّفة في الملف المرجعي
`referenceeidaah-mockup/eidaah-injaz.html`.

## fadeIn — دخول العناصر عند التحميل

مطبّق عبر class عام `.anim` على كل بطاقة تقريباً (`grade-card`,
`subject-card`, `path-card`, `feat-card`…)، غالباً مع `animation-delay` متدرّج
حسب ترتيب العنصر لإنشاء أثر "stagger" (مثال: `animation-delay: ${i * 45}ms`).

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
.anim { animation: fadeIn .4s ease both; }
```

## dot — نقاط تحميل المساعد الذكي

تظهر أثناء انتظار رد أدوات الذكاء الاصطناعي (تلخيص/مثال/ملاحظات).

```css
@keyframes dot { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
.dots i { animation: dot 1s infinite ease-in-out; }
.dots i:nth-child(2) { animation-delay: .15s; }
.dots i:nth-child(3) { animation-delay: .3s; }
```

## play — شريط تقدم المشغّل التجريبي

داخل نافذة معاينة الفيديو المنبثقة (`.pm-back` / `.playing .p-bar i`).

```css
@keyframes play { to { width: 100%; } }
.playing .p-bar i { animation: play 24s linear forwards; }
```

## iluFloat — تعويم رسمة الـ hero

البطاقات العائمة حول رسمة الصفحة الرئيسية (`.flt`, `.flt.f2`, `.flt.f3`).

```css
@keyframes iluFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-9px); }
}
.flt     { animation: iluFloat 4.5s ease-in-out infinite; }
.flt.f2  { animation-delay: .8s; }
.flt.f3  { animation-delay: 1.6s; }
```

## الأكورديون (بدون keyframes — عبر transition على grid-template-rows)

مستخدم في الأسئلة الشائعة (`.faq-a`) وأدوات الدرس الذكية (`.ai-body`).

```css
.faq-a, .ai-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows .35s ease;
}
.faq-item.open .faq-a,
.ai-card.open .ai-body { grid-template-rows: 1fr; }
```

## جدول التوقيتات الشائعة

| الاستخدام | المدة |
|---|---|
| انتقال لون/حدود عام (hover على أزرار وروابط) | `.2s` |
| ظهور/اختفاء تدرّجي للأرقام (`g-num`, `ch-num` عند hover) | `.25s` |
| تفاعلات البطاقات المركّبة (`path-card`, `tm-card` — transform+shadow+border) | `.2s – .25s` |
| فتح/إغلاق الأكورديون (`faq-a`, `ai-body`) | `.35s ease` |
| تبديل السمة (خلفية/لون الصفحة عند التبديل ليلي↔نهاري) | `.3s ease` |
| شريط التقدّم داخل الدرس (`mp-bar`, `ring-fg`) | `.5s – .7s ease` |
| ظهور التوست (`toast`) | `.35s ease` |
| ظهور النافذة المنبثقة (`pm-back`) | `.2s` (كـ animation) |
| حركة التعويم `iluFloat` وتباعد كل بطاقة (`animation-delay: i*45ms…70ms`) | `4.5s infinite` |

## قاعدة إتاحة الحركة (Accessibility)

جميع الحركات مقيّدة بقاعدة عامة واحدة تحترم تفضيل المستخدم بتقليل الحركة:

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```
