# slide_explainer.py
# #109 · Learning content for the slide the student is on: an analytical
# explanation, a real-world example and study notes, in ONE LLM call.
#
# Built from slide_context (the current slide + earlier slides as context), so a
# thin slide is explained through the idea it belongs to instead of being
# paraphrased literally. When the slide itself is thin, describe_slide_visual
# first reads its IMAGE with a vision model and that reading joins the context.
# Pure functions taking the LLM callables, so they're fully offline-testable.

import json
import re

from rag_generator import RAG_SYSTEM_PROMPT, LANGUAGE_INSTRUCTIONS

MAX_NOTES = 6
VISUAL_MAX_TOKENS = 700  # Groq rejects max_tokens > 1000 for the vision model on this account

LEARNING_PROMPT = """{topic_line}Below is the slide a student is viewing, with the slides right before it as context.

{context}

Teach the CURRENT slide. Do not paraphrase it line by line: when the slide says little on its own (a title, a diagram, a short list, an example), use the previous slides and the image description to explain the idea it belongs to, so the student ends up with a complete, clear concept. Do not add facts the content does not support.

Provide:
1. EXPLANATION: a clear analytical explanation of the current slide's idea (4-6 sentences).
2. EXAMPLE: one concrete, practical real-world example of that idea (2-3 sentences).
3. NOTES: 3-5 short study notes the student should remember.

You MUST respond in this exact JSON format and nothing else:
{{
  "explanation": "...",
  "example": "...",
  "notes": ["...", "..."]
}}"""

VISUAL_PROMPT = """This image is one slide from a lecture presentation. Describe its educational content for a student who cannot see it: diagrams, charts, tables, formulas, arrows and how the parts relate, plus any important text on it. Describe only what is visible. At most 120 words. {language_line}"""

VISUAL_LANGUAGE = {
    "ar": "Write the description in Arabic.",
    "en": "Write the description in English.",
}

_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL)


def _clean_json(raw):
    cleaned = (raw or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    return cleaned.strip()


def generate_slide_learning(context_text, call_groq_fn, language="ar", topic_label=None):
    """
    Returns {"explanation", "examples": [...], "notes": [...]}, or None when the
    context is empty or the model output can't be parsed.
    """
    if not (context_text or "").strip():
        return None

    system = RAG_SYSTEM_PROMPT
    if language in LANGUAGE_INSTRUCTIONS:
        system = RAG_SYSTEM_PROMPT + "\n\n" + LANGUAGE_INSTRUCTIONS[language]
    topic_line = f"TOPIC: {topic_label}\n\n" if topic_label else ""

    try:
        raw = call_groq_fn(
            prompt=LEARNING_PROMPT.format(topic_line=topic_line, context=context_text),
            max_tokens=1000,
            temperature=0.3,
            system_prompt=system,
        )
        data = json.loads(_clean_json(raw))
    except Exception as e:
        print(f"⚠️  Slide learning generation/parse failed: {e}")
        return None

    if not isinstance(data, dict):
        return None
    explanation = str(data.get("explanation") or "").strip()
    if not explanation:
        return None
    example = str(data.get("example") or "").strip()
    notes = data.get("notes") if isinstance(data.get("notes"), list) else []
    notes = [n.strip() for n in notes if isinstance(n, str) and n.strip()]

    return {
        "explanation": explanation,
        "examples": [example] if example else [],
        "notes": notes[:MAX_NOTES],
    }


def describe_slide_visual(image_bytes, call_vision_fn, language="ar"):
    """Vision reading of a slide image, or "" when there's no image or the call fails."""
    if not image_bytes:
        return ""
    prompt = VISUAL_PROMPT.format(language_line=VISUAL_LANGUAGE.get(language, VISUAL_LANGUAGE["ar"]))
    try:
        raw = call_vision_fn(prompt, image_bytes, max_tokens=VISUAL_MAX_TOKENS)
    except Exception as e:
        print(f"⚠️  Slide image description failed: {e}")
        return ""
    # Reasoning models on Groq can inline their thinking; keep only the answer.
    return _THINK_BLOCK.sub("", raw or "").strip()
