FROM python:3.11-slim

# System dependencies for slide rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libreoffice-core \
    libreoffice-impress \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create temp directory for sessions
RUN mkdir -p /tmp/eidaah_sessions

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
