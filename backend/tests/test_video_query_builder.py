import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from video_query_builder import build_queries, short_grade, primary_query


def test_short_grade_drops_alsaf_and_articles():
    assert short_grade("الصف الأول المتوسط") == "أول متوسط"
    assert short_grade("الصف الثالث المتوسط") == "ثالث متوسط"
    assert short_grade("") == ""


def test_primary_query_is_lesson_short_grade_subject():
    assert primary_query("الأعداد النسبية", "رياضيات", "الصف الأول المتوسط") == \
        "الأعداد النسبية أول متوسط رياضيات"


def test_build_queries_are_ordered_and_deduped():
    qs = build_queries("الأعداد النسبية", "رياضيات", "الصف الأول المتوسط")
    assert qs[0] == "الأعداد النسبية أول متوسط رياضيات"
    assert "الأعداد النسبية الصف الأول المتوسط" in qs
    assert any(q.startswith("درس الأعداد النسبية") for q in qs)
    assert any(q.startswith("رياضيات") for q in qs)
    assert len(qs) == len(set(qs))  # no duplicates


def test_build_queries_never_injects_manhaj_saudi():
    qs = build_queries("الأعداد النسبية", "رياضيات", "الصف الأول المتوسط")
    assert all("المنهج السعودي" not in q for q in qs)


def test_build_queries_requires_lesson():
    assert build_queries("", "رياضيات", "الصف الأول المتوسط") == []
    assert build_queries("   ", None, None) == []


def test_build_queries_with_only_lesson():
    assert build_queries("الأعداد النسبية") == ["الأعداد النسبية"]
