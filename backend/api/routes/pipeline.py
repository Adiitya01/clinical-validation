"""
Pipeline Route — Manages background validation jobs and status tracking.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from core.validator import ValidationPipeline
import os
import json
import logging
import aiosqlite

logger = logging.getLogger(__name__)

router = APIRouter()
pipeline = ValidationPipeline()

DB_PATH = "reg_validator.db"
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".dcx"}

def _get_file_path(session_path: str, prefix: str) -> str:
    """Helper to find a file starting with prefix in session_path."""
    if not os.path.exists(session_path):
        return None
    for f in os.listdir(session_path):
        if f.startswith(prefix):
            ext = os.path.splitext(f)[1].lower()
            if ext in ALLOWED_EXTENSIONS:
                return os.path.join(session_path, f)
    return None


async def _update_session_status(session_id: str, status: str):
    """Helper to update session status in DB."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO sessions (id, status) VALUES (?, ?)",
            (session_id, status)
        )
        await db.commit()


async def process_validation(session_id: str):
    """Background task: runs the full validation pipeline."""
    session_path = os.path.join("storage/sessions", session_id)
    doc_path = _get_file_path(session_path, "document")
    gui_path = _get_file_path(session_path, "guideline")

    if not doc_path or not gui_path:
        logger.error(f"Files not found for session {session_id}")
        await _update_session_status(session_id, "FAILED: Files missing")
        return

    # Read original filenames from metadata if available
    meta_path = os.path.join(session_path, "metadata.json")
    doc_name = "document.pdf"
    gui_name = "guideline.pdf"
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            meta = json.load(f)
            doc_name = meta.get("document_name", doc_name)
            gui_name = meta.get("guideline_name", gui_name)

    try:
        # Status callback to update DB in real-time
        async def status_callback(status: str):
            await _update_session_status(session_id, status)

        # Run the full pipeline
        result_package = await pipeline.run(
            doc_path=doc_path,
            guideline_path=gui_path,
            status_callback=status_callback
        )

        # Persist results
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                INSERT INTO validation_results 
                (session_id, document_name, guideline_name, result_json, accuracy_score, consistency_score)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                session_id,
                doc_name,
                gui_name,
                json.dumps(result_package["result"]),
                result_package["accuracy"]["overall_accuracy"],
                result_package["consistency_score"]
            ))
            await db.execute(
                "UPDATE sessions SET status = ? WHERE id = ?",
                ("COMPLETED", session_id)
            )
            await db.commit()

        # Save full pipeline output to disk for audit trail
        output_path = os.path.join(session_path, "pipeline_output.json")
        with open(output_path, "w") as f:
            json.dump(result_package, f, indent=2)

        logger.info(f"Session {session_id} completed successfully.")

    except Exception as e:
        logger.error(f"Session {session_id} failed: {e}", exc_info=True)
        error_msg = str(e)[:200]  # Truncate very long errors
        await _update_session_status(session_id, f"FAILED: {error_msg}")


@router.post("/{session_id}/start")
async def start_pipeline(session_id: str, background_tasks: BackgroundTasks):
    """Start the validation pipeline as a background task."""
    # Verify session files exist
    session_path = os.path.join("storage/sessions", session_id)
    doc_path = _get_file_path(session_path, "document")
    gui_path = _get_file_path(session_path, "guideline")

    if not doc_path:
        raise HTTPException(status_code=404, detail="Document file not found for this session")
    if not gui_path:
        raise HTTPException(status_code=404, detail="Guideline file not found for this session")

    background_tasks.add_task(process_validation, session_id)
    return {"message": "Pipeline started", "session_id": session_id}


@router.get("/{session_id}/status")
async def get_status(session_id: str):
    """Get current pipeline status."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT status FROM sessions WHERE id = ?", (session_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Session not found")
            return {"session_id": session_id, "status": row["status"]}


@router.get("/{session_id}/results")
async def get_results(session_id: str):
    """Get validation results with accuracy and consistency scores."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM validation_results WHERE session_id = ?", (session_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Results not found")

            result_data = json.loads(row["result_json"])

            # Also load the full pipeline output if available
            pipeline_output_path = os.path.join("storage/sessions", session_id, "pipeline_output.json")
            pipeline_meta = {}
            if os.path.exists(pipeline_output_path):
                with open(pipeline_output_path, "r") as f:
                    full_output = json.load(f)
                    pipeline_meta = {
                        "accuracy_breakdown": full_output.get("accuracy", {}),
                        "corrections": full_output.get("corrections", []),
                        "metadata": full_output.get("metadata", {}),
                    }

            return {
                "session_id": row["session_id"],
                "document_name": row["document_name"],
                "guideline_name": row["guideline_name"],
                "results": result_data,
                "accuracy_score": row["accuracy_score"],
                "consistency_score": row["consistency_score"],
                "pipeline": pipeline_meta,
            }
