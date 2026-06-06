FROM python:3.11-slim

WORKDIR /app

# System deps for chromadb native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (cached layer — only rebuilds when requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-bake embedding + re-ranker models so first-request latency is low
RUN python3 -c "from sentence_transformers import SentenceTransformer, CrossEncoder; SentenceTransformer('all-MiniLM-L6-v2'); CrossEncoder('cross-encoder/ms-marco-MiniLM-L6-v2')"

# Copy application code
COPY app/ ./app/

# ChromaDB data directory — mount a Railway volume here for persistence
ENV CHROMA_PERSIST_DIR=/data/chroma_db

EXPOSE ${PORT:-8000}

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
