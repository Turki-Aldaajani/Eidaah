# supabase_client.py
# عميل Supabase للباك اند (service_role) — يُنشأ مرة واحدة ويُعاد استخدامه.
# يُستعمل في خط المعالجة (I3) وفي قراءة محتوى المواد للتقديم.
# service_role يتجاوز RLS، لذا يبقى في الباك اند فقط (لا يُكشف للواجهة).
import os

_client = None


def get_service_client():
    global _client
    if _client is None:
        from supabase import create_client  # lazy — يتطلب حزمة supabase
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client
