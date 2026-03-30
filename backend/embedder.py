# embedder.py
# Generates embeddings with sentence-transformers and builds FAISS index.
# Provides retrieval function for RAG.

import numpy as np

# ---------------------
# Lazy loading to avoid slow startup if not needed
# ---------------------
_embed_model = None
_faiss = None


def _load_model():
    """Load the sentence-transformer model (once, lazily)."""
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer
        print("📦 Loading embedding model (all-MiniLM-L6-v2)...")
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
        print("✅ Embedding model loaded!")
    return _embed_model


def _load_faiss():
    """Load FAISS (once, lazily)."""
    global _faiss
    if _faiss is None:
        import faiss as faiss_lib
        _faiss = faiss_lib
    return _faiss


def embed_texts(texts: list) -> np.ndarray:
    """Encode a list of strings into normalized embeddings."""
    model = _load_model()
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return np.array(embeddings, dtype="float32")


def build_index(chunks: list) -> tuple:
    """
    Build a FAISS index from chunks.

    Returns: (faiss_index, embeddings_array)
    """
    faiss = _load_faiss()

    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)

    # Flat inner product index (cosine similarity on normalized vectors)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    return index, embeddings


def retrieve(query: str, index, chunks: list, top_k: int = 5) -> list:
    """
    Retrieve top-k most relevant chunks for a query string.

    Returns list of chunks with added 'score' field, sorted by relevance.
    """
    query_vec = embed_texts([query])
    scores, indices = index.search(query_vec, min(top_k, len(chunks)))

    results = []
    for i, idx in enumerate(indices[0]):
        if 0 <= idx < len(chunks):
            result = {**chunks[idx], "score": float(scores[0][i])}
            results.append(result)

    return results
