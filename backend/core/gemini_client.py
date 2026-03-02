from google import genai
from google.genai import types
import os
import json
import time
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ─── Structured Prompt Templates

SYSTEM_INSTRUCTION = """You are a senior regulatory affairs specialist with 15+ years of experience 
in EU MDR 2017/745, MDCG guidance documents, ISO 14971, ISO 13485. You provide precise, clause-level compliance assessments. 
You never fabricate clauses. If a clause does not apply, you say so explicitly."""

VALIDATION_PROMPT = """
TASK: Perform a thorough regulatory compliance audit of the uploaded Clinical/Safety Document 
against the uploaded Regulatory Guideline.

INSTRUCTIONS:
1. Read the Regulatory Guideline completely first. Identify every mandatory requirement, 
   "shall" statement, and critical expectation.
2. Then read the Clinical/Safety Document. For EACH requirement identified in step 1, 
   determine whether the document satisfies it.
3. Classify each finding using ONLY these statuses:
   - "Compliant" — the document fully satisfies the requirement
   - "Non-Compliant" — the document fails to satisfy the requirement (major gap)
   - "Partial" — the document partially addresses it but has gaps
   - "Observation" — minor improvement opportunity, not a hard failure
   - "Not Applicable" — the clause does not apply to this document type
4. Assign a severity to Non-Compliant and Partial findings:
   - "Critical" — could block regulatory submission or approval
   - "Major" — significant gap that requires remediation before submission
   - "Minor" — should be addressed but unlikely to block approval
5. Calculate compliance_score as: (Compliant findings / Total applicable findings) × 100, rounded to 1 decimal.
6. Provide an executive_summary (3-5 sentences) covering: overall readiness, top risks, and recommended next steps.
7. Provide a risk_summary object with counts of critical, major, and minor findings.

OUTPUT FORMAT — return ONLY valid JSON matching this exact schema:
{
  "compliance_score": <number 0-100>,
  "total_clauses_reviewed": <integer>,
  "executive_summary": "<string>",
  "risk_summary": {
    "critical": <integer>,
    "major": <integer>,
    "minor": <integer>,
    "observations": <integer>
  },
  "findings": [
    {
      "clause": "<exact clause/section reference from the guideline>",
      "requirement": "<what the guideline requires>",
      "status": "<Compliant|Non-Compliant|Partial|Observation|Not Applicable>",
      "severity": "<Critical|Major|Minor|N/A>",
      "evidence": "<specific text or section from the document that was evaluated>",
      "description": "<detailed explanation of the gap or compliance>",
      "recommendation": "<actionable remediation step>"
    }
  ]
}

CRITICAL RULES:
- Do NOT invent clause numbers. Use the exact references from the guideline document.
- Every "Non-Compliant" or "Partial" finding MUST have a non-empty recommendation.
- If the document is clearly unrelated to the guideline, state that in the executive_summary 
  and return compliance_score of 0 with an explanation.
- Output ONLY the JSON object. No markdown, no commentary, no code fences.
"""

CONSISTENCY_CHECK_PROMPT = """
TASK: Review the following regulatory validation JSON for internal consistency and quality.

VALIDATION RESULT:
{result_json}

CHECK FOR:
1. Does the compliance_score mathematically match the ratio of Compliant findings to total applicable findings?
2. Are there any contradictions (e.g., a finding marked "Compliant" but with a description indicating a gap)?
3. Does the risk_summary accurately count the severity levels in findings?
4. Are all Non-Compliant and Partial findings accompanied by a non-empty recommendation?
5. Are clause references plausible (not fabricated generic numbers)?
6. Is the executive_summary consistent with the detailed findings?

OUTPUT FORMAT — return ONLY valid JSON:
{{
  "is_consistent": <boolean>,
  "corrected_compliance_score": <number or null if original was correct>,
  "corrected_risk_summary": <object or null if original was correct>,
  "issues_found": [
    {{
      "type": "<score_mismatch|contradiction|missing_recommendation|fabricated_clause|summary_mismatch>",
      "description": "<what was wrong>",
      "correction": "<what should be fixed>"
    }}
  ],
  "quality_score": <number 0-100 representing overall quality of the validation>
}}
"""


class GeminiClient:
    def __init__(self, model_name="gemini-2.0-flash"):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")
            
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
        self.max_retries = 3

    def _upload_file(self, file_path: str, display_name: str) -> object:
        """Upload a file to Gemini with retries."""
        abs_path = os.path.abspath(file_path)

        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"File not found: {abs_path}")
        if os.path.getsize(abs_path) == 0:
            raise ValueError(f"File is empty: {abs_path}")

        # Detect mime type
        ext = os.path.splitext(abs_path)[1].lower()
        mime_map = {
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc": "application/msword",
            ".txt": "text/plain"
        }
        # Default to octet-stream for unknown (like .dcx if it's proprietary) 
        # but if the user says "word format", .docx mime type is the best bet for .dcx too if it's just a typo.
        mime_type = mime_map.get(ext, "application/octet-stream")
        if ext == ".dcx":
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"Uploading {display_name} (attempt {attempt}, type {mime_type}): {abs_path}")
                # The new SDK uses a different method for file uploads
                uploaded = self.client.files.upload(
                    file=abs_path,
                    config=types.UploadFileConfig(
                        mime_type=mime_type,
                        display_name=display_name
                    )
                )
                logger.info(f"Upload successful: {uploaded.name}")
                return uploaded
            except Exception as e:
                logger.warning(f"Upload attempt {attempt} failed: {e}")
                if attempt == self.max_retries:
                    raise RuntimeError(f"Failed to upload {display_name} after {self.max_retries} attempts: {e}")
                time.sleep(2 ** attempt)  # Exponential backoff

    def _parse_json_response(self, text: str) -> dict:
        """Robustly parse JSON from Gemini response, handling markdown fences."""
        cleaned = text.strip()

        # Strip markdown code fences
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse failed: {e}\nRaw text:\n{text[:500]}")
            raise ValueError(f"Gemini returned invalid JSON: {e}")

    async def _get_docx_text(self, file_path: str) -> str:
        """Extract text from a .docx file."""
        try:
            import docx
            doc = docx.Document(file_path)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            return "\n".join(full_text)
        except Exception as e:
            logger.error(f"Failed to extract text from DOCX: {e}")
            raise ValueError(f"Could not read Word document: {e}")

    async def validate_document(self, doc_path: str, guideline_path: str) -> dict:
        """
        Stage 1: Primary regulatory validation.
        Uploads documents to Gemini and performs clause-level compliance analysis.
        Handles Word docs by converting them to text first.
        """
        temp_files = []
        
        # Process Document
        doc_ext = os.path.splitext(doc_path)[1].lower()
        if doc_ext in [".docx", ".doc", ".dcx"]:
            logger.info(f"Processing Word document as text: {doc_path}")
            text = await self._get_docx_text(doc_path)
            # Save to temporary .txt for upload
            temp_txt_path = doc_path + ".converted.txt"
            with open(temp_txt_path, "w", encoding="utf-8") as f:
                f.write(text)
            doc_file = self._upload_file(temp_txt_path, "clinical_document_text")
            temp_files.append(temp_txt_path)
        else:
            doc_file = self._upload_file(doc_path, "clinical_document")

        # Process Guideline
        gui_ext = os.path.splitext(guideline_path)[1].lower()
        if gui_ext in [".docx", ".doc", ".dcx"]:
            logger.info(f"Processing Word guideline as text: {guideline_path}")
            text = await self._get_docx_text(guideline_path)
            temp_txt_path = guideline_path + ".converted.txt"
            with open(temp_txt_path, "w", encoding="utf-8") as f:
                f.write(text)
            guideline_file = self._upload_file(temp_txt_path, "regulatory_guideline_text")
            temp_files.append(temp_txt_path)
        else:
            guideline_file = self._upload_file(guideline_path, "regulatory_guideline")

        try:
            for attempt in range(1, self.max_retries + 1):
                try:
                    logger.info(f"Running validation (attempt {attempt})...")
                    
                    response = self.client.models.generate_content(
                        model=self.model_name,
                        contents=[
                            types.Content(
                                parts=[
                                    types.Part.from_uri(file_uri=guideline_file.uri, mime_type=guideline_file.mime_type),
                                    types.Part.from_uri(file_uri=doc_file.uri, mime_type=doc_file.mime_type),
                                    types.Part.from_text(text=VALIDATION_PROMPT)
                                ]
                            )
                        ],
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_INSTRUCTION,
                            temperature=0.1,
                            top_p=0.95,
                            max_output_tokens=8192,
                            response_mime_type="application/json"
                        )
                    )
                    
                    result = self._parse_json_response(response.text)

                    # Basic structural validation
                    required_keys = {"compliance_score", "findings", "executive_summary"}
                    if not required_keys.issubset(result.keys()):
                        missing = required_keys - result.keys()
                        raise ValueError(f"Response missing required keys: {missing}")

                    if not isinstance(result["findings"], list):
                        raise ValueError("findings must be a list")

                    logger.info(f"Validation complete: score={result.get('compliance_score')}, "
                              f"findings={len(result.get('findings', []))}")
                    return result

                except Exception as e:
                    logger.warning(f"Validation attempt {attempt} failed: {e}")
                    if attempt == self.max_retries:
                        raise
                    time.sleep(2 ** attempt)
        finally:
            # Clean up temp text files
            for tf in temp_files:
                try:
                    os.remove(tf)
                except:
                    pass

    async def check_consistency(self, validation_result: dict) -> dict:
        """
        Stage 2: Self-consistency verification.
        Asks Gemini to review its own output for contradictions, math errors, and fabrication.
        """
        prompt = CONSISTENCY_CHECK_PROMPT.format(
            result_json=json.dumps(validation_result, indent=2)
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            return self._parse_json_response(response.text)
        except Exception as e:
            logger.warning(f"Consistency check failed (non-fatal): {e}")
            return {
                "is_consistent": None,
                "corrected_compliance_score": None,
                "corrected_risk_summary": None,
                "issues_found": [],
                "quality_score": None
            }

    def cleanup_files(self, *file_refs):
        """Clean up uploaded files from Gemini servers."""
        for ref in file_refs:
            try:
                self.client.files.delete(name=ref.name)
            except Exception:
                pass
