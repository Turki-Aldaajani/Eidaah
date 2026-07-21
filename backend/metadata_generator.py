# metadata_generator.py
# A4 (#25): Auto-generate a short TITLE + DESCRIPTION for a processed document.
#
# Design notes:
#   * Generated ONCE at processing time (called from the upload pipeline in
#     main.py), stored on the in-memory session, and served from
#     /api/session/{id}/status. Opening the results page never triggers a new
#     LLM call — that is the acceptance criterion for #25.
#   * A SINGLE combined LLM call returns both fields as JSON. One call (not two)
#     keeps token usage and latency low and honours "no extra calls".
#   * Fully dependency-injected: takes `call_groq_fn`, so tests run offline with
#     a fake — same pattern as topic_detector / question_generator.
#   * Never raises to the caller. On an unset key, an API error, or malformed
#     output it falls back to a filename-derived title so the results page
#     always has something to show.

import json
import os
import re

# Length guards (characters).
MAX_TITLE_LEN = 80
MAX_DESC_LEN = 300
# How much of the document text to feed the model. The opening ~1500 chars are
# plenty to infer a title/description and keep the call cheap.
SOURCE_CHAR_CAP = 1500

_LANG_RULE = {
    "ar": "اكتب العنوان والوصف بالعربية الفصحى فقط.",
    "en": "Write both the title and the description in English only.",
}

_DEFAULT_TITLE = "مستند بدون عنوان"


def fallback_title_from_filename(filename: str) -> str:
    """
    A human-readable title derived from a filename — no LLM involved.
    Strips the extension and turns separators into spaces. Always non-empty.
    e.g. "math_lesson-1.pdf" -> "math lesson 1"
    """
    if not filename:
        return _DEFAULT_TITLE
    stem = os.path.splitext(os.path.basename(filename))[0]
    cleaned = re.sub(r"[_\-]+", " ", stem)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:MAX_TITLE_LEN] if cleaned else _DEFAULT_TITLE


def _strip_code_fences(raw: str) -> str:
    """Remove a leading/trailing ``` fence if the model wrapped its JSON."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    return cleaned.strip()


def generate_material_metadata(text, filename, call_groq_fn, language="ar", model=None):
    """
    Generate {title, description} for a processed document in one LLM call.

    Args:
        text:         extracted document text (only the first SOURCE_CHAR_CAP
                      chars are sent to the model).
        filename:     original filename — used for the fallback title.
        call_groq_fn: callable(prompt, max_tokens=..., temperature=...) -> str.
        language:     "ar" or "en" — the language to write the metadata in.
        model:        optional model label to record; defaults to $GROQ_MODEL.

    Returns dict (never raises):
        {
            "title": str,            # always non-empty
            "description": str,      # "" on fallback
            "auto_generated": bool,  # True only when the LLM produced it
            "model": str | None,     # model label, None on fallback
        }
    """
    fallback = {
        "title": fallback_title_from_filename(filename),
        "description": "",
        "auto_generated": False,
        "model": None,
    }

    if not text or not text.strip():
        return fallback

    lang_rule = _LANG_RULE.get(language, _LANG_RULE["ar"])
    prompt = (
        "You are given the extracted text of a student's uploaded document.\n"
        "Write a concise, descriptive TITLE (3-8 words) and a one to two "
        "sentence DESCRIPTION that tell the student what this document is about.\n"
        f"{lang_rule}\n"
        "Base it ONLY on the content below — do not invent facts, and do not "
        "add quotes or markdown.\n"
        'Respond ONLY with a JSON object, nothing else: '
        '{"title": "...", "description": "..."}\n\n'
        f"Document text:\n{text[:SOURCE_CHAR_CAP]}"
    )

    try:
        raw = call_groq_fn(prompt=prompt, max_tokens=300, temperature=0.3)
        data = json.loads(_strip_code_fences(raw))
        if not isinstance(data, dict):
            raise ValueError("Expected a JSON object")

        title = str(data.get("title", "")).strip().strip('"').strip("'")
        description = str(data.get("description", "")).strip()

        if not title:
            raise ValueError("Model returned an empty title")

        result = {
            "title": title[:MAX_TITLE_LEN],
            "description": description[:MAX_DESC_LEN],
            "auto_generated": True,
            "model": model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
        }
        print(f"   🏷️  Metadata generated: {result['title']!r}")
        return result

    except Exception as e:
        print(f"⚠️  Metadata generation failed ({e}); falling back to filename.")
        return fallback
