# slide_renderer.py
# PDF  → PyMuPDF (fitz) → JPEG images — no system dependencies needed.
# PPTX → returns [] — frontend shows SlideCard text fallback instead.

import os

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("⚠️  PyMuPDF not installed — PDF slide preview disabled.")


# 2x zoom ≈ 150 DPI, good balance of quality vs file size
_ZOOM = fitz.Matrix(2, 2) if PYMUPDF_AVAILABLE else None


def render_pdf_to_images(file_bytes: bytes, output_dir: str) -> list:
    """
    Render each PDF page as a JPEG image using PyMuPDF.
    Returns list of filenames: ["1.jpg", "2.jpg", ...]
    """
    if not PYMUPDF_AVAILABLE:
        return []

    os.makedirs(output_dir, exist_ok=True)

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        print(f"❌ PyMuPDF: could not open PDF — {e}")
        return []

    filenames = []
    try:
        for i in range(len(doc)):
            page = doc[i]
            pix = page.get_pixmap(matrix=_ZOOM)
            filename = f"{i + 1}.jpg"
            filepath = os.path.join(output_dir, filename)
            pix.save(filepath)
            filenames.append(filename)
    except Exception as e:
        print(f"❌ PyMuPDF: page render error — {e}")
    finally:
        doc.close()

    return filenames


def render_slides(file_bytes: bytes, file_type: str, filename: str, output_dir: str) -> list:
    """
    Main entry point.
    - PDF  → real images via PyMuPDF
    - PPTX → [] (frontend shows SlideCard fallback)
    """
    is_pdf = (
        file_type == "application/pdf"
        or (filename and filename.lower().endswith(".pdf"))
    )

    if is_pdf:
        return render_pdf_to_images(file_bytes, output_dir)

    # PPTX: no reliable pure-Python renderer — frontend handles it
    return []
