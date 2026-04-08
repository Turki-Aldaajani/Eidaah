# session_store.py
# In-memory session store for uploaded presentations.
# Sessions expire after SESSION_TTL seconds.

import os
import time
import uuid
import shutil
import tempfile
from dataclasses import dataclass, field
from typing import Optional

# ---------------------
# Configuration
# ---------------------
SESSION_TTL = 3600  # 1 hour
SESSIONS_BASE_DIR = os.path.join(tempfile.gettempdir(), "eidaah_sessions")
os.makedirs(SESSIONS_BASE_DIR, exist_ok=True)


@dataclass
class Session:
    session_id: str
    filename: str
    slides: list                                # [{slide_number, text}]
    slide_images_dir: str                       # Path to JPEG directory
    slide_images: list = field(default_factory=list)  # ["1.jpg", "2.jpg", ...]
    chunks: list = field(default_factory=list)   # [{chunk_id, text, slides}]
    topics: list = field(default_factory=list)
    summary: str = ""
    indexing_complete: bool = False
    created_at: float = field(default_factory=time.time)


# ---------------------
# Store
# ---------------------
_sessions: dict = {}


def create_session(filename: str, slides: list) -> Session:
    """Create a new session with a unique ID and temp directory for images."""
    sid = uuid.uuid4().hex[:12]
    images_dir = os.path.join(SESSIONS_BASE_DIR, sid)
    os.makedirs(images_dir, exist_ok=True)

    session = Session(
        session_id=sid,
        filename=filename,
        slides=slides,
        slide_images_dir=images_dir,
    )
    _sessions[sid] = session
    print(f"📁 Session created: {sid} ({filename})")
    return session


def get_session(sid: str) -> Optional[Session]:
    """Get a session by ID. Returns None if expired or not found."""
    session = _sessions.get(sid)
    if session is None:
        return None
    if (time.time() - session.created_at) > SESSION_TTL:
        cleanup_session(sid)
        return None
    return session


def cleanup_session(sid: str):
    """Remove a session and its temporary files."""
    session = _sessions.pop(sid, None)
    if session:
        try:
            shutil.rmtree(session.slide_images_dir, ignore_errors=True)
        except Exception:
            pass
        print(f"🗑️  Session cleaned up: {sid}")


def cleanup_expired():
    """Remove all expired sessions. Called periodically."""
    now = time.time()
    expired = [
        sid for sid, s in _sessions.items()
        if (now - s.created_at) > SESSION_TTL
    ]
    for sid in expired:
        cleanup_session(sid)
    if expired:
        print(f"🗑️  Cleaned up {len(expired)} expired session(s).")


def active_session_count() -> int:
    return len(_sessions)
