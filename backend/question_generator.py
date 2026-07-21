# question_generator.py
# A2 · Review-question generator.
# Takes real slide/document content and returns 3–5 multiple-choice review
# questions in the user's language, each with the correct answer and a short
# rationale. Returns a fixed JSON shape consumed by the frontend Quiz component
# and by the study agent (A1). Depends only on the shared call_groq utility, so
# it can run over the current analysis path today and over stored library
# content later without any contract change.

import json

MIN_QUESTIONS = 3
MAX_QUESTIONS = 5
MAX_CONTENT_CHARS = 6000  # keep the prompt well within model limits

QUESTION_SYSTEM_PROMPT = """You are "Eidaah" (إيضاح), an expert educational assistant that writes review questions for students.
You are given the actual content of a lesson or presentation and must write multiple-choice questions that test genuine understanding of THAT content — not trivia and not questions answerable without reading it.

RULES:
- Base every question strictly on the provided content. Do not invent facts that are not supported by it.
- Questions must be varied: mix recall, understanding, and application. Do not repeat the same idea.
- Each question has exactly 4 options and exactly one unambiguously correct answer; the other 3 must be plausible but clearly wrong.
- Keep each explanation to one short sentence saying why the correct option is right.

LANGUAGE RULES:
- If asked to respond in Arabic, respond ENTIRELY in Arabic.
- If asked to respond in English, respond ENTIRELY in English.
- Never mix languages."""

LANGUAGE_INSTRUCTIONS = {
    "ar": "CRITICAL: Write every question, option, and explanation ENTIRELY in Arabic (العربية). Do not use any English words.",
    "en": "CRITICAL: Write every question, option, and explanation ENTIRELY in English. Do not use any Arabic words.",
}

QUESTION_PROMPT = """Content to build the questions from:
\"\"\"
{content}
\"\"\"

Write between {min_q} and {max_q} multiple-choice review questions testing understanding of the content above. Each question has exactly 4 options and exactly one correct answer.

Respond ONLY with this exact JSON shape and nothing else — a JSON array of objects:
[{{"q": "...", "o": ["...", "...", "...", "..."], "a": 0, "e": "..."}}, ...]
"a" is the zero-based index of the correct option. "e" is a one-sentence explanation of why that option is correct."""


def _clean_json(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    return cleaned.strip()


def _validate_questions(data):
    """Return the cleaned list of questions, or None if the shape is invalid."""
    if not isinstance(data, list) or not (MIN_QUESTIONS <= len(data) <= MAX_QUESTIONS):
        return None

    cleaned = []
    for item in data:
        if not isinstance(item, dict):
            return None
        question = item.get("q")
        if not isinstance(question, str) or not question.strip():
            return None
        options = item.get("o")
        if not isinstance(options, list) or len(options) != 4:
            return None
        if not all(isinstance(o, str) and o.strip() for o in options):
            return None
        answer = item.get("a")
        # bool is a subclass of int — reject it explicitly.
        if not isinstance(answer, int) or isinstance(answer, bool) or not (0 <= answer <= 3):
            return None
        explanation = item.get("e")
        if not isinstance(explanation, str) or not explanation.strip():
            return None
        cleaned.append({
            "q": question.strip(),
            "o": [o.strip() for o in options],
            "a": answer,
            "e": explanation.strip(),
        })
    return cleaned


def generate_review_questions(content: str, call_groq_fn, language: str = "ar"):
    """
    Generate 3–5 review MCQs from the given content.

    Returns a list of {"q", "o", "a", "e"} dicts, or None if the content is
    empty or the model output could not be parsed/validated.
    """
    if not content or not content.strip():
        return None

    system = QUESTION_SYSTEM_PROMPT
    if language in LANGUAGE_INSTRUCTIONS:
        system = QUESTION_SYSTEM_PROMPT + "\n\n" + LANGUAGE_INSTRUCTIONS[language]

    prompt = QUESTION_PROMPT.format(
        content=content.strip()[:MAX_CONTENT_CHARS],
        min_q=MIN_QUESTIONS,
        max_q=MAX_QUESTIONS,
    )

    try:
        raw = call_groq_fn(
            prompt=prompt,
            max_tokens=1200,
            temperature=0.4,
            system_prompt=system,
        )
        parsed = json.loads(_clean_json(raw))
    except Exception as e:
        print(f"⚠️  review-question generation/parse failed: {e}")
        return None

    return _validate_questions(parsed)
