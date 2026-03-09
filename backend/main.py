# main.py

from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
import io
import os
from dotenv import load_dotenv

load_dotenv()

import ai_logic


# ---------------------------------------------------------
# App Lifespan (startup/shutdown events)
# ---------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Eidaah server starting...")
    yield
    # Shutdown
    print("👋 Eidaah server shutting down.")


# Initialize the app with metadata
app = FastAPI(
    title="Eidaah - AI Presentation Explainer",
    description="API to handle file parsing and AI analysis for slides.",
    version="2.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------
# CORS Configuration
# In production, set FRONTEND_URL in .env to your actual frontend domain.
# Example: FRONTEND_URL=https://eidaah.vercel.app
# ---------------------------------------------------------
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")

# Build origins list
if FRONTEND_URL == "*":
    origins = ["*"]
else:
    # Allow the configured frontend + common local dev URLs
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
# Screen: Upload Page
# Function: Receives file -> Splits it -> Returns list of slides & text
# ---------------------------------------------------------
MAX_UPLOAD_SIZE = 20 * 1024 * 1024  # 20MB

@app.post("/api/upload_file", tags=["Step 1: Upload"])
async def upload_file(file: UploadFile = File(..., description="The file to be parsed (PDF or PPTX)")):
    """
    Receives a PDF or PPTX file, extracts text from each page/slide,
    and returns a JSON list ready for the frontend to display.
    """
    # 1. Read the file into memory
    file_contents = await file.read()

    # 2. Check size after reading
    if len(file_contents) > MAX_UPLOAD_SIZE:
        return JSONResponse(
            status_code=413,
            content={"detail": "File too large. Maximum size is 20MB."}
        )

    file_stream = io.BytesIO(file_contents)

    # 3. Process the file using ai_logic to get pages
    pages = await ai_logic.process_file_to_pages(
        file=file_stream,
        file_type=file.content_type,
        filename=file.filename
    )

    # 4. Return the parsed slides structure (same shape as before)
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
# Screen: Enhance/Clarify Page
# Function: Receives text of ONE slide -> Returns Analysis & Example
# ---------------------------------------------------------
@app.post("/api/analyze_slide", tags=["Step 2: Analyze"])
async def analyze_slide(payload: AnalyzeRequest):
    """
    Receives raw text (from a selected slide) and returns the
    AI-generated explanation and real-world example.
    """
    result = await ai_logic.process_text_directly(payload.text)
    return result


# ---------------------------------------------------------
# Health Check Endpoint
# ---------------------------------------------------------
@app.get("/", tags=["General"])
def home():
    """Health check — also reports whether AI model is ready."""
    from Model import model as ai_model
    return {
        "message": "Eidaah Server is Running and Ready!",
        "ai_status": "ready" if ai_model else "not configured — missing GEMINI_API_KEY",
        "version": "2.0.0"
    }
