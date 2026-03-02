"""
Upload Route — Handles PDF file upload and session creation.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import shutil
import uuid
import json

router = APIRouter()

STORAGE_DIR = "storage/sessions"


@router.post("/")
async def upload_files(
    document: UploadFile = File(...),
    guideline: UploadFile = File(...)
):
    """Upload a clinical document and regulatory guideline PDF pair."""
    
    # Validate file types
    allowed_extensions = {".pdf", ".docx", ".doc", ".dcx"}
    for f, label in [(document, "Document"), (guideline, "Guideline")]:
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"{label} must be a PDF or Word file. Got: {f.filename}"
            )

    session_id = str(uuid.uuid4())
    session_path = os.path.join(STORAGE_DIR, session_id)
    os.makedirs(session_path, exist_ok=True)

    doc_ext = os.path.splitext(document.filename)[1].lower()
    gui_ext = os.path.splitext(guideline.filename)[1].lower()
    
    doc_path = os.path.join(session_path, f"document{doc_ext}")
    gui_path = os.path.join(session_path, f"guideline{gui_ext}")

    # Save files
    with open(doc_path, "wb") as buffer:
        shutil.copyfileobj(document.file, buffer)
    
    with open(gui_path, "wb") as buffer:
        shutil.copyfileobj(guideline.file, buffer)

    # Validate files were saved correctly
    for path, label in [(doc_path, "Document"), (gui_path, "Guideline")]:
        if not os.path.exists(path) or os.path.getsize(path) == 0:
            raise HTTPException(status_code=500, detail=f"{label} file failed to save correctly")

    # Save metadata (original filenames)
    meta = {
        "document_name": document.filename,
        "guideline_name": guideline.filename,
        "document_size": os.path.getsize(doc_path),
        "guideline_size": os.path.getsize(gui_path),
    }
    with open(os.path.join(session_path, "metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)

    return {
        "session_id": session_id,
        "document": document.filename,
        "guideline": guideline.filename,
        "document_size_kb": round(meta["document_size"] / 1024, 1),
        "guideline_size_kb": round(meta["guideline_size"] / 1024, 1),
    }
