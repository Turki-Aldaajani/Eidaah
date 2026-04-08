# slide_renderer.py
# Slide rendering is handled via styled text cards on the frontend.
# Image rendering (pdf2image / LibreOffice) is disabled — not reliable on Render.
# This module is kept for compatibility; render_slides always returns [].


def render_slides(file_bytes: bytes, file_type: str, filename: str, output_dir: str) -> list:
    """
    Rendering is disabled. The frontend displays slide text as styled cards.
    Returns an empty list so no image_url is set in session status.
    """
    return []
