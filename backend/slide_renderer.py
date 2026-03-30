# slide_renderer.py
# Converts PDF pages and PPTX slides to JPEG images for visual preview.
#
# PDF:  pdf2image (poppler-utils)
# PPTX: LibreOffice headless → PDF → pdf2image
#
# Both paths produce the same output: numbered JPEG files in a directory.

import os
import subprocess
import tempfile
from pathlib import Path

# Try importing pdf2image — graceful fallback if not installed
try:
    from pdf2image import convert_from_bytes, convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    print("⚠️  pdf2image not installed — slide preview disabled.")


# ---------------------
# Configuration
# ---------------------
RENDER_DPI = 150        # Balance between quality and file size
JPEG_QUALITY = 80       # JPEG compression quality (1-100)


def render_pdf_to_images(file_bytes: bytes, output_dir: str) -> list:
    """
    Render each PDF page as a JPEG image.
    Returns list of image filenames: ["1.jpg", "2.jpg", ...]
    """
    if not PDF2IMAGE_AVAILABLE:
        return []

    os.makedirs(output_dir, exist_ok=True)

    try:
        images = convert_from_bytes(
            file_bytes,
            dpi=RENDER_DPI,
            fmt="jpeg",
        )
    except Exception as e:
        print(f"❌ PDF rendering error: {e}")
        return []

    filenames = []
    for i, img in enumerate(images):
        filename = f"{i + 1}.jpg"
        filepath = os.path.join(output_dir, filename)
        img.save(filepath, "JPEG", quality=JPEG_QUALITY)
        filenames.append(filename)

    return filenames


def render_pptx_to_images(file_bytes: bytes, output_dir: str) -> list:
    """
    Render each PPTX slide as a JPEG image.
    Pipeline: PPTX → LibreOffice → PDF → pdf2image → JPEG
    Returns list of image filenames: ["1.jpg", "2.jpg", ...]
    """
    if not PDF2IMAGE_AVAILABLE:
        return []

    os.makedirs(output_dir, exist_ok=True)

    # Write PPTX to temp file
    tmp_pptx = tempfile.NamedTemporaryFile(suffix=".pptx", delete=False)
    try:
        tmp_pptx.write(file_bytes)
        tmp_pptx.close()

        tmp_dir = tempfile.mkdtemp()

        # Convert PPTX → PDF via LibreOffice headless
        try:
            subprocess.run(
                [
                    "libreoffice", "--headless", "--convert-to", "pdf",
                    "--outdir", tmp_dir, tmp_pptx.name
                ],
                timeout=120,
                check=True,
                capture_output=True,
            )
        except FileNotFoundError:
            print("⚠️  LibreOffice not found — PPTX slide preview disabled.")
            print("   Install with: sudo apt install libreoffice-core libreoffice-impress")
            return []
        except subprocess.TimeoutExpired:
            print("❌ LibreOffice conversion timed out.")
            return []
        except subprocess.CalledProcessError as e:
            print(f"❌ LibreOffice error: {e.stderr.decode()[:200]}")
            return []

        # Find the generated PDF
        base_name = Path(tmp_pptx.name).stem
        pdf_path = os.path.join(tmp_dir, f"{base_name}.pdf")

        if not os.path.exists(pdf_path):
            print(f"❌ PDF not generated at expected path: {pdf_path}")
            return []

        # Convert PDF → JPEG images
        with open(pdf_path, "rb") as f:
            return render_pdf_to_images(f.read(), output_dir)

    finally:
        # Cleanup temp files
        try:
            os.unlink(tmp_pptx.name)
        except OSError:
            pass


def render_slides(file_bytes: bytes, file_type: str, filename: str, output_dir: str) -> list:
    """
    Main entry point. Detects file type and renders accordingly.
    Returns list of image filenames.
    """
    is_pdf = file_type == "application/pdf"
    is_pptx = (
        "presentation" in (file_type or "")
        or file_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        or (filename and filename.lower().endswith(".pptx"))
    )

    if is_pdf:
        return render_pdf_to_images(file_bytes, output_dir)
    elif is_pptx:
        return render_pptx_to_images(file_bytes, output_dir)
    else:
        print(f"⚠️  Unknown file type for rendering: {file_type}")
        return []
