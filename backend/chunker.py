# chunker.py
# Splits extracted slide text into semantic chunks suitable for embedding.
# Each chunk tracks which slide(s) it came from.

import re


# ---------------------
# Configuration
# ---------------------
MIN_CHUNK_CHARS = 100       # Don't create chunks smaller than this
MAX_CHUNK_CHARS = 2000      # Split chunks larger than this
OVERLAP_SENTENCES = 1       # Overlap between split chunks


def _split_sentences(text: str) -> list:
    """Split text into sentences (handles both Arabic and English)."""
    # Split on period, question mark, exclamation, or Arabic full stop
    parts = re.split(r'(?<=[.!?،؟])\s+', text)
    return [p.strip() for p in parts if p.strip()]


def chunk_slides(slides: list, min_chars: int = MIN_CHUNK_CHARS,
                 max_chars: int = MAX_CHUNK_CHARS) -> list:
    """
    Chunks slide text while preserving slide provenance.
    Short slides get merged with neighbors. Long slides get split.

    Input:  [{"slide_number": 1, "text": "..."}, ...]
    Output: [{"chunk_id": "c_0", "text": "...", "slides": [1, 2]}, ...]
    """
    if not slides:
        return []

    chunks = []
    buffer_text = ""
    buffer_slides = []

    for slide in slides:
        text = slide["text"].strip()
        if not text:
            continue

        slide_num = slide["slide_number"]

        # Case 1: Long slide — flush buffer, then split this slide
        if len(text) > max_chars:
            # Flush any accumulated buffer first
            if buffer_text:
                chunks.append({
                    "text": buffer_text.strip(),
                    "slides": buffer_slides[:],
                })
                buffer_text = ""
                buffer_slides = []

            # Split long slide into sub-chunks by sentences
            sentences = _split_sentences(text)
            sub_chunk = ""
            for j, sent in enumerate(sentences):
                candidate = sub_chunk + (" " if sub_chunk else "") + sent
                if len(candidate) > max_chars and sub_chunk:
                    chunks.append({
                        "text": sub_chunk.strip(),
                        "slides": [slide_num],
                    })
                    # Overlap: keep last sentence
                    sub_chunk = sent
                else:
                    sub_chunk = candidate

            if sub_chunk.strip():
                chunks.append({
                    "text": sub_chunk.strip(),
                    "slides": [slide_num],
                })

        # Case 2: Short slide — try to merge with buffer
        else:
            combined = buffer_text + ("\n\n" if buffer_text else "") + text
            if len(combined) > max_chars and buffer_text:
                # Buffer is full — flush it
                chunks.append({
                    "text": buffer_text.strip(),
                    "slides": buffer_slides[:],
                })
                buffer_text = text
                buffer_slides = [slide_num]
            else:
                buffer_text = combined
                buffer_slides.append(slide_num)

    # Flush remaining buffer
    if buffer_text.strip():
        chunks.append({
            "text": buffer_text.strip(),
            "slides": buffer_slides,
        })

    # Filter out tiny chunks by merging with previous
    final_chunks = []
    for chunk in chunks:
        if final_chunks and len(chunk["text"]) < min_chars:
            # Merge with previous chunk
            final_chunks[-1]["text"] += "\n\n" + chunk["text"]
            final_chunks[-1]["slides"] = sorted(
                set(final_chunks[-1]["slides"] + chunk["slides"])
            )
        else:
            final_chunks.append(chunk)

    # Assign chunk IDs
    for i, chunk in enumerate(final_chunks):
        chunk["chunk_id"] = f"c_{i}"

    return final_chunks
