# slide_context.py
# #109 · The context a slide's learning content is generated from.
#
# A slide is rarely meaningful on its own: a title, a diagram with a caption, or
# "Example 2" says little without the slides before it. So the explanation,
# notes and quiz for a slide are NOT a literal summary of that one slide. They
# are grounded on the CURRENT slide (the focus) plus up to three earlier slides
# as context, and the thinner the current slide is, the further back it reaches.
# A thin slide also gets a vision reading of its image (see
# slide_explainer.describe_slide_visual). Pure functions: no LLM, no I/O.

import re

MAX_PREVIOUS_SLIDES = 3      # never reach further back than this
MIN_PREVIOUS_SLIDES = 1      # the previous slide is always given as continuity
TARGET_CONTEXT_CHARS = 600   # stop adding earlier slides once this much meaningful text is gathered
THIN_SLIDE_CHARS = 120       # below this a slide can't carry an explanation by itself
MAX_SLIDE_CHARS = 2000       # per-slide cap inside the prompt

_MEANINGFUL = re.compile(r"[^\W_]")


def meaningful_length(text):
    """Letters and digits only: bullets, punctuation and whitespace carry no meaning."""
    return len(_MEANINGFUL.findall(text or ""))


def is_thin_slide(text):
    return meaningful_length(text) < THIN_SLIDE_CHARS


def build_slide_context(slides, slide_number):
    """
    Pick the slides a slide's learning content is built from.

    Returns None when slide_number is not in `slides`, otherwise:
        {"slide_number": n, "thin": bool, "focus_text": "...",
         "previous": [{"slide_number", "text"}, ...],   # oldest first
         "context_slides": [..., n]}                   # ascending, ends with n
    """
    ordered = sorted(slides or [], key=lambda s: s["slide_number"])
    idx = next((i for i, s in enumerate(ordered) if s["slide_number"] == slide_number), None)
    if idx is None:
        return None

    focus_text = (ordered[idx].get("text") or "").strip()
    gathered = meaningful_length(focus_text)
    previous = []
    for slide in reversed(ordered[max(0, idx - MAX_PREVIOUS_SLIDES):idx]):
        if len(previous) >= MIN_PREVIOUS_SLIDES and gathered >= TARGET_CONTEXT_CHARS:
            break
        text = (slide.get("text") or "").strip()
        if not text:
            continue
        previous.insert(0, {"slide_number": slide["slide_number"], "text": text})
        gathered += meaningful_length(text)

    return {
        "slide_number": slide_number,
        "thin": is_thin_slide(focus_text),
        "focus_text": focus_text,
        "previous": previous,
        "context_slides": [s["slide_number"] for s in previous] + [slide_number],
    }


def format_slide_context(ctx, visual_description=""):
    """Render a build_slide_context result as a prompt block, the current slide marked as the focus."""
    parts = []
    if ctx["previous"]:
        parts.append("PREVIOUS SLIDES (context only):")
        for slide in ctx["previous"]:
            parts.append(f"[Slide {slide['slide_number']}]\n{slide['text'][:MAX_SLIDE_CHARS]}")
    focus = ctx["focus_text"][:MAX_SLIDE_CHARS] or "(no extractable text)"
    parts.append(f"CURRENT SLIDE, the focus [Slide {ctx['slide_number']}]:\n{focus}")
    if visual_description:
        parts.append(f"WHAT THE CURRENT SLIDE'S IMAGE SHOWS:\n{visual_description}")
    return "\n\n".join(parts)
