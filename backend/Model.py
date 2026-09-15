# Model.py
# AI Model Integration - DeepSeek API (deepseek-flash)
# Extended for Phase 3: RAG + topic analysis

import base64
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ---------------------
# Configuration
# ---------------------
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
MODEL_NAME = "deepseek-flash"

if not DEEPSEEK_API_KEY:
    print("⚠️  WARNING: DEEPSEEK_API_KEY not found in .env file!")
    print("   Get a key at: https://platform.deepseek.com")
    print("   Then add it to your .env file: DEEPSEEK_API_KEY=your_key_here\n")
    client = None
else:
    client = OpenAI(
        api_key=DEEPSEEK_API_KEY,
        base_url="https://api.deepseek.com",
    )
    print(f"✅ DeepSeek AI model configured successfully! (using {MODEL_NAME})")


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

LANGUAGE_INSTRUCTIONS = {
    "ar": "CRITICAL INSTRUCTION: You MUST respond ENTIRELY in Arabic (العربية) regardless of the language of the input text. Do not use any English words.",
    "en": "CRITICAL INSTRUCTION: You MUST respond ENTIRELY in English regardless of the language of the input text. Do not use any Arabic words.",
}

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
# Core: Call LLM API (shared utility)
# ---------------------
def call_groq(
    prompt: str,
    max_tokens: int = 300,
    temperature: float = 0.3,
    system_prompt: str = None,
    reasoning_effort: str = "medium",
) -> str:
    """Make a single call to the DeepSeek API. Used by all modules."""
    if not client:
        return "AI model is not configured. Please add DEEPSEEK_API_KEY to .env."

    # reasoning_effort is kept in the signature so callers don't change, but is
    # not forwarded: deepseek-flash thinks by default, and thinking tokens count
    # against max_tokens — the small budgets callers pass would come back empty.
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt or SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
        extra_body={"thinking": {"type": "disabled"}},
    )
    return response.choices[0].message.content.strip()


# Backward-compatible alias
_call_groq = call_groq


# ---------------------
# Vision (#109): reads a slide IMAGE when its text is too thin to explain.
# deepseek-flash is text-only, so this goes to a Groq vision model, the one the
# model benchmark preprocesses slides with. Optional: without GROQ_API_KEY,
# call_vision returns "" and the explanation uses the slide text alone.
# ---------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
VISION_MODEL = os.getenv("VISION_MODEL", "qwen/qwen3.8-27b")

# Short timeout and no retries: the image is extra context, never worth a long wait.
vision_client = (
    OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1", timeout=30.0, max_retries=0)
    if GROQ_API_KEY else None
)


def call_vision(
    prompt: str,
    image_bytes: bytes,
    max_tokens: int = 700,
    temperature: float = 0.2,
    mime_type: str = "image/jpeg",
) -> str:
    """Ask the vision model about one image. Returns "" when vision isn't configured."""
    if not vision_client or not image_bytes:
        return ""

    data_url = f"data:{mime_type};base64," + base64.b64encode(image_bytes).decode("ascii")
    response = vision_client.chat.completions.create(
        model=VISION_MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return (response.choices[0].message.content or "").strip()


# ---------------------
# Legacy: Slide-level generation (preserved for /api/analyze_slide)
# ---------------------
def generate_explanation_and_example(text: str, language: str = None):
    """
    Takes slide text, returns (explanation, example).
    Backward compatible — ai_logic.py calls this directly.
    If language is provided ("ar" or "en"), forces the response in that language.
    """
    if not text.strip():
        return "No text found on this slide.", "No example available."

    if not client:
        return (
            "AI model is not configured. Please add DEEPSEEK_API_KEY to the .env file.",
            "Visit https://platform.deepseek.com to get an API key."
        )

    system = SYSTEM_PROMPT
    if language and language in LANGUAGE_INSTRUCTIONS:
        system = SYSTEM_PROMPT + "\n\n" + LANGUAGE_INSTRUCTIONS[language]

    try:
        explanation = call_groq(
            EXPLANATION_PROMPT.format(text=text),
            max_tokens=450, temperature=0.3,
            system_prompt=system,
        )
        example = call_groq(
            EXAMPLE_PROMPT.format(text=text[:500]),
            max_tokens=300, temperature=0.5,
            system_prompt=system,
        )
        return explanation, example

    except Exception as e:
        error_msg = str(e)
        print(f"❌ DeepSeek API Error: {error_msg}")
        if "401" in error_msg or "invalid" in error_msg.lower():
            return "Invalid API key. Please check your DEEPSEEK_API_KEY.", ""
        elif "429" in error_msg or "rate" in error_msg.lower():
            return "Rate limit reached. Please wait a moment and try again.", ""
        else:
            return f"Error generating analysis: {error_msg}", ""
