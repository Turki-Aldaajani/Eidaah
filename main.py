# main.py

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware  # Import CORS
from pydantic import BaseModel
import io
import ai_logic

# Initialize the app with metadata
app = FastAPI(
    title="SlideAi Backend",
    description="API to handle file parsing and AI analysis for slides.",
    version="1.0.0"
)

# ---------------------------------------------------------
# CORS Configuration (Security Permissions)
# This allows the Frontend to communicate with this Backend
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (Change this to specific frontend URL in production)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# ---------------------------------------------------------
# ENDPOINT 1: Upload File
# Screen: Upload Page
# Function: Receives file -> Splits it -> Returns list of slides & text
# ---------------------------------------------------------
@app.post("/api/upload_file", tags=["Step 1: Upload"])
async def upload_file(file: UploadFile = File(..., description="The file to be parsed (PDF or PPTX)")):
    """
    Receives a PDF or PPTX file, extracts text from each page/slide,
    and returns a JSON list ready for the frontend to display.
    """
    # 1. Read the file into memory
    file_contents = await file.read()
    file_stream = io.BytesIO(file_contents)
    
    # 2. Process the file using ai_logic to get pages
    pages = await ai_logic.process_file_to_pages(
        file=file_stream,
        file_type=file.content_type,
        filename=file.filename
    )
    
    # 3. Return the parsed slides structure
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
    # Pass the text directly to the AI logic
    result = await ai_logic.process_text_directly(payload.text)
    return result

# ---------------------------------------------------------
# Health Check Endpoint
# ---------------------------------------------------------
@app.get("/", tags=["General"])
def home():
    return {"message": "SlideAi Server is Running and Ready!"}