"""
Validator — Orchestrates the full multi-stage validation pipeline.

Pipeline Stages:
  1. UPLOAD      — Files are stored (handled by upload route)
  2. VALIDATING  — Gemini performs clause-level compliance analysis
  3. VERIFYING   — Gemini self-checks its output for consistency
  4. SCORING     — Accuracy & consistency scores are calculated
  5. COMPLETED   — Final corrected result is persisted
"""

import logging
import json
from core.gemini_client import GeminiClient
from core.accuracy_checker import AccuracyChecker
from core.consistency_checker import ConsistencyChecker

logger = logging.getLogger(__name__)


class ValidationPipeline:
    def __init__(self):
        self.gemini = GeminiClient()
        self.accuracy_checker = AccuracyChecker()
        self.consistency_checker = ConsistencyChecker()

    async def run(self, doc_path: str, guideline_path: str, status_callback=None) -> dict:
        """
        Runs the full validation pipeline and returns the final result package.
        
        Args:
            doc_path: Path to the clinical/safety document
            guideline_path: Path to the regulatory guideline document
            status_callback: async callable(status_str) to report progress
            
        Returns:
            dict with keys: result, accuracy, consistency_score, corrections, metadata
        """
        async def _update_status(status: str):
            if status_callback:
                await status_callback(status)
            logger.info(f"Pipeline status: {status}")

        # ── Stage 1: Primary Validation ──────────────────────────────────
        await _update_status("VALIDATING")
        try:
            raw_result = await self.gemini.validate_document(doc_path, guideline_path)
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            raise RuntimeError(f"Validation stage failed: {e}")

        logger.info(f"Stage 1 complete: {len(raw_result.get('findings', []))} findings, "
                    f"raw score: {raw_result.get('compliance_score')}")

        # ── Stage 2: Consistency Verification ────────────────────────────
        await _update_status("VERIFYING")
        try:
            consistency_result = await self.gemini.check_consistency(raw_result)
            logger.info(f"Stage 2 complete: consistent={consistency_result.get('is_consistent')}, "
                       f"quality={consistency_result.get('quality_score')}")
        except Exception as e:
            logger.warning(f"Consistency check failed (non-fatal): {e}")
            consistency_result = None

        # ── Stage 3: Apply Corrections & Score ───────────────────────────
        await _update_status("SCORING")

        # Apply corrections
        correction_result = self.consistency_checker.apply_corrections(raw_result, consistency_result)
        final_result = correction_result["validated_result"]
        corrections_applied = correction_result["corrections_applied"]

        # Calculate accuracy breakdown
        accuracy = self.accuracy_checker.calculate_score(final_result, consistency_result)

        # Calculate consistency score
        consistency_score = self.consistency_checker.calculate_consistency_score(
            raw_result, consistency_result
        )

        logger.info(f"Stage 3 complete: accuracy={accuracy['overall_accuracy']}, "
                    f"consistency={consistency_score}, corrections={len(corrections_applied)}")

        # ── Package Final Result ─────────────────────────────────────────
        return {
            "result": final_result,
            "accuracy": accuracy,
            "consistency_score": consistency_score,
            "corrections": corrections_applied,
            "metadata": {
                "model": self.gemini.model_name,
                "stages_completed": 3,
                "pipeline_version": "2.0",
            }
        }
