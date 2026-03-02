"""
Consistency Checker — Cross-validates and repairs the validation output.
Applies corrections from the Gemini consistency check and performs rule-based fixes.
"""

import logging

logger = logging.getLogger(__name__)


class ConsistencyChecker:
    """
    Takes the raw validation result + the optional Gemini consistency check output,
    and produces a cleaned, verified final result.
    """

    @staticmethod
    def apply_corrections(validation_result: dict, consistency_result: dict = None) -> dict:
        """
        Applies all corrections and returns the finalized result.
        
        Corrections applied:
        1. Recalculate compliance_score from actual findings
        2. Rebuild risk_summary from actual severities
        3. Apply any Gemini-suggested corrections
        4. Ensure all required fields exist with defaults
        5. Normalize statuses to allowed values
        """
        result = dict(validation_result)  # Work on a copy
        findings = result.get("findings", [])
        corrections_applied = []

        # ── 1. Normalize statuses ────────────────────────────────────────
        valid_statuses = {"Compliant", "Non-Compliant", "Partial", "Observation", "Not Applicable"}
        valid_severities = {"Critical", "Major", "Minor", "N/A"}
        
        for f in findings:
            if f.get("status") not in valid_statuses:
                old = f.get("status")
                f["status"] = "Observation"  # Default to observation if unknown
                corrections_applied.append(f"Normalized unknown status '{old}' to 'Observation'")
            
            # Ensure severity exists for non-compliant items
            if f.get("status") in ("Non-Compliant", "Partial"):
                if f.get("severity") not in valid_severities or f.get("severity") == "N/A":
                    f["severity"] = "Major"  # Default gap severity
                    corrections_applied.append(f"Added default severity 'Major' to clause {f.get('clause', '?')}")
            else:
                f["severity"] = "N/A"

            # Ensure required fields have defaults
            f.setdefault("clause", "Unspecified")
            f.setdefault("requirement", "")
            f.setdefault("evidence", "")
            f.setdefault("description", "No description provided.")
            f.setdefault("recommendation", "")

            # Ensure recommendations exist for gaps
            if f["status"] in ("Non-Compliant", "Partial") and not f["recommendation"].strip():
                f["recommendation"] = "Review and address this gap before submission."
                corrections_applied.append(f"Added default recommendation for clause {f.get('clause', '?')}")

        # ── 2. Recalculate compliance score ──────────────────────────────
        applicable = [f for f in findings if f.get("status") != "Not Applicable"]
        if applicable:
            compliant_count = sum(1 for f in applicable if f.get("status") == "Compliant")
            recalculated = round((compliant_count / len(applicable)) * 100, 1)
            
            reported = result.get("compliance_score", 0)
            if abs(reported - recalculated) > 5:
                corrections_applied.append(
                    f"Corrected compliance_score from {reported} to {recalculated} "
                    f"(based on {compliant_count}/{len(applicable)} compliant findings)"
                )
                result["compliance_score"] = recalculated
        else:
            result["compliance_score"] = 0

        # ── 3. Rebuild risk_summary ──────────────────────────────────────
        risk_summary = {
            "critical": sum(1 for f in findings if f.get("severity") == "Critical"),
            "major": sum(1 for f in findings if f.get("severity") == "Major"),
            "minor": sum(1 for f in findings if f.get("severity") == "Minor"),
            "observations": sum(1 for f in findings if f.get("status") == "Observation"),
        }
        
        old_risk = result.get("risk_summary", {})
        if old_risk != risk_summary:
            corrections_applied.append(f"Recalculated risk_summary: {risk_summary}")
        result["risk_summary"] = risk_summary

        # ── 4. Apply Gemini consistency corrections ──────────────────────
        if consistency_result:
            corrected_score = consistency_result.get("corrected_compliance_score")
            if corrected_score is not None and isinstance(corrected_score, (int, float)):
                # Only trust the Gemini correction if it's closer to our recalculated value
                if applicable:
                    our_score = result["compliance_score"]
                    if abs(corrected_score - recalculated) < abs(our_score - recalculated):
                        result["compliance_score"] = corrected_score
                        corrections_applied.append(f"Applied Gemini-suggested score correction: {corrected_score}")

            gemini_issues = consistency_result.get("issues_found", [])
            for issue in gemini_issues:
                corrections_applied.append(f"Gemini flagged: {issue.get('description', 'unknown issue')}")

        # ── 5. Set metadata ──────────────────────────────────────────────
        result["total_clauses_reviewed"] = len(findings)
        result.setdefault("executive_summary", "No executive summary was generated.")
        result["findings"] = findings

        return {
            "validated_result": result,
            "corrections_applied": corrections_applied,
            "total_corrections": len(corrections_applied)
        }

    @staticmethod
    def calculate_consistency_score(validation_result: dict, consistency_result: dict = None) -> float:
        """
        Returns a 0-100 consistency score based on how many corrections were needed.
        Fewer corrections = higher consistency.
        """
        corrections = ConsistencyChecker.apply_corrections(validation_result, consistency_result)
        num_corrections = corrections["total_corrections"]
        num_findings = len(validation_result.get("findings", []))

        if num_findings == 0:
            return 50.0  # Neutral without findings to evaluate

        # Each correction reduces the score
        penalty_per_correction = 10
        score = max(0, 100 - (num_corrections * penalty_per_correction))
        
        # Boost if Gemini consistency check passed
        if consistency_result and consistency_result.get("is_consistent") is True:
            score = min(100, score + 10)

        return round(score, 1)
