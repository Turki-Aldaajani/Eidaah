# rag_generator.py
# Generates topic-level analysis using the LLM (Groq).
# Sends relevant chunk text directly — no vector retrieval needed.

import json


RAG_SYSTEM_PROMPT = """You are "Eidaah" (إيضاح), an expert educational assistant.
You help university students understand presentation topics deeply and thoroughly.

LANGUAGE RULES:
- If the content is in Arabic, respond ENTIRELY in Arabic.
- If the content is in English, respond ENTIRELY in English.
- Never mix languages.

You will receive presentation content related to a topic.
Provide accurate, educational responses."""

RAG_PROMPT_TEMPLATE = """TOPIC: {topic_label}

RELEVANT CONTENT FROM THE PRESENTATION:
---
{content}
---

Based on the above, provide:
1. EXPLANATION: A clear, thorough explanation of this topic (4-6 sentences).
2. EXAMPLE: One concrete, practical real-world example (2-3 sentences).

You MUST respond in this exact JSON format and nothing else:
{{
  "explanation": "...",
  "example": "..."
}}"""

SUMMARY_PROMPT = """Summarize this entire presentation in 3-4 sentences.
Cover the main theme, key topics, and overall purpose.
If the content is in Arabic, summarize in Arabic. If in English, summarize in English.

Content:
{text}"""


def generate_summary(all_text: str, call_groq_fn) -> str:
    """Generate a global summary of the entire presentation."""
    truncated = all_text[:4000]
    try:
        return call_groq_fn(
            SUMMARY_PROMPT.format(text=truncated),
            max_tokens=250,
            temperature=0.2,
        )
    except Exception as e:
        print(f"⚠️  Summary generation failed: {e}")
        return "Summary not available."


def generate_topic_analysis(
    topic: dict,
    chunks: list,
    summary: str,
    call_groq_fn,
) -> dict:
    """
    Generate explanation and example for a specific topic using chunks.
    No vector retrieval — sends all chunk text directly to the LLM.
    """
    # Use all chunk text (truncated to fit context)
    all_content = "\n---\n".join(c["text"] for c in chunks)
    truncated_content = all_content[:4000]

    prompt = RAG_PROMPT_TEMPLATE.format(
        topic_label=topic.get("label", f"Topic {topic['topic_id'] + 1}"),
        content=truncated_content,
    )

    try:
        raw = call_groq_fn(
            prompt=prompt,
            max_tokens=600,
            temperature=0.3,
            system_prompt=RAG_SYSTEM_PROMPT,
        )

        # Parse JSON response
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        result = json.loads(cleaned)

    except json.JSONDecodeError:
        result = {
            "explanation": raw,
            "example": "",
        }
    except Exception as e:
        print(f"❌ Topic analysis error: {e}")
        result = {
            "explanation": f"Error generating analysis: {str(e)}",
            "example": "",
        }

    return {
        "topic_label": topic.get("label", f"Topic {topic['topic_id'] + 1}"),
        "explanation": result.get("explanation", ""),
        "examples": [result["example"]] if result.get("example") else [],
        # Backward compat
        "analysis": result.get("explanation", ""),
    }
