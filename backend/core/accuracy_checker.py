"""
Accuracy Checker — Post-validation accuracy scoring.
Evaluates the quality of the Gemini validation output against structural and logical rules.
"""

import logging

logger = logging.getLogger(__name__)


class AccuracyChecker:
    """
    Calculates a multi-dimensional accuracy score for the validation result.
    This is NOT comparing against ground truth (which we don't have).
    Instead, it checks the structural integrity and logical coherence of the AI output.
    """

    @staticmethod
    def calculate_score(result: dict, consistency_result: dict = None) -> dict:
        """
        Returns a detailed accuracy breakdown.
        
        Factors:
        1. Structural completeness (are all required fields present?)
        2. Score-to-findings alignment (does the % match the actual ratio?)
        3. Severity distribution sanity (are severities assigned logically?)
        4. Recommendation coverage (do all gaps have recommendations?)
        5. Consistency check result (if available from Stage 2)
        """
        findings = result.get("findings", [])
        scores = {}
        applicable = []

        # ── 1. Structural Completeness (25%) ─────────────────────────────
        # If the AI accurately identified the document as "Out of Scope", 
        # we shouldn't penalize missing findings.
        executive_summary = result.get("executive_summary", "").lower()
        is_out_of_scope = "unrelated" in executive_summary or "not applicable" in executive_summary or "resume" in executive_summary
        
        required_top = {"compliance_score", "findings", "executive_summary"}
        required_finding = {"clause", "status", "description", "recommendation"}
        
        top_present = sum(1 for k in required_top if k in result)
        top_score = (top_present / len(required_top)) * 100

        if is_out_of_scope:
            # If out of scope, findings should be empty. Completion is 100% if summary exists.
            avg_finding_score = 100.0 if top_present >= 2 else 0
        elif findings:
            finding_scores = []
            for f in findings:
                present = sum(1 for k in required_finding if k in f and f[k])
                finding_scores.append((present / len(required_finding)) * 100)
            avg_finding_score = sum(finding_scores) / len(finding_scores)
        else:
            avg_finding_score = 0

        scores["structural_completeness"] = round((top_score * 0.4 + avg_finding_score * 0.6), 1)

        # ── 2. Score-to-Findings Alignment (25%) ─────────────────────────
        if is_out_of_scope:
            # A 0% score for out-of-scope docs is 100% aligned
            scores["score_alignment"] = 100.0 if result.get("compliance_score") == 0 else 0
        else:
            applicable = [f for f in findings if f.get("status") != "Not Applicable"]
            if applicable:
                compliant_count = sum(1 for f in applicable if f.get("status") == "Compliant")
                expected_score = round((compliant_count / len(applicable)) * 100, 1)
                reported_score = result.get("compliance_score", 0)
                deviation = abs(expected_score - reported_score)
                
                if deviation <= 10: scores["score_alignment"] = 100.0
                elif deviation <= 25: scores["score_alignment"] = 70.0
                else: scores["score_alignment"] = max(0, 100 - deviation * 2)
            else:
                scores["score_alignment"] = 50.0

        # ... (rest of the logic remains)

        # ── 3. Severity Distribution Sanity (20%) ────────────────────────
        non_compliant = [f for f in findings if f.get("status") in ("Non-Compliant", "Partial")]
        if non_compliant:
            has_severity = sum(1 for f in non_compliant if f.get("severity") in ("Critical", "Major", "Minor"))
            scores["severity_quality"] = round((has_severity / len(non_compliant)) * 100, 1)
        else:
            scores["severity_quality"] = 100.0  # No issues to classify

        # ── 4. Recommendation Coverage (15%) ─────────────────────────────
        needs_recommendation = [f for f in findings if f.get("status") in ("Non-Compliant", "Partial")]
        if needs_recommendation:
            has_recommendation = sum(
                1 for f in needs_recommendation 
                if f.get("recommendation") and len(str(f["recommendation"])) > 10
            )
            scores["recommendation_coverage"] = round((has_recommendation / len(needs_recommendation)) * 100, 1)
        else:
            scores["recommendation_coverage"] = 100.0

        # ── 5. Consistency Check Score (15%) ─────────────────────────────
        if consistency_result and consistency_result.get("quality_score") is not None:
            scores["consistency_quality"] = consistency_result["quality_score"]
        else:
            scores["consistency_quality"] = 75.0  # Default neutral

        # ── Weighted Final Score ─────────────────────────────────────────
        weights = {
            "structural_completeness": 0.25,
            "score_alignment": 0.25,
            "severity_quality": 0.20,
            "recommendation_coverage": 0.15,
            "consistency_quality": 0.15,
        }

        final_score = sum(scores[k] * weights[k] for k in weights)

        return {
            "overall_accuracy": round(final_score, 1),
            "breakdown": scores,
            "total_findings": len(findings),
            "applicable_findings": len(applicable) if applicable else 0,
            "compliant_findings": sum(1 for f in findings if f.get("status") == "Compliant"),
            "non_compliant_findings": sum(1 for f in findings if f.get("status") == "Non-Compliant"),
            "partial_findings": sum(1 for f in findings if f.get("status") == "Partial"),
            "observation_findings": sum(1 for f in findings if f.get("status") == "Observation"),
        }
