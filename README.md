# (Eidaah) إيضاح  - AI Presentation Explainer

An intelligent tool for analyzing presentations using AI, designed to simplify understanding.


<img width="939" height="921" alt="Screenshot 2026-01-22 001844" src="https://github.com/user-attachments/assets/b250704e-da85-4861-9149-9d1a20507e81" />


## Features

* **File Support**: Upload PDF and PPTX presentations
* **AI Analysis**: Get analytical explanations for each slide
* **Topic Detection**: Automatically detects 2–6 main topics from the presentation using LLM
* **Real Examples**: Receive practical, real-world examples per slide or topic
* **Presentation Summary**: Global AI-generated summary of the full presentation
* **Bilingual**: Full Arabic and English support
* **Fast Processing**: Powered by Llama 3.3 70B via Groq API

## Project Structure

```
eidaah/
├── backend/
│   ├── main.py             # API endpoints & background pipeline
│   ├── ai_logic.py         # File validation & text extraction (PDF/PPTX)
│   ├── Model.py            # Groq API client (call_groq)
│   ├── session_store.py    # In-memory session management
│   ├── chunker.py          # Slide text chunking
│   ├── topic_detector.py   # LLM-based topic detection
│   ├── rag_generator.py    # Topic & summary generation
│   ├── slide_renderer.py   # Slide-to-image rendering (PDF/PPTX)
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
└── frontend/
    ├── src/
    │   ├── pages/          # Upload & Results pages
    │   ├── App.js
    │   ├── Footer.js
    │   ├── About.js
    │   └── FAQ.js
    └── package.json
```

## Local Setup

### Prerequisites

* Python 3.9+
* Node.js 16+
* npm
* A free Groq API key ([get one here](https://console.groq.com/keys))

### Step 1: Clone the Repository

```bash
git clone https://github.com/Rayan-Al-Harbi/Eidaah.git
cd Eidaah
```

### Step 2: Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Windows:
copy .env.example .env
# Mac/Linux:
cp .env.example .env
# Then open .env and set: GROQ_API_KEY=your_api_key_here

# Run server
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

Expected output:
```
✅ Groq AI model configured successfully! (using llama-3.3-70b-versatile)
✅ Model.py imported successfully!
🚀 Eidaah server starting...
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 3: Frontend Setup

Open another terminal (keep backend running):

```bash
cd frontend

# Create environment file
echo REACT_APP_API_URL=http://localhost:8000 > .env.local

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will be available at `http://localhost:3000`

## Tech Stack

### Backend

* FastAPI — web framework
* Llama 3.3 70B — AI language model (via Groq API)
* pdfplumber — PDF text extraction
* python-pptx — PowerPoint text extraction
* pdf2image + poppler — slide image rendering (optional)
* LibreOffice headless — PPTX-to-image conversion (optional)

### Frontend

* React — UI framework
* React Router — navigation
* Cairo Font — Arabic typography

## 👥 Team

*Enjaz Club - AI Team — Imam Muhammad ibn Saud Islamic University*

* **Club Leader**: Layan Al-Mutaiwie
* **Team Lead & AI/NLP**: Rayan Al-Harbi
* **Project Manager & Product Idea**: Turki Al-Dajani
* **UI/UX Design**: Nahed Al-Mutairi, Layan Al-Qabbani
* **Frontend**: Abdulaziz Al-Dhaif, Raseel Al-Samaani
* **Backend**: Abdulaziz Al-Qahtani, Sultan Al-Rajeh
* **AI/NLP Engineers**: Ziyad Al-Moneef, Yasser Al-Shareef
* **QA**: Faisal Al-Tuwaijri

---

*Made by ambitious students leveraging AI to serve knowledge*
