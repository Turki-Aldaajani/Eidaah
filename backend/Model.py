# Model.py
# AI Model Integration - Groq API (Llama 3.3 70B)
# Extended for Phase 3: RAG + topic analysis

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ---------------------
# Configuration
# ---------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "llama-3.3-70b-versatile"

if not GROQ_API_KEY:
    print("⚠️  WARNING: GROQ_API_KEY not found in .env file!")
    print("   Get a free key at: https://console.groq.com/keys")
    print("   Then add it to your .env file: GROQ_API_KEY=your_key_here\n")
    client = None
else:
    client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )
    print(f"✅ Groq AI model configured successfully! (using {MODEL_NAME})")


# ---------------------
# System Prompts
# ---------------------
SYSTEM_PROMPT = """You are "Eidaah" (إيضاح), an expert educational assistant for university students.
You help students understand presentation slides clearly and thoroughly.

LANGUAGE RULES (VERY IMPORTANT):
- If the slide text is in Arabic, you MUST respond ENTIRELY in Arabic.
- If the slide text is in English, you MUST respond ENTIRELY in English.
- If the text is mixed, respond in the dominant language.
- Never mix languages in your response."""

EXPLANATION_PROMPT = """Analyze and explain this presentation slide content clearly and concisely.
Focus on making complex concepts easy to understand for a university student.
Write 2-4 sentences maximum.

Slide content:
{text}"""

EXAMPLE_PROMPT = """Based on this slide content, give ONE concrete, practical real-world example
that illustrates the main concept. Keep it brief (2-3 sentences max).
Make it relatable to university students.

Slide content:
{text}"""


# ---------------------
# Core: Call Groq API (shared utility)
# ---------------------
def call_groq(prompt: str, max_tokens: int = 300, temperature: float = 0.3, system_prompt: str = None) -> str:
    """Make a single call to the Groq API. Used by all modules."""
    if not client:
        return "AI model is not configured. Please add GROQ_API_KEY to .env."

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt or SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()


# Backward-compatible alias
_call_groq = call_groq


# ---------------------
# Legacy: Slide-level generation (preserved for /api/analyze_slide)
# ---------------------
def generate_explanation_and_example(text: str):
    """
    Takes slide text, returns (explanation, example).
    Backward compatible — ai_logic.py calls this directly.
    """
    if not text.strip():
        return "No text found on this slide.", "No example available."

    if not client:
        return (
            "AI model is not configured. Please add GROQ_API_KEY to the .env file.",
            "Visit https://console.groq.com/keys to get a free API key."
        )

    try:
        explanation = call_groq(
            EXPLANATION_PROMPT.format(text=text),
            max_tokens=300, temperature=0.3,
        )
        example = call_groq(
            EXAMPLE_PROMPT.format(text=text[:500]),
            max_tokens=200, temperature=0.5,
        )
        return explanation, example

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Groq API Error: {error_msg}")
        if "401" in error_msg or "invalid" in error_msg.lower():
            return "Invalid API key. Please check your GROQ_API_KEY.", ""
        elif "429" in error_msg or "rate" in error_msg.lower():
            return "Rate limit reached. Please wait a moment and try again.", ""
        else:
            return f"Error generating analysis: {error_msg}", ""
