# rate_limit.py
# Per-client request limits on the endpoints that cost us Groq calls.
#
# Registration is open to the public, so an unthrottled endpoint is both a cost
# risk (every call is a paid Groq round-trip) and an availability risk (the free
# Groq tier has its own quota — burning it takes the demo down for everyone).

import os

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

# Limits are env-tunable so we can loosen them for a live demo without a redeploy.
UPLOAD_LIMIT = os.getenv("RATE_LIMIT_UPLOAD", "10/minute")
ANALYZE_LIMIT = os.getenv("RATE_LIMIT_ANALYZE", "30/minute")
AGENT_LIMIT = os.getenv("RATE_LIMIT_AGENT", "60/minute")
# Lower than the others: each call can trigger a YouTube Data API search (its
# own external quota) plus a Groq relevance call, and results are cached for
# 6h — a legitimate user never needs more than a handful of these per minute.
VIDEOS_LIMIT = os.getenv("RATE_LIMIT_VIDEOS", "5/minute")

# Render terminates TLS at its edge and proxies to us, so request.client.host is
# the proxy's address for every request — keying on it would put all users in one
# bucket and throttle the whole app the moment a single person got busy. Behind a
# trusted proxy the real client is the leftmost X-Forwarded-For entry.
#
# X-Forwarded-For is client-settable, so this is only safe when something
# upstream overwrites it. That is true on Render; leave TRUST_PROXY off when
# running the server directly, otherwise anyone can mint a fresh quota per
# request just by varying the header.
TRUST_PROXY = os.getenv("TRUST_PROXY", "false").lower() in ("1", "true", "yes")


def client_key(request: Request) -> str:
    """Identify the caller for quota purposes.

    Note this is per-IP, not per-user: the backend has no auth of its own today
    (Supabase sessions live entirely in the frontend), so there is no verified
    user id to key on. Trusting a client-supplied id header instead would let
    anyone reset their own quota. Switch to the user id here once the backend
    verifies Supabase JWTs.
    """
    if TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()

    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=client_key)


async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return 429 with a message a student can actually act on."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": (
                "لقد أرسلت طلبات كثيرة في وقت قصير. "
                "انتظر دقيقة ثم حاول مرة أخرى."
            )
        },
        headers={"Retry-After": "60"},
    )
