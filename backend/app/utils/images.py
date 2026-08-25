import io
import magic
from PIL import Image
from fastapi import UploadFile, HTTPException

ALLOWED_MIME = {'image/jpeg', 'image/png', 'image/webp'}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB before processing

def validate_and_process(
    file: UploadFile,
    max_dim: int = 1200,
    max_bytes: int = 200_000,
    quality: int = 80
) -> bytes:
    # Read file bytes
    raw = file.file.read()
    if len(raw) > MAX_UPLOAD_SIZE:
        raise HTTPException(400, "File too large (max 5 MB)")

    # Check magic bytes
    mime = magic.from_buffer(raw[:2048], mime=True)
    if mime not in ALLOWED_MIME:
        raise HTTPException(422, f"Invalid image type: {mime}")

    # Open with Pillow
    img = Image.open(io.BytesIO(raw))
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    # Resize if needed
    w, h = img.size
    if max(w, h) > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)

    # Compress to WebP
    out = io.BytesIO()
    img.save(out, format='WEBP', quality=quality)
    out.seek(0)

    # If still too large, reduce quality
    current_quality = quality
    while out.getbuffer().nbytes > max_bytes and current_quality > 30:
        current_quality -= 10
        out = io.BytesIO()
        img.save(out, format='WEBP', quality=current_quality)
        out.seek(0)

    if out.getbuffer().nbytes > max_bytes:
        raise HTTPException(400, f"Image too large after compression ({out.getbuffer().nbytes} bytes)")

    return out.getvalue()
