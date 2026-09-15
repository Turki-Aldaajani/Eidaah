# topic_detector.py
# Detects topics from chunked slide text using the LLM (Groq).
# No local embeddings or clustering — pure LLM-based detection.

import json

LANGUAGE_INSTRUCTIONS = {
    "ar": "CRITICAL INSTRUCTION: You MUST write ALL topic labels ENTIRELY in Arabic (العربية) regardless of the language of the input content. Do not use any English words.",
    "en": "CRITICAL INSTRUCTION: You MUST write ALL topic labels ENTIRELY in English regardless of the language of the input content. Do not use any Arabic words.",
}


def _even_partition(items, n):
    """Split items into n contiguous, in-order groups; every group gets at least one item when any exist."""
    if not items:
        return [[] for _ in range(n)]
    groups = []
    for i in range(n):
        start = min((i * len(items)) // n, len(items) - 1)
        end = max(((i + 1) * len(items)) // n, start + 1)
        groups.append(items[start:end])
    return groups


def _clean_slide_numbers(value, known):
    """The valid, known slide numbers in an LLM-provided list (sorted, no duplicates)."""
    if not isinstance(value, list):
        return []
    picked = set()
    for v in value:
        if isinstance(v, bool):
            continue
        try:
            n = int(v)
        except (TypeError, ValueError):
            continue
        if n in known:
            picked.add(n)
    return sorted(picked)


def detect_topics(chunks: list, call_groq_fn, language: str = "ar") -> list:
    """
    Use the LLM to identify distinct topics from the presentation chunks.
    Returns a list of topic dicts: [{"topic_id": 0, "label": "...", "slides": [1, 2]}, ...]

    Each topic carries the slides it covers (#109), so its explanation is
    grounded on ITS slides and the results page can follow the slide the
    student is on. Every topic gets at least one slide when the deck has any.
    """
    if not chunks:
        return []

    known = sorted({n for c in chunks for n in c.get("slides", [])})

    # Build a condensed view of all chunks for the LLM
    chunk_summaries = []
    for c in chunks:
        preview = c["text"][:200].replace("\n", " ")
        slides_str = ", ".join(str(s) for s in c["slides"])
        chunk_summaries.append(f"[Slides {slides_str}]: {preview}")

    combined = "\n".join(chunk_summaries)

    lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["ar"])
    prompt = (
        "Analyze this presentation content and identify the 2-6 main topics discussed.\n"
        "For each topic, give a short label (3-6 words) and the slide numbers it covers, "
        "taken from the [Slides ...] markers. Topics usually follow the presentation order.\n"
        f"{lang_instruction}\n\n"
        "Respond ONLY with a JSON array of objects, nothing else. Example:\n"
        '[{"label": "Introduction to Machine Learning", "slides": [1, 2, 3]}, '
        '{"label": "Neural Network Architectures", "slides": [4, 5]}]\n\n'
        f"Content:\n{combined[:3000]}"
    )

    try:
        raw = call_groq_fn(
            prompt=prompt,
            max_tokens=400,
            temperature=0.2,
        )

        # Clean and parse
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        items = json.loads(cleaned)

        if not isinstance(items, list) or len(items) == 0:
            raise ValueError("Expected a non-empty list of topics")

        # Build topic objects. A plain list of label strings (the old answer
        # shape) still parses; its topics get slides from the fill-in below.
        known_set = set(known)
        topics = []
        for item in items:
            if isinstance(item, dict):
                label, slides = item.get("label"), item.get("slides")
            else:
                label, slides = item, None
            label = str(label or "").strip().strip('"').strip("'")
            if label:
                topics.append({
                    "topic_id": len(topics),
                    "label": label,
                    "slides": _clean_slide_numbers(slides, known_set),
                })

        if not topics:
            raise ValueError("No usable topic labels")

        # A topic the model gave no valid slides gets its in-order share of the deck.
        for topic, share in zip(topics, _even_partition(known, len(topics))):
            if not topic["slides"]:
                topic["slides"] = share

        print(f"   Found {len(topics)} topics: {[t['label'] for t in topics]}")
        return topics

    except Exception as e:
        print(f"⚠️  Topic detection failed: {e}")
        # Fallback: single topic covering the whole deck
        return [{"topic_id": 0, "label": "عام" if language == "ar" else "General", "slides": known}]
