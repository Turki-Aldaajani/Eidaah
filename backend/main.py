# main.py
# Eidaah Phase 3 — Topic Detection + Analysis (LLM-only, no local embeddings)

from fastapi import FastAPI, File, UploadFile, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import Optional
from contextlib import asynccontextmanager
import asyncio
import io
import os
import re
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

load_dotenv()

import ai_logic
from Model import call_groq
from session_store import (
    create_session, get_session, cleanup_expired, active_session_count
)
from slide_renderer import render_slides
from chunker import chunk_slides
from topic_detector import detect_topics
from rag_generator import generate_summary, generate_topic_analysis  # noqa: F401 (generate_summary used in endpoint)
from lesson_tool import generate_lesson_tool_content
from question_generator import generate_review_questions
import agent_store
from study_agent import plan_study, grade_answers, build_report

# Thread pool for blocking work
executor = ThreadPoolExecutor(max_workers=3)


# ---------------------------------------------------------
# App Lifespan
# ---------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Eidaah server starting...")
    cleanup_task = asyncio.create_task(_periodic_cleanup())
    yield
    cleanup_task.cancel()
    print("👋 Eidaah server shutting down.")


async def _periodic_cleanup():
    while True:
        await asyncio.sleep(600)
        cleanup_expired()
        agent_store.cleanup_expired()


app = FastAPI(
    title="Eidaah - AI Presentation Explainer",
    description="LLM-powered presentation analysis with topic detection.",
    version="3.1.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
origins = ["*"] if FRONTEND_URL == "*" else [
    FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000",
]

# Vercel preview deployments get a random per-deploy subdomain
# (e.g. eidaah-jgqp-<hash>-<team>.vercel.app), so an exact match on
# FRONTEND_URL alone rejects every preview URL. Derive the project slug
# from FRONTEND_URL and allow any preview subdomain for that project too.
_vercel_preview_regex = None
if FRONTEND_URL != "*":
    _slug_match = re.match(r"https?://([a-z0-9-]+)\.vercel\.app", FRONTEND_URL)
    if _slug_match:
        _vercel_preview_regex = rf"https://{re.escape(_slug_match.group(1))}(-[a-z0-9]+)*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=_vercel_preview_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Global Error Handler
# ---------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"❌ Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."}
    )


# ---------------------------------------------------------
# Background: Semantic Pipeline (no embeddings — pure LLM)
# ---------------------------------------------------------
MAX_UPLOAD_SIZE = 20 * 1024 * 1024  # 20MB


def _run_semantic_pipeline(session_id: str, file_bytes: bytes, file_type: str, filename: str):
    """
    Background task: render images, chunk text, detect topics via LLM.
    Updates the session in-place.
    """
    session = get_session(session_id)
    if not session:
        return

    try:
        # 1. Render slide images (optional — needs LibreOffice for PPTX)
        print(f"🖼️  [{session_id}] Rendering slide images...")
        image_files = render_slides(file_bytes, file_type, filename, session.slide_images_dir)
        session.slide_images = image_files

        # 2. Chunk the text
        print(f"✂️  [{session_id}] Chunking text...")
        chunks = chunk_slides(session.slides)
        session.chunks = chunks

        if not chunks:
            session.indexing_complete = True
            return

        # 3. Detect topics via LLM (no embeddings!)
        print(f"🏷️  [{session_id}] Detecting topics via LLM...")
        topics = detect_topics(chunks, call_groq)
        session.topics = topics

        # 4. Generate global summary
        print(f"📝 [{session_id}] Generating summary...")
        all_text = "\n\n".join(s["text"] for s in session.slides)
        session.summary = generate_summary(all_text, call_groq)

        session.indexing_complete = True
        print(f"✅ [{session_id}] Pipeline complete! ({len(chunks)} chunks, {len(topics)} topics)")

    except Exception as e:
        print(f"❌ [{session_id}] Semantic pipeline error: {e}")
        import traceback
        traceback.print_exc()
        session.indexing_complete = True


# ---------------------------------------------------------
# ENDPOINT: Upload File
# ---------------------------------------------------------
@app.post("/api/upload_file", tags=["Step 1: Upload"])
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF or PPTX file"),
):
    """Upload a PDF/PPTX. Returns slides immediately. Topics detected in background."""
    file_contents = await file.read()
    if len(file_contents) > MAX_UPLOAD_SIZE:
        return JSONResponse(status_code=413, content={"detail": "File too large. Max 20MB."})

    file_stream = io.BytesIO(file_contents)

    pages = await ai_logic.process_file_to_pages(
        file=file_stream,
        file_type=file.content_type,
        filename=file.filename,
    )

    session = create_session(filename=file.filename, slides=pages)

    background_tasks.add_task(
        _run_semantic_pipeline,
        session.session_id,
        file_contents,
        file.content_type,
        file.filename,
    )

    return {
        "session_id": session.session_id,
        "filename": file.filename,
        "slides": pages,
    }


# ---------------------------------------------------------
# ENDPOINT: Session Status
# ---------------------------------------------------------
@app.get("/api/session/{session_id}/status", tags=["Session"])
async def session_status(session_id: str):
    """Check if topic detection is complete. Returns topics when ready."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")

    slides_with_images = []
    for slide in session.slides:
        s = {**slide}
        img_file = f"{slide['slide_number']}.jpg"
        if img_file in session.slide_images:
            s["image_url"] = f"/api/slides/{session_id}/{img_file}"
        slides_with_images.append(s)

    return {
        "session_id": session_id,
        "indexing_complete": session.indexing_complete,
        "slides": slides_with_images,
        "topics": session.topics if session.indexing_complete else [],
        "summary": session.summary if session.indexing_complete else "",
    }


# ---------------------------------------------------------
# ENDPOINT: Slide Image
# ---------------------------------------------------------
@app.get("/api/slides/{session_id}/{filename}", tags=["Slides"])
async def get_slide_image(session_id: str, filename: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")

    filepath = os.path.join(session.slide_images_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Slide image not found.")

    return FileResponse(filepath, media_type="image/jpeg")


# ---------------------------------------------------------
# ENDPOINT: Analyze Topic (LLM-powered, no FAISS)
# ---------------------------------------------------------
class AnalyzeTopicRequest(BaseModel):
    session_id: str
    topic_id: int
    language: str = "ar"


@app.post("/api/analyze_topic", tags=["Step 2: Analyze"])
async def analyze_topic(payload: AnalyzeTopicRequest):
    """Generate explanation and example for a topic."""
    session = get_session(payload.session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")

    if not session.indexing_complete:
        return JSONResponse(
            status_code=202,
            content={"detail": "Indexing still in progress. Please wait."}
        )

    topic = None
    for t in session.topics:
        if t["topic_id"] == payload.topic_id:
            topic = t
            break

    if topic is None:
        raise HTTPException(404, f"Topic {payload.topic_id} not found.")

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        executor,
        generate_topic_analysis,
        topic,
        session.chunks,
        session.summary,
        call_groq,
        payload.language,
    )

    return result


# ---------------------------------------------------------
# ENDPOINT: Generate Summary (on-demand, with language)
# ---------------------------------------------------------
class SummaryRequest(BaseModel):
    language: str = "ar"


@app.post("/api/session/{session_id}/summary", tags=["Step 2: Analyze"])
async def get_summary(session_id: str, payload: SummaryRequest):
    """Generate (or regenerate) the presentation summary in the requested language."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")

    if not session.indexing_complete:
        return JSONResponse(
            status_code=202,
            content={"detail": "Indexing still in progress. Please wait."}
        )

    all_text = "\n\n".join(s["text"] for s in session.slides)

    loop = asyncio.get_event_loop()
    summary = await loop.run_in_executor(
        executor,
        generate_summary,
        all_text,
        call_groq,
        payload.language,
    )

    return {"summary": summary}


# ---------------------------------------------------------
# ENDPOINT: Analyze Slide (Legacy — backward compatible)
# ---------------------------------------------------------
class AnalyzeRequest(BaseModel):
    text: str
    language: str = "ar"


@app.post("/api/analyze_slide", tags=["Step 2: Analyze (Legacy)"])
async def analyze_slide(payload: AnalyzeRequest):
    result = await ai_logic.process_text_directly(payload.text, language=payload.language)
    return result


# ---------------------------------------------------------
# ENDPOINT: Curriculum Lesson AI Tools (summary / example / notes / quiz)
# ---------------------------------------------------------
LESSON_TOOLS = {"sum", "ex", "notes", "quiz"}


class LessonToolRequest(BaseModel):
    stage: str
    subject: str
    lesson_title: str
    tool: str
    language: str = "ar"


@app.post("/api/lesson_tool", tags=["Curriculum: AI Tools"])
async def lesson_tool_endpoint(payload: LessonToolRequest):
    """Generate one of the four curriculum AI-tool panels, or the lesson quiz."""
    if payload.tool not in LESSON_TOOLS:
        raise HTTPException(400, f"Invalid tool '{payload.tool}'. Must be one of: {sorted(LESSON_TOOLS)}.")

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        executor,
        generate_lesson_tool_content,
        payload.stage,
        payload.subject,
        payload.lesson_title,
        payload.tool,
        call_groq,
        payload.language,
    )

    if result is None:
        return JSONResponse(
            status_code=502,
            content={"detail": "تعذّر توليد المحتوى الآن، حاول مرة أخرى."},
        )

    if payload.tool == "quiz":
        return {"tool": "quiz", "questions": result}
    return {"tool": payload.tool, **result}


# ---------------------------------------------------------
# ENDPOINT: Generate Review Questions (A2)
# ---------------------------------------------------------
class GenerateQuestionsRequest(BaseModel):
    session_id: Optional[str] = None
    content: Optional[str] = None
    language: str = "ar"


@app.post("/api/generate_questions", tags=["AI: Review Questions"])
async def generate_questions_endpoint(payload: GenerateQuestionsRequest):
    """
    Generate 3–5 multiple-choice review questions from slide/document content.

    Provide either `content` (raw text) or a `session_id` (uses the session's
    slide text). Returns a fixed JSON shape consumed by the frontend Quiz
    component and the study agent (A1):
        {"questions": [{"q", "o": [4], "a": index, "e": explanation}, ...]}
    """
    content = (payload.content or "").strip()

    if not content and payload.session_id:
        session = get_session(payload.session_id)
        if not session:
            raise HTTPException(404, "Session not found or expired.")
        content = "\n\n".join(s["text"] for s in session.slides).strip()

    if not content:
        raise HTTPException(400, "Provide either 'content' or a valid 'session_id' with slide text.")

    loop = asyncio.get_event_loop()
    questions = await loop.run_in_executor(
        executor,
        generate_review_questions,
        content,
        call_groq,
        payload.language,
    )

    if questions is None:
        return JSONResponse(
            status_code=502,
            content={"detail": "تعذّر توليد الأسئلة الآن، حاول مرة أخرى."},
        )

    return {"questions": questions}


# ---------------------------------------------------------
# A1 · Study Agent — orchestration over an upload session
# ---------------------------------------------------------
def _first_pass_steps(run):
    return [s for s in run.steps if s.phase == "first_pass"]


def _prepare_step(session, step, language):
    """Blocking: generate the explanation + quiz for a step if not done yet."""
    if step.questions:
        return
    analysis = generate_topic_analysis(
        {"topic_id": step.topic_id, "label": step.label},
        session.chunks, session.summary, call_groq, language,
    )
    step.explanation = analysis.get("explanation", "")
    examples = analysis.get("examples") or []
    step.example = examples[0] if examples else ""

    content = f"{step.label}\n\n{step.explanation}\n\n{step.example}".strip()
    questions = generate_review_questions(content, call_groq, language) or []
    step.questions = questions
    step.status = "active"


def _present_step(run):
    step = run.current_step()
    return {
        "run_id": run.run_id,
        "status": run.status,
        "phase": run.phase,
        "step": {
            "index": run.cursor,
            "topic_id": step.topic_id,
            "label": step.label,
            "focus": step.focus,
            "phase": step.phase,
            "explanation": step.explanation,
            "example": step.example,
            # Answer key withheld until the student submits — the server grades.
            "questions": [{"q": q["q"], "o": q["o"]} for q in step.questions],
        },
        "progress": _progress(run),
    }


def _progress(run):
    seen = {}
    for s in run.steps:
        # keep the best status/ratio per topic for the overview
        prev = seen.get(s.topic_id)
        if prev is None or (s.best_ratio or 0) >= (prev.get("best_ratio") or 0):
            seen[s.topic_id] = {
                "topic_id": s.topic_id, "label": s.label,
                "status": s.status, "best_ratio": s.best_ratio,
            }
    return list(seen.values())


def _finalize(run):
    """Blocking: build the final strengths/weaknesses report."""
    best_by_topic = {}
    order = []
    for s in run.steps:
        if s.topic_id not in best_by_topic:
            order.append(s.topic_id)
            best_by_topic[s.topic_id] = {"label": s.label, "best_ratio": s.best_ratio}
        else:
            cur = best_by_topic[s.topic_id]["best_ratio"]
            if (s.best_ratio or 0) > (cur or 0):
                best_by_topic[s.topic_id]["best_ratio"] = s.best_ratio
    results = [best_by_topic[tid] for tid in order]
    run.report = build_report(run.goal, results, call_groq, run.language)
    run.phase = "complete"
    run.status = "complete"


def _advance(run, session):
    """
    Blocking: move to the next step, opening a remediation pass on weak topics
    after the first pass, then finalizing. Runs inside the executor.
    """
    run.cursor += 1
    if run.cursor < len(run.steps):
        _prepare_step(session, run.current_step(), run.language)
        run.status = "awaiting_answers"
        return _present_step(run)

    # End of the current queue.
    if run.phase == "first_pass" and not run.remediation_built:
        run.remediation_built = True
        weak = [s for s in _first_pass_steps(run) if not s.mastered]
        if weak:
            run.phase = "remediation"
            for w in weak:
                run.steps.append(agent_store.TopicProgress(
                    topic_id=w.topic_id, label=w.label, focus=w.focus, phase="remediation",
                ))
            # cursor already points at the first appended remediation step
            _prepare_step(session, run.current_step(), run.language)
            run.status = "awaiting_answers"
            return _present_step(run)

    _finalize(run)
    return {"run_id": run.run_id, "status": "complete", "report": run.report,
            "progress": _progress(run)}


class AgentStartRequest(BaseModel):
    session_id: str
    goal: str
    language: str = "ar"


class AgentAnswerRequest(BaseModel):
    answers: list = []


def _start_run_blocking(run, session):
    plan = plan_study(run.goal, session.topics, session.summary, call_groq, run.language)
    run.plan_intro = plan["intro"]
    for st in plan["steps"]:
        run.steps.append(agent_store.TopicProgress(
            topic_id=st["topic_id"], label=st["label"], focus=st["focus"], phase="first_pass",
        ))
    if not run.steps:
        run.status = "complete"
        run.report = {"readiness": "", "strengths": [], "weaknesses": [], "overall_ratio": 0.0, "topics": []}
        return
    _prepare_step(session, run.steps[0], run.language)
    run.status = "awaiting_answers"


@app.post("/api/agent/start", tags=["A1: Study Agent"])
async def agent_start(payload: AgentStartRequest):
    """
    Start a study-agent run over an uploaded session. The agent plans from the
    session's detected topics, then returns the first topic's explanation + quiz.
    """
    if not payload.goal.strip():
        raise HTTPException(400, "A study goal is required.")

    session = get_session(payload.session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired.")
    if not session.indexing_complete:
        return JSONResponse(status_code=202, content={"detail": "Indexing still in progress. Please wait."})
    if not session.topics:
        raise HTTPException(422, "No topics detected in this material yet.")

    run = agent_store.create_run(payload.session_id, payload.goal.strip(), payload.language)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(executor, _start_run_blocking, run, session)

    plan = {
        "intro": run.plan_intro,
        "steps": [{"topic_id": s.topic_id, "label": s.label, "focus": s.focus}
                  for s in _first_pass_steps(run)],
    }
    if run.status == "complete":
        return {"run_id": run.run_id, "status": "complete", "plan": plan, "report": run.report}

    body = _present_step(run)
    body["plan"] = plan
    return body


@app.post("/api/agent/{run_id}/answer", tags=["A1: Study Agent"])
async def agent_answer(run_id: str, payload: AgentAnswerRequest):
    """Grade the current topic's quiz and auto-advance the agent to what's next."""
    run = agent_store.get_run(run_id)
    if not run:
        raise HTTPException(404, "Agent run not found or expired.")
    if run.status == "complete":
        return {"run_id": run.run_id, "status": "complete", "report": run.report,
                "progress": _progress(run)}
    if run.status != "awaiting_answers":
        raise HTTPException(409, "Agent is not awaiting answers right now.")

    session = get_session(run.session_id)
    if not session:
        raise HTTPException(404, "Underlying session expired; please start a new run.")

    step = run.current_step()
    grade = grade_answers(step.questions, payload.answers)
    step.attempts.append({
        "ratio": grade["ratio"], "correct": grade["correct"],
        "total": grade["total"], "phase": step.phase,
    })
    if step.best_ratio is None or grade["ratio"] > step.best_ratio:
        step.best_ratio = grade["ratio"]
    step.status = "mastered" if step.mastered else "weak"

    # Per-question feedback (now safe to reveal the key + rationale).
    feedback = [{
        "chosen": (payload.answers[i] if i < len(payload.answers) else None),
        "correct_index": q["a"],
        "is_correct": (i < len(payload.answers) and payload.answers[i] == q["a"]),
        "explanation": q.get("e", ""),
    } for i, q in enumerate(step.questions)]

    loop = asyncio.get_event_loop()
    nxt = await loop.run_in_executor(executor, _advance, run, session)

    return {
        "graded": {
            "topic_id": step.topic_id, "label": step.label,
            "correct": grade["correct"], "total": grade["total"],
            "ratio": round(grade["ratio"], 2), "mastered": step.mastered,
            "feedback": feedback,
        },
        "next": nxt,
    }


@app.get("/api/agent/{run_id}", tags=["A1: Study Agent"])
async def agent_status(run_id: str):
    """Fetch the current plan, progress, and (when finished) the final report."""
    run = agent_store.get_run(run_id)
    if not run:
        raise HTTPException(404, "Agent run not found or expired.")

    plan = {
        "intro": run.plan_intro,
        "steps": [{"topic_id": s.topic_id, "label": s.label, "focus": s.focus}
                  for s in _first_pass_steps(run)],
    }
    body = {
        "run_id": run.run_id, "status": run.status, "phase": run.phase,
        "goal": run.goal, "plan": plan, "progress": _progress(run),
        "report": run.report,
    }
    if run.status == "awaiting_answers" and run.current_step():
        body["current"] = _present_step(run)["step"]
    return body


# ---------------------------------------------------------
# Health Check
# ---------------------------------------------------------
@app.get("/", tags=["General"])
def home():
    from Model import client as groq_client
    return {
        "message": "Eidaah Server is Running and Ready!",
        "version": "3.1.0",
        "ai_status": "ready" if groq_client else "not configured — missing GROQ_API_KEY",
        "active_sessions": active_session_count(),
    }
