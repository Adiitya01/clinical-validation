"""
ComplianceLens Backend — Main entry point.
"""

from fastapi import FastAPI
import os
import logging
from fastapi.middleware.cors import CORSMiddleware
from api.routes import upload, pipeline, report
from db.database import init_db
import uvicorn

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-25s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ComplianceLens")

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ComplianceLens API",
    description="AI-powered regulatory compliance validation engine",
    version="2.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["Pipeline"])
app.include_router(report.router, prefix="/api/report", tags=["Report"])


@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database...")
    await init_db()
    os.makedirs("storage/sessions", exist_ok=True)
    logger.info("ComplianceLens API v2.0 ready on port 8001")


@app.get("/")
async def root():
    return {
        "service": "ComplianceLens API",
        "version": "2.0.0",
        "status": "operational",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
