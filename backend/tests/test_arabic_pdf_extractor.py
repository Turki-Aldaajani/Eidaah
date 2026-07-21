# -*- coding: utf-8 -*-
# اختبار مهمة B3 (#28): وحدة استخراج/تطبيع النص العربي من PDF.
#
# مبدأ التصميم: الكتب المصدرية ضخمة ومستبعدة في .gitignore، فلا يجوز أن تعتمد
# اختبارات CI عليها. لذلك:
#   * منطق النطاق/الجودة يُختبر كدوال نقية بمدخلات مُتحكَّم بها.
#   * مسار الاستخراج يُختبر عبر monkeypatch لِـ seam الإدخال (_extract_raw_pages)
#     ببيانات صفحات صناعية — لا حاجة لملف PDF حقيقي.
#   * إعادة الاستخدام من #61 (normalize_ar_text) تُتحقَّق بمدخل بصري معكوس
#     معروف الناتج ("سرهفلا" -> "الفهرس") — النسخة الآمنة لـ CI من
#     "test_no_character_reversal".
#   * اختبار واحد على كتب حقيقية يُتخطّى تلقائياً حين لا تكون الكتب موجودة.

import glob
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import arabic_pdf_extractor as ape  # noqa: E402
from arabic_pdf_extractor import (  # noqa: E402
    extract_arabic_text,
    _resolve_page_indices,
    _page_quality,
)


# ------------------------------------------------------------
# أدوات مساعدة
# ------------------------------------------------------------
def _fake_extract(pages_text, record=None):
    """يبني بديلاً لـ _extract_raw_pages يرجع صفحات صناعية بلا ملف حقيقي."""
    def _fake(pdf_path, page_start=None, page_end=None):
        if record is not None:
            record["args"] = (pdf_path, page_start, page_end)
        return len(pages_text), [(i + 1, t) for i, t in enumerate(pages_text)]
    return _fake


@pytest.fixture
def dummy_pdf(tmp_path):
    """مسار ملف موجود فعلاً كي يمرّ فحص os.path.exists (محتواه غير مقروء)."""
    p = tmp_path / "dummy.pdf"
    p.write_bytes(b"%PDF-1.4\n")
    return str(p)


# نصوص بصرية معكوسة (كما يخرجها pdfplumber) ونواتجها المنطقية المعروفة.
VISUAL_TO_LOGICAL = [
    ("سرهفلا", "الفهرس"),
    ("بلاطلا", "الطالب"),
]


# ------------------------------------------------------------
# 1) حلّ نطاق الصفحات (دالة نقية)
# ------------------------------------------------------------
def test_resolve_full_range_when_no_bounds():
    assert _resolve_page_indices(None, None, 5) == [0, 1, 2, 3, 4]


def test_resolve_subrange_inclusive():
    assert _resolve_page_indices(2, 4, 10) == [1, 2, 3]


def test_resolve_single_page():
    assert _resolve_page_indices(3, 3, 5) == [2]


def test_resolve_open_ended_start_and_end():
    assert _resolve_page_indices(None, 2, 5) == [0, 1]
    assert _resolve_page_indices(4, None, 5) == [3, 4]


@pytest.mark.parametrize("start,end,total", [
    (0, 3, 5),    # start < 1
    (3, 12, 5),   # end > total
    (4, 2, 5),    # start > end (معكوس)
    (7, 9, 5),    # start > total
])
def test_resolve_out_of_bounds_raises(start, end, total):
    with pytest.raises(ValueError):
        _resolve_page_indices(start, end, total)


def test_resolve_empty_document():
    assert _resolve_page_indices(None, None, 0) == []


# ------------------------------------------------------------
# 2) قياس الجودة / الثقة (دالة نقية)
# ------------------------------------------------------------
def test_quality_clean_arabic_high_confidence():
    conf, meta = _page_quality("الفهرس والوحدة الأولى")
    assert conf > 0.7
    assert meta["needs_ocr"] is False
    assert meta["arabic_ratio"] > 0.9


def test_quality_pua_flags_needs_ocr():
    conf, meta = _page_quality(chr(0xF0A2) * 20)
    assert conf == 0.0
    assert meta["needs_ocr"] is True


def test_quality_replacement_heavy_low_confidence():
    conf, meta = _page_quality("نص" + chr(0xFFFD) * 40)
    assert conf < 0.3
    assert meta["needs_ocr"] is True


def test_quality_empty_is_zero_and_needs_ocr():
    conf, meta = _page_quality("   \n  ")
    assert conf == 0.0
    assert meta["empty"] is True
    assert meta["needs_ocr"] is True


def test_quality_latin_only_flagged_non_arabic():
    # نص لاتيني خالص ليس عربياً → يُوسم needs_ocr (نسبة عربية دون العتبة)
    conf, meta = _page_quality("Hello World 12345")
    assert meta["needs_ocr"] is True
    assert meta["arabic_ratio"] < 0.2


# ------------------------------------------------------------
# 3) إعادة استخدام تطبيع #61 عبر الواجهة (النسخة الآمنة لـ CI من
#    "لا حروف معكوسة"): مدخل بصري معكوس -> ناتج منطقي صحيح
# ------------------------------------------------------------
def test_extract_reverses_visual_to_logical(dummy_pdf, monkeypatch):
    monkeypatch.setattr(
        ape, "_extract_raw_pages",
        _fake_extract([src for src, _ in VISUAL_TO_LOGICAL]),
    )
    res = extract_arabic_text(dummy_pdf)
    for src, logical in VISUAL_TO_LOGICAL:
        assert logical in res["text"]      # الترتيب المنطقي حاضر
        assert src not in res["text"]      # والشكل المعكوس اختفى


def test_extract_preserves_numbers_and_latin(dummy_pdf, monkeypatch):
    # "12 نوثياب" (بصري) -> "بايثون 12": الأرقام تبقى مقروءة LTR
    monkeypatch.setattr(
        ape, "_extract_raw_pages", _fake_extract(["12 نوثياب"]))
    res = extract_arabic_text(dummy_pdf)
    assert "بايثون 12" in res["text"]


# ------------------------------------------------------------
# 4) شكل المخرجات / الميتاداتا
# ------------------------------------------------------------
def test_extract_metadata_shape(dummy_pdf, monkeypatch):
    monkeypatch.setattr(
        ape, "_extract_raw_pages", _fake_extract(["سرهفلا", "بلاطلا"]))
    res = extract_arabic_text(dummy_pdf)
    assert res["encoding"] == "utf-8"
    assert res["pages_processed"] == 2
    assert len(res["pages"]) == 2
    assert set(res["pages"][0]) == {
        "page", "text", "confidence", "needs_ocr", "arabic_ratio"}
    assert 0.0 <= res["confidence"] <= 1.0


def test_extract_encoding_is_valid_utf8(dummy_pdf, monkeypatch):
    monkeypatch.setattr(
        ape, "_extract_raw_pages", _fake_extract(["سرهفلا"]))
    res = extract_arabic_text(dummy_pdf)
    assert res["text"].encode("utf-8").decode("utf-8") == res["text"]


def test_extract_forwards_page_range(dummy_pdf, monkeypatch):
    record = {}
    monkeypatch.setattr(
        ape, "_extract_raw_pages", _fake_extract(["سرهفلا"], record=record))
    extract_arabic_text(dummy_pdf, page_start=3, page_end=7)
    assert record["args"] == (dummy_pdf, 3, 7)


# ------------------------------------------------------------
# 5) كشف الصفحات التي تحتاج OCR + تجميع الثقة
# ------------------------------------------------------------
def test_extract_flags_pua_page_for_ocr(dummy_pdf, monkeypatch):
    # صفحة نظيفة + صفحة PUA (غلاف بخط تالف)
    monkeypatch.setattr(
        ape, "_extract_raw_pages",
        _fake_extract(["الفهرس والوحدة", chr(0xF0A2) * 30]))
    res = extract_arabic_text(dummy_pdf)
    assert res["needs_ocr_pages"] == [2]
    assert res["pages"][0]["needs_ocr"] is False
    assert res["pages"][1]["needs_ocr"] is True


def test_extract_confidence_within_unit_interval(dummy_pdf, monkeypatch):
    monkeypatch.setattr(
        ape, "_extract_raw_pages",
        _fake_extract(["الفهرس والوحدة الأولى", chr(0xFFFD) * 20]))
    res = extract_arabic_text(dummy_pdf)
    assert 0.0 <= res["confidence"] <= 1.0


# ------------------------------------------------------------
# 6) معالجة الأخطاء
# ------------------------------------------------------------
def test_missing_file_raises_filenotfound():
    with pytest.raises(FileNotFoundError):
        extract_arabic_text("no/such/book.pdf")


def test_out_of_range_raises_valueerror(dummy_pdf, monkeypatch):
    def _boom(pdf_path, page_start=None, page_end=None):
        # يحاكي فتح مستند من 3 صفحات ثم طلب نطاق خارجها
        return _resolve_page_indices(page_start, page_end, 3)
    monkeypatch.setattr(ape, "_extract_raw_pages", _boom)
    with pytest.raises(ValueError):
        extract_arabic_text(dummy_pdf, page_start=1, page_end=99)


def test_empty_extraction_warns_but_does_not_raise(dummy_pdf, monkeypatch):
    monkeypatch.setattr(
        ape, "_extract_raw_pages", _fake_extract([""]))
    with pytest.warns(UserWarning):
        res = extract_arabic_text(dummy_pdf)
    assert res["text"] == ""
    assert res["confidence"] == 0.0
    assert res["needs_ocr_pages"] == [1]


# ------------------------------------------------------------
# 7) اختبار تكامل على كتب حقيقية — يُتخطّى تلقائياً حين تغيب الكتب
#    (الكتب مستبعدة في .gitignore، فلا يعمل هذا في CI؛ يعمل محلياً فقط)
# ------------------------------------------------------------
_BOOKS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "Books")
_DIGITAL_BOOKS = [
    b for b in glob.glob(os.path.join(_BOOKS_DIR, "*.pdf"))
    if "رقمية" in os.path.basename(b)
]

# مفردات شائعة عبر كتب المهارات الرقمية (فهارس/دروس)
_COMMON_WORDS = ["الوحدة", "الدرس", "الفهرس", "الحاسب", "برامج", "النصوص"]


@pytest.mark.skipif(
    not _DIGITAL_BOOKS,
    reason="كتب المصدر غير مرفوعة (gitignore) — يُشغَّل هذا الاختبار محلياً فقط",
)
def test_real_digital_book_extracts_readable_arabic():
    res = extract_arabic_text(_DIGITAL_BOOKS[0], page_start=3, page_end=8)
    assert res["encoding"] == "utf-8"
    assert res["pages_processed"] == 6
    assert res["text"].encode("utf-8").decode("utf-8") == res["text"]
    # نص عربي فعلي مقروء: عدة مفردات شائعة حاضرة بترتيب صحيح (لا معكوس)
    hits = sum(w in res["text"] for w in _COMMON_WORDS)
    assert hits >= 2, f"مفردات مقروءة قليلة ({hits}) — قد يكون الترتيب معطوباً"
    # صفحات المحتوى (فهرس) موثوقة نسبياً
    assert res["confidence"] > 0.4
