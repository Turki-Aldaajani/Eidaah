# study_agent.py
# A1 · Study-agent orchestration engine.
# Pure, injectable helpers that turn Eidaah from a tool into an agent: given a
# student's goal and the material's detected topics, it PLANS a study path,
# GRADES quiz answers, and writes a final strengths/weaknesses REPORT. The
# stateful loop that calls these (explain -> quiz -> grade -> re-loop) lives in
# main.py over agent_store; keeping the LLM logic here makes it unit-testable
# with an injected call_groq function, exactly like the other AI modules.

import json

MASTERY_THRESHOLD = 0.6  # kept in sync with agent_store.MASTERY_THRESHOLD

PLAN_SYSTEM_PROMPT = """You are "Eidaah" (إيضاح), a study-planning agent for students.
Given a student's goal and the list of topics detected in their material, you produce a focused study plan: which topics to study and in what order, with a one-line focus for each. Only use the topics you are given — never invent new ones.

LANGUAGE RULES:
- If asked to respond in Arabic, respond ENTIRELY in Arabic.
- If asked to respond in English, respond ENTIRELY in English.
- Never mix languages."""

REPORT_SYSTEM_PROMPT = """You are "Eidaah" (إيضاح), a study-agent writing a short, encouraging readiness report for a student after a study session.
You are given the student's goal and their score on each topic. Write a brief, motivating paragraph that states how ready they are for their goal, praises their strong topics, and tells them exactly which topics to review next.

LANGUAGE RULES:
- If asked to respond in Arabic, respond ENTIRELY in Arabic.
- If asked to respond in English, respond ENTIRELY in English.
- Never mix languages."""

LANGUAGE_INSTRUCTIONS = {
    "ar": "CRITICAL: Respond ENTIRELY in Arabic (العربية). Do not use any English words.",
    "en": "CRITICAL: Respond ENTIRELY in English. Do not use any Arabic words.",
}

PLAN_PROMPT = """Student's goal:
\"\"\"{goal}\"\"\"

Overall summary of the material:
{summary}

Available topics (use ONLY these; refer to each by its exact id):
{topics_block}

Produce a study plan ordered from what the student should study first to last, given their goal. You may drop topics that are irrelevant to the goal, but keep at least one.

Respond ONLY with this exact JSON shape and nothing else:
{{"intro": "one short sentence introducing the plan to the student", "steps": [{{"topic_id": 0, "focus": "one short line on what to focus on for this topic"}}]}}"""

REPORT_PROMPT = """Student's goal:
\"\"\"{goal}\"\"\"

Scores per topic (ratio is fraction correct, 0.0–1.0):
{scores_block}

Write ONE short paragraph (3-5 sentences): how ready the student is for their goal, which topics are their strengths, and which topics they should review next.

Respond ONLY with this exact JSON shape and nothing else:
{{"readiness": "the paragraph described above"}}"""


def _clean_json(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    return cleaned.strip()


def _system_for(base: str, language: str) -> str:
    if language in LANGUAGE_INSTRUCTIONS:
        return base + "\n\n" + LANGUAGE_INSTRUCTIONS[language]
    return base


def plan_study(goal: str, topics: list, summary: str, call_groq_fn, language: str = "ar") -> dict:
    """
    Turn a goal + the material's topics into an ordered study plan.

    Returns {"intro": str, "steps": [{"topic_id": int, "label": str, "focus": str}, ...]}.
    Always returns a non-empty plan: if the LLM output is unusable, falls back to
    all topics in their original order.
    """
    valid = {t["topic_id"]: t.get("label", f"Topic {t['topic_id']}") for t in topics}

    def fallback():
        return {
            "intro": "",
            "steps": [{"topic_id": tid, "label": label, "focus": ""} for tid, label in valid.items()],
        }

    if not valid:
        return {"intro": "", "steps": []}

    topics_block = "\n".join(f"- id {tid}: {label}" for tid, label in valid.items())
    prompt = PLAN_PROMPT.format(goal=goal.strip(), summary=(summary or "").strip()[:1500], topics_block=topics_block)

    try:
        raw = call_groq_fn(
            prompt=prompt,
            max_tokens=600,
            temperature=0.3,
            system_prompt=_system_for(PLAN_SYSTEM_PROMPT, language),
        )
        parsed = json.loads(_clean_json(raw))
    except Exception as e:
        print(f"⚠️  study plan generation/parse failed: {e}")
        return fallback()

    if not isinstance(parsed, dict) or not isinstance(parsed.get("steps"), list):
        return fallback()

    steps = []
    seen = set()
    for item in parsed["steps"]:
        if not isinstance(item, dict):
            continue
        tid = item.get("topic_id")
        if not isinstance(tid, int) or isinstance(tid, bool) or tid not in valid or tid in seen:
            continue
        seen.add(tid)
        focus = item.get("focus")
        steps.append({
            "topic_id": tid,
            "label": valid[tid],
            "focus": focus.strip() if isinstance(focus, str) else "",
        })

    if not steps:  # LLM returned no usable topic ids
        return fallback()

    intro = parsed.get("intro")
    return {"intro": intro.strip() if isinstance(intro, str) else "", "steps": steps}


def grade_answers(questions: list, answers: list) -> dict:
    """
    Grade the student's chosen option indices against the questions.

    Returns {"correct": int, "total": int, "ratio": float, "wrong": [question_index, ...]}.
    Missing/None answers count as wrong.
    """
    total = len(questions)
    if total == 0:
        return {"correct": 0, "total": 0, "ratio": 0.0, "wrong": []}

    correct = 0
    wrong = []
    for i, q in enumerate(questions):
        chosen = answers[i] if answers is not None and i < len(answers) else None
        if chosen == q.get("a"):
            correct += 1
        else:
            wrong.append(i)
    return {"correct": correct, "total": total, "ratio": correct / total, "wrong": wrong}


def build_report(goal: str, results: list, call_groq_fn, language: str = "ar") -> dict:
    """
    Build the final strengths/weaknesses report.

    `results`: [{"label": str, "best_ratio": float}, ...].
    Strengths/weaknesses are computed deterministically from the scores; the LLM
    only writes the narrative readiness paragraph (with a safe fallback).
    Returns {"readiness": str, "strengths": [labels], "weaknesses": [labels],
             "overall_ratio": float, "topics": [{label, ratio, mastered}]}.
    """
    topics = []
    for r in results:
        ratio = r.get("best_ratio")
        ratio = 0.0 if ratio is None else ratio
        topics.append({
            "label": r["label"],
            "ratio": round(ratio, 2),
            "mastered": ratio >= MASTERY_THRESHOLD,
        })

    strengths = [t["label"] for t in topics if t["mastered"]]
    weaknesses = [t["label"] for t in topics if not t["mastered"]]
    overall = round(sum(t["ratio"] for t in topics) / len(topics), 2) if topics else 0.0

    scores_block = "\n".join(f"- {t['label']}: {int(t['ratio'] * 100)}%" for t in topics)
    readiness = ""
    try:
        raw = call_groq_fn(
            prompt=REPORT_PROMPT.format(goal=goal.strip(), scores_block=scores_block),
            max_tokens=400,
            temperature=0.4,
            system_prompt=_system_for(REPORT_SYSTEM_PROMPT, language),
        )
        parsed = json.loads(_clean_json(raw))
        if isinstance(parsed, dict) and isinstance(parsed.get("readiness"), str):
            readiness = parsed["readiness"].strip()
    except Exception as e:
        print(f"⚠️  report narrative generation failed: {e}")

    if not readiness:  # deterministic fallback so the demo always ends cleanly
        if language == "en":
            readiness = (
                f"You answered {int(overall * 100)}% correctly overall. "
                + (f"Strong topics: {', '.join(strengths)}. " if strengths else "")
                + (f"Review next: {', '.join(weaknesses)}." if weaknesses else "You're ready — great work!")
            )
        else:
            readiness = (
                f"أجبت بنسبة {int(overall * 100)}% بشكل صحيح إجمالاً. "
                + (f"نقاط قوتك: {'، '.join(strengths)}. " if strengths else "")
                + (f"راجع لاحقاً: {'، '.join(weaknesses)}." if weaknesses else "أنت جاهز، عمل رائع!")
            )

    return {
        "readiness": readiness,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "overall_ratio": overall,
        "topics": topics,
    }
