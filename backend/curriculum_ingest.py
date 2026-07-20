# curriculum_ingest.py
# C2 · خط إدخال المناهج (Closes #50)
#
# يقرأ كتاب مادة (PDF)، يستخرج نص كل درس حسب نطاق صفحاته، يعالجه عبر
# خط I3 نفسه (chunker + rag_generator: شرح + تلخيص)، ثم يخزّن الوحدات
# والدروس والمحتوى المعالج في Supabase — بشكل idempotent (قابل لإعادة
# التشغيل بلا تكرار).
#
# مبادئ:
#   * أسماء الوحدات/الدروس تأتي من فهرس الكتاب الحقيقي (manifest يعبّئه
#     المشغّل) — لا يُولّد اسم درس من فراغ.
#   * assert_no_placeholders يرفض أي اسم وهمي/placeholder قبل الإدخال.
#   * فتح مادة معالجة لا يستدعي Groq: المحتوى يُخزَّن مرة واحدة هنا.
#
# الوحدات المُعاد استخدامها من I3: chunker.chunk_slides،
# rag_generator.generate_summary، rag_generator.generate_topic_analysis.

import argparse
import json
import os
import sys

from chunker import chunk_slides
from rag_generator import generate_summary, generate_topic_analysis

# المواد المستهدفة (مفاتيح ثابتة — الأسماء العربية تعيش في unit_name/lesson_title)
SUBJECTS = ("math", "arabic", "digital_skills")

# رموز تدل على اسم وهمي/غير حقيقي — تُرفض قبل الإدخال للإنتاج
PLACEHOLDER_TOKENS = (
    "placeholder", "lorem", "ipsum", "todo", "tbd", "xxx", "test",
    "sample", "dummy", "foo", "bar", "example unit", "untitled",
    "درس تجريبي", "وحدة تجريبية", "عنوان الدرس", "اسم الوحدة",
    "درس ١", "الدرس الأول التجريبي", "لا يوجد",
)


# ------------------------------------------------------------
# التحقق من عدم وجود أسماء وهمية / placeholder
# ------------------------------------------------------------
def is_placeholder(name):
    """True إذا كان الاسم فارغاً أو يطابق أحد رموز placeholder المعروفة."""
    if not name or not str(name).strip():
        return True
    low = str(name).strip().lower()
    return any(tok in low for tok in PLACEHOLDER_TOKENS)


def assert_no_placeholders(entry_result):
    """يرفع ValueError بقائمة كل اسم وحدة/درس وهمي في نتيجة الإدخال."""
    offenders = []
    for unit in entry_result.get("units", []):
        if is_placeholder(unit.get("unit_name")):
            offenders.append(f"unit: {unit.get('unit_name')!r}")
        for lesson in unit.get("lessons", []):
            if is_placeholder(lesson.get("lesson_title")):
                offenders.append(f"lesson: {lesson.get('lesson_title')!r}")
    if offenders:
        raise ValueError(
            "رُفض الإدخال — أسماء وهمية/placeholder في قاعدة الإنتاج ممنوعة:\n  "
            + "\n  ".join(offenders)
        )


# ------------------------------------------------------------
# استخراج نص الدرس من نطاق صفحات الكتاب
# ------------------------------------------------------------
def _source_from_pages(pages, page_start, page_end):
    """
    يجمع نص الصفحات في النطاق [page_start, page_end] شاملاً (1-indexed).
    pages: [{"page": n, "text": "..."}, ...]
    """
    if not page_start:
        return ""
    end = page_end or page_start
    parts = [
        p["text"] for p in pages
        if page_start <= p.get("page", 0) <= end and (p.get("text") or "").strip()
    ]
    return "\n\n".join(parts).strip()


def extract_book_pages(pdf_path):
    """يستخرج نص كل صفحة من PDF عبر pdfplumber. يرجع [{"page","text"}]."""
    import pdfplumber  # lazy — لا حاجة له في الاختبارات
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            pages.append({"page": i + 1, "text": (page.extract_text() or "").strip()})
    return pages


def pdf_source_provider(pdf_path):
    """يبني مزوّد نص يستخرج نطاق صفحات كل درس من كتاب PDF واحد."""
    pages = extract_book_pages(pdf_path)

    def provider(lesson):
        rng = lesson.get("pages") or []
        start = rng[0] if len(rng) >= 1 else None
        end = rng[1] if len(rng) >= 2 else start
        return _source_from_pages(pages, start, end)

    return provider


# ------------------------------------------------------------
# معالجة درس واحد عبر خط I3 (شرح + تلخيص)
# ------------------------------------------------------------
def process_lesson_content(lesson_title, source_text, call_groq_fn,
                           language="ar", model=None):
    """
    يعيد استخدام خط I3: chunk_slides ثم generate_summary +
    generate_topic_analysis لإنتاج (شرح + مثال + تلخيص) للدرس.
    يرجع None إذا لم يكن هناك نص مصدر (لا نلفّق محتوى بلا مصدر).
    """
    source_text = (source_text or "").strip()
    if not source_text:
        return None

    slides = [{"slide_number": 1, "text": source_text}]
    chunks = chunk_slides(slides)
    if not chunks:  # نص قصير جداً — عامله ككتلة واحدة
        chunks = [{"chunk_id": "c_0", "text": source_text, "slides": [1]}]

    summary = generate_summary(source_text, call_groq_fn, language)
    topic = {"topic_id": 0, "label": lesson_title}
    analysis = generate_topic_analysis(topic, chunks, summary, call_groq_fn, language)

    examples = analysis.get("examples") or []
    return {
        "explanation": analysis.get("explanation", ""),
        "example": examples[0] if examples else "",
        "summary": summary,
        "source_excerpt": source_text[:1000],
        "model": model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
    }


# ------------------------------------------------------------
# إدخال مدخل مادة كامل (subject/stage/semester + units[])
# ------------------------------------------------------------
def ingest_entry(entry, call_groq_fn, source_provider, language="ar", model=None):
    """
    يبني النتيجة المهيكلة لمادة واحدة: لكل وحدة دروسها، ولكل درس محتواه
    المعالج (إن توفّر نص مصدر). لا يلمس قاعدة البيانات.
    """
    result = {
        "subject": entry["subject"],
        "stage": entry["stage"],
        "semester": entry.get("semester", 1),
        "units": [],
    }
    for u_order, unit in enumerate(entry.get("units", [])):
        out_unit = {
            "unit_name": unit["unit_name"],
            "unit_order": unit.get("unit_order", u_order),
            "lessons": [],
        }
        for l_order, lesson in enumerate(unit.get("lessons", [])):
            source_text = source_provider(lesson) if source_provider else ""
            content = process_lesson_content(
                lesson["lesson_title"], source_text, call_groq_fn, language, model
            )
            out_unit["lessons"].append({
                "lesson_title": lesson["lesson_title"],
                "lesson_order": lesson.get("lesson_order", l_order),
                "processed": content is not None,
                "content": content,
            })
        result["units"].append(out_unit)

    assert_no_placeholders(result)
    return result


# ------------------------------------------------------------
# الإدخال إلى Supabase — idempotent عبر upsert بمفاتيح طبيعية
# ------------------------------------------------------------
def _rows_by_key(returned_data, key_fields):
    """يبني خريطة (قيم المفاتيح) -> id من صفوف upsert المُعادة."""
    mapping = {}
    for row in returned_data or []:
        key = tuple(row.get(k) for k in key_fields)
        mapping[key] = row.get("id")
    return mapping


def upsert_curriculum(client, entry_result):
    """
    يُدخل/يحدّث الوحدات ثم الدروس ثم المحتوى المعالج.
    client: عميل supabase (أو أي عميل يوفّر
            table(name).upsert(rows, on_conflict=...).execute().data).
    يرجع إحصاء ما أُدخل. قابل لإعادة التشغيل بلا تكرار (on_conflict).
    """
    subject = entry_result["subject"]
    stage = entry_result["stage"]
    semester = entry_result["semester"]

    unit_rows = [{
        "subject": subject, "stage": stage, "semester": semester,
        "unit_name": u["unit_name"], "unit_order": u["unit_order"],
    } for u in entry_result["units"]]

    if not unit_rows:
        return {"units": 0, "lessons": 0, "contents": 0}

    units_res = client.table("curriculum_units").upsert(
        unit_rows, on_conflict="subject,stage,semester,unit_name"
    ).execute()
    unit_ids = _rows_by_key(units_res.data, ["subject", "stage", "semester", "unit_name"])

    lesson_rows = []
    for u in entry_result["units"]:
        uid = unit_ids[(subject, stage, semester, u["unit_name"])]
        for lesson in u["lessons"]:
            lesson_rows.append({
                "unit_id": uid,
                "lesson_title": lesson["lesson_title"],
                "lesson_order": lesson["lesson_order"],
                "processed": lesson["processed"],
                "content_url": lesson.get("content_url"),
            })

    lessons_res = client.table("curriculum_lessons").upsert(
        lesson_rows, on_conflict="unit_id,lesson_title"
    ).execute()
    lesson_ids = _rows_by_key(lessons_res.data, ["unit_id", "lesson_title"])

    content_rows = []
    for u in entry_result["units"]:
        uid = unit_ids[(subject, stage, semester, u["unit_name"])]
        for lesson in u["lessons"]:
            if not lesson.get("content"):
                continue
            lid = lesson_ids[(uid, lesson["lesson_title"])]
            content_rows.append({"lesson_id": lid, **lesson["content"]})

    if content_rows:
        client.table("curriculum_lesson_content").upsert(
            content_rows, on_conflict="lesson_id"
        ).execute()

    return {
        "units": len(unit_rows),
        "lessons": len(lesson_rows),
        "contents": len(content_rows),
    }


# ------------------------------------------------------------
# CLI
# ------------------------------------------------------------
def load_manifest(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _readable_entry(entry, manifest_dir):
    """True إذا كان المدخل جاهزاً للإدخال: وحدات معرّفة + كتاب مصدر موجود."""
    if not entry.get("units"):
        return False, "لا توجد وحدات مُعبّأة في manifest (املأ الأسماء ونطاقات الصفحات من الكتاب)."
    src = entry.get("source_pdf")
    if not src:
        return False, "لا يوجد كتاب مصدر (source_pdf) لهذه المادة."
    full = src if os.path.isabs(src) else os.path.join(manifest_dir, src)
    if not os.path.exists(full):
        return False, f"ملف الكتاب غير موجود: {full}"
    return True, full


def main(argv=None):
    parser = argparse.ArgumentParser(description="إدخال مناهج إيضاح إلى Supabase (C2/#50)")
    parser.add_argument("--manifest", default=os.path.join(
        os.path.dirname(__file__), "curriculum_data", "manifest.json"))
    parser.add_argument("--subject", help="تصفية على مادة (math/arabic/digital_skills)")
    parser.add_argument("--stage", help="تصفية على مرحلة (m1/m2/m3)")
    parser.add_argument("--language", default="ar")
    parser.add_argument("--dry-run", action="store_true",
                        help="عالج واطبع النتيجة بلا كتابة لقاعدة البيانات")
    args = parser.parse_args(argv)

    manifest = load_manifest(args.manifest)
    manifest_dir = os.path.dirname(os.path.abspath(args.manifest))
    entries = manifest.get("target_subjects", [])
    if args.subject:
        entries = [e for e in entries if e["subject"] == args.subject]
    if args.stage:
        entries = [e for e in entries if e["stage"] == args.stage]

    from Model import call_groq  # lazy — يتطلب GROQ_API_KEY

    client = None
    if not args.dry_run:
        from supabase import create_client  # lazy — يتطلب حزمة supabase
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        client = create_client(url, key)

    total = {"units": 0, "lessons": 0, "contents": 0}
    for entry in entries:
        label = f"{entry['subject']} · {entry['stage']} · فصل {entry.get('semester', 1)}"
        ok, info = _readable_entry(entry, manifest_dir)
        if not ok:
            print(f"⏭️  تخطّي {label}: {info}")
            continue

        print(f"⚙️  معالجة {label} من {info} ...")
        provider = pdf_source_provider(info)
        result = ingest_entry(entry, call_groq, provider, language=args.language)

        if args.dry_run:
            print(json.dumps(result, ensure_ascii=False, indent=2))
            continue

        counts = upsert_curriculum(client, result)
        for k in total:
            total[k] += counts[k]
        print(f"✅ {label}: {counts}")

    if not args.dry_run:
        print(f"\nالإجمالي: {total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
