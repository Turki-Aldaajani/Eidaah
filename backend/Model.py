# main.py

from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import io
import os
from dotenv import load_dotenv

load_dotenv()

import ai_logic

# ---------------------------------------------------------
# Rate Limiter Setup
# ---------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------
# App Lifespan (startup/shutdown events)
# ---------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Eidaah server starting...")
    yield
    print("👋 Eidaah server shutting down.")


# Initialize the app with metadata
app = FastAPI(
    title="Eidaah - AI Presentation Explainer",
    description="API to handle file parsing and AI analysis for slides.",
    version="2.0.0",
    lifespan=lifespan,
)

# Attach rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")

if FRONTEND_URL == "*":
    origins = ["*"]
else:
    origins = [
        FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Global Exception Handler
# ---------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"❌ Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."}
    )

# ---------------------------------------------------------
# ENDPOINT 1: Upload File
# Rate limit: 10 uploads per minute per IP
# ---------------------------------------------------------
MAX_UPLOAD_SIZE = 20 * 1024 * 1024  # 20MB

@app.post("/api/upload_file", tags=["Step 1: Upload"])
@limiter.limit("5/minute")
async def upload_file(request: Request, file: UploadFile = File(..., description="The file to be parsed (PDF or PPTX)")):
    file_contents = await file.read()

    if len(file_contents) > MAX_UPLOAD_SIZE:
        return JSONResponse(
            status_code=413,
            content={"detail": "File too large. Maximum size is 20MB."}
        )

    file_stream = io.BytesIO(file_contents)

    pages = await ai_logic.process_file_to_pages(
        file=file_stream,
        file_type=file.content_type,
        filename=file.filename
    )

    return {
        "filename": file.filename,
        "slides": pages
    }

# ---------------------------------------------------------
# Data Model for Analysis Request
# ---------------------------------------------------------
class AnalyzeRequest(BaseModel):
    text: str

# ---------------------------------------------------------
# ENDPOINT 2: Analyze Specific Slide
# Rate limit: 20 requests per minute per IP
# ---------------------------------------------------------
@app.post("/api/analyze_slide", tags=["Step 2: Analyze"])
@limiter.limit("10/minute")
async def analyze_slide(request: Request, payload: AnalyzeRequest):
    result = await ai_logic.process_text_directly(payload.text)
    return result

# ---------------------------------------------------------
# Health Check Endpoint
# ---------------------------------------------------------
@app.get("/", tags=["General"])
def home():
    from Model import model as ai_model
    return {
        "message": "Eidaah Server is Running and Ready!",
        "ai_status": "ready" if ai_model else "not configured — missing GROQ_API_KEY",
        "version": "2.0.0"
    }
