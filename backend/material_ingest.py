# material_ingest.py
# I3 · المعالجة المسبقة لمواد المكتبة (Closes #14)
#
# يعالج المادة المعتمدة (جدول materials من G1) مرة واحدة عبر خط التحليل
# الحالي — نفس خط صفحة النتائج:
#   chunk_slides → detect_topics → generate_summary → generate_topic_analysis
# ثم يخزّن الناتج في material_content + material_topics. أي طالب بعدها
# يستهلك المخزَّن بلا أي استدعاء جديد لـ Groq (أساس التوسع).
#
# الوحدات المُعاد استخدامها: chunker.chunk_slides، topic_detector.detect_topics،
# rag_generator.generate_summary، rag_generator.generate_topic_analysis.

import argparse
import json
import os
import re
import sys

from chunker import chunk_slides
from topic_detector import detect_topics
from rag_generator import generate_summary, generate_topic_analysis

DEFAULT_MODEL = "openai/gpt-oss-120b"

# رموز تدل على اسم وهمي/غير حقيقي — تُرفض قبل تخزين مادة للديمو
PLACEHOLDER_TOKENS = (
    "placeholder", "lorem", "ipsum", "todo", "tbd", "xxx",
    "sample", "dummy", "foo", "bar", "untitled", "example material",
    "مادة تجريبية", "عنوان المادة", "بدون عنوان", "لا يوجد",
)


def is_placeholder(name):
    """True إذا كان الاسم فارغاً أو يطابق أحد رموز placeholder المعروفة."""
    if not name or not str(name).strip():
        return True
    low = str(name).strip().lower()
    return any(tok in low for tok in PLACEHOLDER_TOKENS)


def assert_material_title_real(title):
    """يرفع ValueError إذا كان عنوان المادة وهمياً/placeholder."""
    if is_placeholder(title):
        raise ValueError(
            f"رُفض التخزين — عنوان مادة وهمي/placeholder ممنوع في قاعدة الإنتاج: {title!r}"
        )


# ------------------------------------------------------------
# بناء الشرائح من نص خام (لمواد الديمو النصية)
# ------------------------------------------------------------
def slides_from_text(text):
    """
    يقسم نصاً خاماً إلى شرائح على أسطر تحوي --- فقط (أو فاصل الصفحة \\f).
    يرجع [{"slide_number", "text"}] — نفس شكل مخرجات مستخرج الملفات.
    """
    if not text:
        return []
    normalized = text.replace("\f", "\n---\n")
    parts = re.split(r"(?m)^\s*-{3,}\s*$", normalized)
    slides = []
    for part in parts:
        body = part.strip()
        if body:
            slides.append({"slide_number": len(slides) + 1, "text": body})
    return slides


# ------------------------------------------------------------
# معالجة مادة كاملة عبر خط التحليل (تلخيص + مواضيع بشرح ومثال)
# ------------------------------------------------------------
def process_material(slides, call_groq_fn, language="ar", model=None):
    """
    يعالج شرائح مادة عبر خط التحليل الحالي ويعيد بنية جاهزة للتخزين.
    يرجع None إذا لم يكن هناك نص (لا نلفّق محتوى بلا مصدر).

    البنية:
      { summary, language, model, source_excerpt, slide_count,
        topics: [ { topic_order, label, explanation, example }, ... ] }
    """
    slides = [s for s in (slides or []) if (s.get("text") or "").strip()]
    if not slides:
        return None

    chunks = chunk_slides(slides)
    all_text = "\n\n".join(s["text"] for s in slides)
    if not chunks:  # نص قصير جداً — عامله ككتلة واحدة
        chunks = [{
            "chunk_id": "c_0",
            "text": all_text,
            "slides": [s["slide_number"] for s in slides],
        }]

    summary = generate_summary(all_text, call_groq_fn, language)
    topics = detect_topics(chunks, call_groq_fn)

    out_topics = []
    for topic in topics:
        analysis = generate_topic_analysis(topic, chunks, summary, call_groq_fn, language)
        examples = analysis.get("examples") or []
        out_topics.append({
            "topic_order": topic["topic_id"],
            "label": topic["label"],
            "explanation": analysis.get("explanation", ""),
            "example": examples[0] if examples else "",
        })

    return {
        "summary": summary,
        "language": language,
        "model": model or os.getenv("GROQ_MODEL", DEFAULT_MODEL),
        "source_excerpt": all_text[:1000],
        "slide_count": len(slides),
        "topics": out_topics,
    }


# ------------------------------------------------------------
# التخزين في Supabase — idempotent (قابل لإعادة التشغيل بلا تكرار)
# ------------------------------------------------------------
def upsert_material_content(client, material_id, result):
    """
    يخزّن ناتج المعالجة ويعلّم المادة processed. idempotent:
      * material_content: upsert 1:1 على material_id
      * material_topics: تُستبدل بالكامل (delete ثم insert) لتفادي بقايا
        عند تقلّص عدد المواضيع
      * materials.processing_status → 'processed'
    الكتابة تتم عبر عميل service_role (يتجاوز RLS).
    """
    content_row = {
        "material_id": material_id,
        "summary": result.get("summary"),
        "language": result.get("language", "ar"),
        "model": result.get("model"),
        "source_excerpt": result.get("source_excerpt"),
        "slide_count": result.get("slide_count", 0),
    }
    client.table("material_content").upsert(
        [content_row], on_conflict="material_id"
    ).execute()

    client.table("material_topics").delete().eq("material_id", material_id).execute()
    topic_rows = [{
        "material_id": material_id,
        "topic_order": t["topic_order"],
        "label": t["label"],
        "explanation": t.get("explanation"),
        "example": t.get("example"),
    } for t in result.get("topics", [])]
    if topic_rows:
        client.table("material_topics").insert(topic_rows).execute()

    client.table("materials").update(
        {"processing_status": "processed"}
    ).eq("id", material_id).execute()

    return {"topics": len(topic_rows), "has_summary": bool(result.get("summary"))}


# ------------------------------------------------------------
# إيجاد/إنشاء مادة بمفتاح طبيعي (عنوان + جامعة) — لبذر الديمو idempotent
# ------------------------------------------------------------
def find_or_create_material(client, meta):
    existing = (
        client.table("materials")
        .select("id")
        .eq("title", meta["title"])
        .eq("university", meta.get("university"))
        .limit(1)
        .execute()
    )
    rows = existing.data or []
    if rows:
        return rows[0]["id"]
    inserted = client.table("materials").insert({
        "title": meta["title"],
        "description": meta.get("description"),
        "university": meta.get("university"),
        "college": meta.get("college"),
        "major": meta.get("major"),
        "level": meta.get("level"),
        "processing_status": "pending",
    }).execute()
    return inserted.data[0]["id"]


# ------------------------------------------------------------
# بذر مواد الديمو من ملفات نصية حقيقية (demo_materials/manifest.json)
# ------------------------------------------------------------
def seed_demo_materials(client, manifest_path, call_groq_fn, language="ar"):
    manifest_dir = os.path.dirname(os.path.abspath(manifest_path))
    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

    results = []
    for meta in manifest.get("materials", []):
        assert_material_title_real(meta.get("title"))
        src = os.path.join(manifest_dir, meta["source_file"])
        with open(src, encoding="utf-8") as sf:
            text = sf.read()
        slides = slides_from_text(text)
        processed = process_material(slides, call_groq_fn, language=language)
        if not processed:
            print(f"⏭️  تخطّي {meta['title']}: لا نص مصدر")
            continue
        material_id = find_or_create_material(client, meta)
        counts = upsert_material_content(client, material_id, processed)
        print(f"✅ {meta['title']}: {counts['topics']} مواضيع، تلخيص={counts['has_summary']}")
        results.append({"material_id": material_id, "title": meta["title"], **counts})
    return results


# ------------------------------------------------------------
# CLI
# ------------------------------------------------------------
def main(argv=None):
    parser = argparse.ArgumentParser(
        description="I3 · المعالجة المسبقة لمواد المكتبة إلى Supabase (Closes #14)"
    )
    parser.add_argument("--manifest", default=os.path.join(
        os.path.dirname(__file__), "demo_materials", "manifest.json"),
        help="ملف بذر مواد الديمو (JSON)")
    parser.add_argument("--language", default="ar")
    parser.add_argument("--dry-run", action="store_true",
                        help="عالج واطبع النتيجة بلا كتابة لقاعدة البيانات")
    args = parser.parse_args(argv)

    from Model import call_groq  # lazy — يتطلب GROQ_API_KEY

    if args.dry_run:
        manifest_dir = os.path.dirname(os.path.abspath(args.manifest))
        with open(args.manifest, encoding="utf-8") as f:
            manifest = json.load(f)
        for meta in manifest.get("materials", []):
            src = os.path.join(manifest_dir, meta["source_file"])
            with open(src, encoding="utf-8") as sf:
                text = sf.read()
            processed = process_material(slides_from_text(text), call_groq, args.language)
            print(f"\n=== {meta['title']} ===")
            print(json.dumps(processed, ensure_ascii=False, indent=2))
        return 0

    from supabase_client import get_service_client  # lazy — يتطلب مفاتيح Supabase
    client = get_service_client()
    seed_demo_materials(client, args.manifest, call_groq, args.language)
    return 0


if __name__ == "__main__":
    sys.exit(main())
