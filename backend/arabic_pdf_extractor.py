# -*- coding: utf-8 -*-
"""
B3 · استخراج وتطبيع النص العربي من ملفات PDF المدرسية (#28)

طبقة واجهة رقيقة وقابلة لإعادة الاستخدام فوق تطبيع الاتجاه العربي المُنجَز في
PR #61 (الدالة ``normalize_ar_text`` داخل ``curriculum_ingest``).

الخوارزمية الجوهرية — إعادة ترتيب النص العربي من بصري (معكوس) إلى منطقي مع
الحفاظ على الأرقام واللاتينية — **ليست مُكرَّرة هنا**؛ تُستورد من #61 حتى لا
يكون هناك تطبيقان متنافسان لنفس المنطق. ما تضيفه هذه الوحدة:

  * واجهة مستقلة قابلة للاستدعاء والنقل داخل الـ Pipeline يعيد استخدامها
    #25 (عنوان/وصف تلقائي) و#43 (المواد الشخصية):
        extract_arabic_text(pdf_path, page_start, page_end) -> dict
  * درجة ثقة (confidence) قابلة للقياس لكل صفحة وللمستند ككل، مبنية على
    نسبة الحروف العربية وكثافة الحروف التالفة (U+FFFD) ومحارف Private-Use.
  * كشف الصفحات التي يُرجَّح أنها تحتاج OCR (ممسوحة ضوئياً أو بخط PUA غير
    قابل للاستخراج) بدل تمرير نص مشوَّه بصمت إلى نموذج اللغة.

ملاحظة: بعض صفحات المقدمة/الأغلفة في هذه الكتب تستخدم خطوطاً جزئية التلف،
فيبقى فيها بعض آثار ربط الحروف (لام-ألف/همزة) رغم صحة الترتيب — لذلك نُبلّغ
عنها عبر ``confidence`` و``needs_ocr`` بدل ادّعاء نصٍّ مثاليّ.
"""

import os
import re
import warnings

# الجوهر (بصري → منطقي) مصدره PR #61 — يُستورد ولا يُكرَّر.
from curriculum_ingest import normalize_ar_text

# ------------------------------------------------------------
# نطاقات يونيكود المستخدمة في تقييم الجودة.
# تُبنى من نقاط الترميز (chr(0x..)) لا من محارف حرفية — فمحارف PUA غير مرئية
# وأشكال العرض العربية يسهل تلفها في المصدر؛ الأرقام السداسية ASCII آمنة.
# ------------------------------------------------------------
# Private Use Area U+E000..U+F8FF — خطوط مجزّأة غير قابلة للاستخراج (OCR)
_PUA_RE = re.compile("[" + chr(0xE000) + "-" + chr(0xF8FF) + "]")

# كتل العربية: الأساسية، الملحق، الموسّعة-أ، أشكال العرض أ، أشكال العرض ب
_ARABIC_RANGES = (
    (0x0600, 0x06FF),  # Arabic
    (0x0750, 0x077F),  # Arabic Supplement
    (0x08A0, 0x08FF),  # Arabic Extended-A
    (0xFB50, 0xFDFF),  # Arabic Presentation Forms-A
    (0xFE70, 0xFEFF),  # Arabic Presentation Forms-B
)
_ARABIC_RE = re.compile(
    "[" + "".join(chr(a) + "-" + chr(b) for a, b in _ARABIC_RANGES) + "]"
)

_REPLACEMENT = chr(0xFFFD)  # المحرف البديل — دليل على glyph تالف

# عتبات كشف الصفحات التي تحتاج OCR / نصّاً غير عربي
_MIN_ARABIC_RATIO = 0.20  # أقل من ذلك: صفحة ممسوحة/غير عربية
_MAX_JUNK_RATIO = 0.10     # كثافة (PUA + تالف) أعلى منها: نص غير موثوق


# ------------------------------------------------------------
# حلّ نطاق الصفحات (دالة نقية — سهلة الاختبار)
# ------------------------------------------------------------
def _resolve_page_indices(page_start, page_end, total):
    """
    يحوّل النطاق [page_start, page_end] (1-indexed وشامل) إلى قائمة مؤشرات
    0-indexed. ``None`` في الطرفين تعني من البداية/حتى النهاية.

    يرفع ``ValueError`` إذا خرج النطاق عن حدود المستند أو كان معكوساً.
    """
    if total <= 0:
        return []
    if page_start is None and page_end is None:
        return list(range(total))
    start = 1 if page_start is None else page_start
    end = total if page_end is None else page_end
    if start < 1 or end < 1 or start > total or end > total or start > end:
        raise ValueError(
            "نطاق صفحات غير صالح: "
            f"[{page_start}, {page_end}] لمستند من {total} "
            f"صفحة (المدى المسموح 1..{total})."
        )
    return list(range(start - 1, end))


# ------------------------------------------------------------
# قياس جودة نص صفحة مُطبَّعة (دالة نقية — سهلة الاختبار)
# ------------------------------------------------------------
def _page_quality(text):
    """
    يقيس جودة نص صفحة بعد التطبيع. يرجع ``(confidence, meta)`` حيث
    ``confidence`` في [0, 1] و``meta`` قاموس تشخيص.

    الإشارات المقاسة:
      * ``arabic_ratio`` = الحروف العربية / المحارف غير الفراغية.
      * ``junk_ratio``   = (محارف PUA + المحارف التالفة) / غير الفراغية.

    الثقة = arabic_ratio مخصوماً منها ضِعف كثافة التلف (مقصوصة إلى [0,1]).
    ``needs_ocr`` صحيحة إذا كانت الصفحة فارغة، أو عربيتها ضئيلة، أو تلفها
    مرتفع، أو محارف PUA تفوق العربية.
    """
    if not text or not text.strip():
        return 0.0, {"empty": True, "needs_ocr": True,
                     "arabic_ratio": 0.0, "junk_ratio": 0.0}

    total = sum(1 for c in text if not c.isspace()) or 1
    arabic = len(_ARABIC_RE.findall(text))
    pua = len(_PUA_RE.findall(text))
    repl = text.count(_REPLACEMENT)

    arabic_ratio = arabic / total
    junk_ratio = (pua + repl) / total
    confidence = max(0.0, min(1.0, arabic_ratio - 2.0 * junk_ratio))
    needs_ocr = (
        arabic_ratio < _MIN_ARABIC_RATIO
        or junk_ratio > _MAX_JUNK_RATIO
        or pua > arabic
    )
    meta = {
        "empty": False,
        "needs_ocr": needs_ocr,
        "arabic_ratio": round(arabic_ratio, 3),
        "junk_ratio": round(junk_ratio, 3),
    }
    return round(confidence, 3), meta


# ------------------------------------------------------------
# seam الإدخال الوحيد (I/O) — يُستبدَل بـ monkeypatch في الاختبارات
# ------------------------------------------------------------
def _extract_raw_pages(pdf_path, page_start=None, page_end=None):
    """
    يفتح الـ PDF، يحلّ نطاق الصفحات، ويستخرج النص **الخام** (بلا تطبيع) عبر
    pdfplumber. يرجع ``(total_pages, [(page_number_1indexed, raw_text), ...])``.

    هذا هو نقطة الإدخال/الإخراج الوحيدة في الوحدة؛ تُستبدَل في الاختبارات
    ببيانات مُتحكَّم بها فلا تحتاج ملفات PDF حقيقية (الكتب مستبعدة في gitignore).
    """
    import pdfplumber  # lazy — لا حاجة له في اختبارات المنطق
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        indices = _resolve_page_indices(page_start, page_end, total)
        raw = [(i + 1, pdf.pages[i].extract_text() or "") for i in indices]
    return total, raw


# ------------------------------------------------------------
# الواجهة العامة
# ------------------------------------------------------------
def extract_arabic_text(pdf_path, page_start=None, page_end=None):
    """
    يستخرج نصاً عربياً **منطقي الترتيب** من ملف PDF مدرسي.

    يعيد استخدام تطبيع الاتجاه (بصري → منطقي) من PR #61، ويضيف درجة ثقة
    قابلة للقياس وكشفاً للصفحات التي تحتاج OCR.

    Args:
        pdf_path:  مسار ملف الـ PDF.
        page_start: أول صفحة (1-indexed, شامل). ``None`` = من البداية.
        page_end:   آخر صفحة (1-indexed, شامل). ``None`` = حتى النهاية.

    Returns:
        dict:
            text            : النص المُطبَّع (الصفحات مفصولة بسطرين).
            confidence      : ثقة إجمالية في [0, 1] (متوسط مرجَّح بطول الصفحة).
            pages_processed : عدد الصفحات المعالجة.
            encoding        : ``"utf-8"``.
            pages           : تشخيص لكل صفحة
                              [{page, text, confidence, needs_ocr, arabic_ratio}].
            needs_ocr_pages : أرقام الصفحات التي يُرجَّح أنها تحتاج OCR.

    Raises:
        FileNotFoundError: الملف غير موجود.
        ValueError:        نطاق الصفحات خارج حدود المستند.

    ملاحظة: لا تُفشِل عند غياب نص قابل للقراءة (قد يكون الكتاب ممسوحاً بالكامل)
    بل تُصدر تحذيراً وتُبلّغ عبر ``confidence`` المنخفضة و``needs_ocr_pages``.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(
            f"ملف PDF غير موجود: {pdf_path}"
        )

    _total, raw_pages = _extract_raw_pages(pdf_path, page_start, page_end)

    pages = []
    weighted_sum = 0.0
    weight_total = 0
    needs_ocr_pages = []
    for page_no, raw in raw_pages:
        norm = normalize_ar_text((raw or "").strip())
        conf, meta = _page_quality(norm)
        weight = len(norm)
        weighted_sum += conf * weight
        weight_total += weight
        if meta["needs_ocr"]:
            needs_ocr_pages.append(page_no)
        pages.append({
            "page": page_no,
            "text": norm,
            "confidence": conf,
            "needs_ocr": meta["needs_ocr"],
            "arabic_ratio": meta["arabic_ratio"],
        })

    text = "\n\n".join(p["text"] for p in pages if p["text"].strip())
    confidence = round(weighted_sum / weight_total, 3) if weight_total else 0.0

    if not text.strip():
        warnings.warn(
            f"لم يُستخرج نص قابل للقراءة من {pdf_path} — يُرجَّح أنه يحتاج OCR.",
            stacklevel=2,
        )

    return {
        "text": text,
        "confidence": confidence,
        "pages_processed": len(pages),
        "encoding": "utf-8",
        "pages": pages,
        "needs_ocr_pages": needs_ocr_pages,
    }
