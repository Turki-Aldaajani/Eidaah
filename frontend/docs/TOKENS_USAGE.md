# توكنز الهوية · إيضاح (tokens.css)

مصدر واحد للحقيقة لألوان وخطوط ومسافات المنصة. أي صفحة جديدة (F1 الأونبوردنق، F2 المكتبة، F3 تطبيق الهوية) تستورد هذا الملف بدل تعريف الألوان محلياً.

## الاستيراد

```html
<link rel="stylesheet" href="tokens.css">
```

أو داخل CSS:

```css
@import "tokens.css";
```

## الوضع الليلي

يعمل بطريقتين، والاختيار اليدوي يتغلّب على النظام:

1. **تلقائي** — يتبع تفضيل جهاز المستخدم (`prefers-color-scheme`) بدون أي كود إضافي.
2. **يدوي** — بزرّ يبدّل السمة على `<html>`:

```js
// نهاري صريح (يتجاهل تفضيل النظام)
document.documentElement.setAttribute('data-theme', 'light');
// ليلي صريح
document.documentElement.setAttribute('data-theme', 'dark');
// العودة للتلقائي: احذف السمة
document.documentElement.removeAttribute('data-theme');
```

## التوكنز المتاحة

| المجموعة | المتغيرات |
|----------|-----------|
| الأساسية | `--pri` `--pri-h` `--pri-a` `--pri-soft` `--pri-line` `--accent` `--accent-soft` |
| الحالات | `--suc` `--warn` `--err` `--info` `--pink` (+ `-bg` و `-line` لكل حالة) |
| المحايدة | `--ink` `--mut` `--faint` `--line` `--line2` `--bg-h` `--bg-2` `--card` |
| أنصاف الأقطار | `--r-s` (6px) `--r` (10px) `--r-l` (14px) |
| الظلال | `--sh` `--sh-m` |

## مثال

```css
.btn{
  background:var(--pri);
  color:#fff;
  border-radius:var(--r-s);
  box-shadow:var(--sh);
}
.btn:hover{ background:var(--pri-h); }
```

## قاعدة مهمة

الألوان الثانوية (`--suc` `--warn` `--err` `--info` `--pink`) للشارات والحالات ومستوى الصعوبة والتقدّم **فقط** — لا تُستخدم كألوان رئيسية للواجهة.
