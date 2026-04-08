# topic_detector.py
# Detects topics from chunked slide text using the LLM (Groq).
# No local embeddings or clustering — pure LLM-based detection.

import json


def detect_topics(chunks: list, call_groq_fn) -> list:
    """
    Use the LLM to identify distinct topics from the presentation chunks.
    Returns a list of topic dicts: [{"topic_id": 0, "label": "..."}, ...]
    """
    if not chunks:
        return []

    # Build a condensed view of all chunks for the LLM
    chunk_summaries = []
    for c in chunks:
        preview = c["text"][:200].replace("\n", " ")
        slides_str = ", ".join(str(s) for s in c["slides"])
        chunk_summaries.append(f"[Slides {slides_str}]: {preview}")

    combined = "\n".join(chunk_summaries)

    prompt = (
        "Analyze this presentation content and identify the 2-6 main topics discussed.\n"
        "For each topic, give a short label (3-6 words).\n"
        "If the content is in Arabic, give Arabic labels. If English, give English labels.\n\n"
        "Respond ONLY with a JSON array of strings, nothing else. Example:\n"
        '[\"Introduction to Machine Learning\", \"Neural Network Architectures\", \"Training Methods\"]\n\n'
        f"Content:\n{combined[:3000]}"
    )

    try:
        raw = call_groq_fn(
            prompt=prompt,
            max_tokens=200,
            temperature=0.2,
        )

        # Clean and parse
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        labels = json.loads(cleaned)

        if not isinstance(labels, list) or len(labels) == 0:
            raise ValueError("Expected a non-empty list of topic labels")

        # Build topic objects
        topics = []
        for i, label in enumerate(labels):
            topics.append({
                "topic_id": i,
                "label": str(label).strip().strip('"').strip("'"),
            })

        print(f"   Found {len(topics)} topics: {[t['label'] for t in topics]}")
        return topics

    except Exception as e:
        print(f"⚠️  Topic detection failed: {e}")
        # Fallback: single topic
        return [{"topic_id": 0, "label": "General"}]
