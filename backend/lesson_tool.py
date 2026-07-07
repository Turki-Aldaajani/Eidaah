# lesson_tool.py
# Generates the four curriculum AI-tool panels (summary, real-world example,
# study notes) and the 5-question quiz for a lesson, using only the LLM's
# general knowledge of the Saudi curriculum. No source document is available
# yet — this hook can later be swapped to pull real chunks from an ingested
# curriculum PDF via RAG without changing the function contract.

import json

LESSON_TOOL_SYSTEM_PROMPT = """You are "Eidaah" (إيضاح), an expert curriculum assistant for K-12 students following the Saudi national curriculum.
You generate study content for a specific lesson using only your general knowledge of the Saudi curriculum — you have not been given the lesson's source material, so rely on what a lesson with this title, in this subject and grade, would typically cover.

LANGUAGE RULES:
- If asked to respond in Arabic, respond ENTIRELY in Arabic.
- If asked to respond in English, respond ENTIRELY in English.
- Never mix languages."""

LANGUAGE_INSTRUCTIONS = {
    "ar": "CRITICAL: Respond ENTIRELY in Arabic (العربية). Do not use any English words.",
    "en": "CRITICAL: Respond ENTIRELY in English. Do not use any Arabic words.",
}

SUM_PROMPT = """Grade/stage: {stage}
Subject: {subject}
Lesson title: {lesson_title}

Write a concise 4-point summary of what this lesson typically covers, based on your general knowledge of the Saudi national curriculum. Each point should be one sentence.

Respond ONLY with this exact JSON shape and nothing else:
{{"points": ["...", "...", "...", "..."]}}"""

EX_PROMPT = """Grade/stage: {stage}
Subject: {subject}
Lesson title: {lesson_title}

Give ONE short real-world scenario (a heading of 3-6 words, then 2 short paragraphs) that illustrates how this lesson's topic shows up in everyday life for a student at this grade level.

Respond ONLY with this exact JSON shape and nothing else:
{{"heading": "...", "paragraphs": ["...", "..."]}}"""

NOTES_PROMPT = """Grade/stage: {stage}
Subject: {subject}
Lesson title: {lesson_title}

Give study notes for this lesson: 2-3 key laws/rules, 2 key definitions, and 2-3 exam tips, based on your general knowledge of the Saudi national curriculum for this grade and subject.

Respond ONLY with this exact JSON shape and nothing else:
{{"laws": ["...", "..."], "defs": ["...", "..."], "exam": ["...", "..."]}}"""

QUIZ_PROMPT = """Grade/stage: {stage}
Subject: {subject}
Lesson title: {lesson_title}

Write exactly 5 multiple-choice questions testing understanding of this lesson, based on your general knowledge of the Saudi national curriculum for this grade and subject. Each question has exactly 4 options and exactly one correct answer.

Respond ONLY with this exact JSON shape and nothing else — a JSON array of exactly 5 objects:
[{{"q": "...", "o": ["...", "...", "...", "..."], "a": 0}}, ...]
"a" is the zero-based index of the correct option."""

_PROMPTS = {"sum": SUM_PROMPT, "ex": EX_PROMPT, "notes": NOTES_PROMPT, "quiz": QUIZ_PROMPT}


def _clean_json(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    return cleaned.strip()


def _validate_quiz(data):
    if not isinstance(data, list) or len(data) != 5:
        return None
    for item in data:
        if not isinstance(item, dict):
            return None
        if not isinstance(item.get("q"), str) or not item["q"].strip():
            return None
        options = item.get("o")
        if not isinstance(options, list) or len(options) != 4:
            return None
        if not all(isinstance(o, str) and o.strip() for o in options):
            return None
        answer = item.get("a")
        if not isinstance(answer, int) or isinstance(answer, bool) or not (0 <= answer <= 3):
            return None
    return data


def _validate_shape(tool: str, parsed):
    if tool == "sum":
        if isinstance(parsed, dict) and isinstance(parsed.get("points"), list) and parsed["points"]:
            return {"points": [str(p) for p in parsed["points"]]}
        return None
    if tool == "ex":
        if isinstance(parsed, dict) and isinstance(parsed.get("heading"), str) and isinstance(parsed.get("paragraphs"), list) and parsed["paragraphs"]:
            return {"heading": parsed["heading"], "paragraphs": [str(p) for p in parsed["paragraphs"]]}
        return None
    if tool == "notes":
        if isinstance(parsed, dict) and all(isinstance(parsed.get(k), list) and parsed.get(k) for k in ("laws", "defs", "exam")):
            return {k: [str(x) for x in parsed[k]] for k in ("laws", "defs", "exam")}
        return None
    return None


def generate_lesson_tool_content(stage: str, subject: str, lesson_title: str, tool: str, call_groq_fn, language: str = "ar"):
    system = LESSON_TOOL_SYSTEM_PROMPT
    if language in LANGUAGE_INSTRUCTIONS:
        system = LESSON_TOOL_SYSTEM_PROMPT + "\n\n" + LANGUAGE_INSTRUCTIONS[language]

    prompt = _PROMPTS[tool].format(stage=stage, subject=subject, lesson_title=lesson_title)

    try:
        raw = call_groq_fn(
            prompt=prompt,
            max_tokens=700 if tool == "quiz" else 400,
            temperature=0.4,
            system_prompt=system,
        )
        parsed = json.loads(_clean_json(raw))
    except Exception as e:
        print(f"⚠️  lesson_tool generation/parse failed ({tool}): {e}")
        return None

    if tool == "quiz":
        return _validate_quiz(parsed)
    return _validate_shape(tool, parsed)
