# material_service.py
# I3 · تقديم محتوى المادة المعالجة للقراءة فقط (Closes #14).
#
# هذا المسار يقرأ المخزَّن من Supabase ويجمّعه — ولا يستورد ولا يستدعي
# Groq إطلاقاً. هذا جوهر معيار القبول: «فتح مادة معالجة لا يستدعي Groq».
# منطق التجميع (build_material_view) نقيّ وقابل للاختبار بلا شبكة.


def build_material_view(material_row, content_row, topic_rows):
    """يجمّع صف المادة + ناتجها المعالج في استجابة واحدة لصفحة المادة."""
    if not material_row:
        return None
    topics = sorted(topic_rows or [], key=lambda t: t.get("topic_order", 0))
    content = content_row or {}
    return {
        "id": material_row.get("id"),
        "title": material_row.get("title"),
        "description": material_row.get("description"),
        "university": material_row.get("university"),
        "college": material_row.get("college"),
        "major": material_row.get("major"),
        "level": material_row.get("level"),
        "processing_status": material_row.get("processing_status"),
        "summary": content.get("summary"),
        "language": content.get("language"),
        "slide_count": content.get("slide_count", 0),
        "topics": [{
            "topic_order": t.get("topic_order"),
            "label": t.get("label"),
            "explanation": t.get("explanation"),
            "example": t.get("example"),
        } for t in topics],
    }


def fetch_material_content(client, material_id):
    """
    يقرأ المادة ومحتواها المعالج من Supabase (قراءة فقط، بلا Groq).
    يرجع None إذا لم توجد المادة.
    """
    material = (
        client.table("materials")
        .select("id, title, description, university, college, major, level, processing_status")
        .eq("id", material_id)
        .limit(1)
        .execute()
    )
    material_rows = material.data or []
    if not material_rows:
        return None

    content = (
        client.table("material_content")
        .select("summary, language, slide_count")
        .eq("material_id", material_id)
        .limit(1)
        .execute()
    )
    content_rows = content.data or []

    topics = (
        client.table("material_topics")
        .select("topic_order, label, explanation, example")
        .eq("material_id", material_id)
        .order("topic_order")
        .execute()
    )

    return build_material_view(
        material_rows[0],
        content_rows[0] if content_rows else None,
        topics.data or [],
    )
