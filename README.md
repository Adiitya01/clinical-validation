# ComplianceLens
### Strategic AI Oversight for Clinical & Regulatory Compliance

**ComplianceLens** is a sophisticated, full-stack enterprise solution designed for Clinical Affairs and Regulatory Affairs (RA) teams. It automates the complex process of cross-referencing clinical/safety documentation against stringent regulatory frameworks (such as **EU MDR 2017/745**, **CDSCO IMDR**, and **MDCG Guidance**).

By utilizing a multi-stage **Large Language Model (LLM) Pipeline**, ComplianceLens transforms manual, weeks-long document audits into a high-precision digital oversight process, minimizing human error and accelerating market entry.

---

## Key Strategic Features

- **3-Stage Validation Pipeline**: Unlike simple AI tools, ComplianceLens utilizes a robust Validate → Verify → Score architecture to ensure maximum logical consistency.
- **Evidence-Locked Audit**: Extracts direct textual evidence and clause references from guidelines to eliminate hallucinations.
- **Dynamic Risk Scoring**: Provides real-time Compliance Scores (0-100%) and categorizes findings by severity (**Critical, Major, Minor**).
- **Self-Consistency Verification**: An independent AI layer audits the primary output to identify and correct potential logical contradictions.
- **Enterprise Reporting**: Generates high-fidelity `.docx` audit reports containing detailed findings, executive summaries, and actionable remediation steps.
- **Localized Specialist Knowledge**: Tailored for both International (Global) and Indian (CDSCO) regulatory landscapes.

---

## Technology Architecture

### Backend (Precision Engine)
- **FastAPI**: High-performance asynchronous API framework.
- **Google GenAI SDK**: Utilizing **Gemini 2.0 Flash** for state-of-the-art document reasoning.
- **Structured JSON Schema**: Enforced output types for repeatable, deterministic results.
- **aiosqlite**: Non-blocking database management for session persistence and audit trails.

### Frontend (Intelligence Dashboard)
- **React (Vite)**: Modern, responsive single-page application.
- **Tailwind CSS 4**: Premium, professional design system with high-contrast clinical aesthetics.
- **Framer Motion**: Smooth micro-animations for enhanced user feedback during complex AI processing.

---

## Installation & Deployment

### Prerequisites
- Python 3.10+ (Tested on 3.14)
- Node.js 18+
- Google Gemini API Key

### Backend Setup
1.  **Environment Configuration**:
    ```bash
    cd backend
    # Create and populate .env with GOOGLE_API_KEY
    ```
2.  **Dependency Management**:
    ```bash
    python -m venv venv
    ./venv/Scripts/activate  # Windows
    pip install -r requirements.txt
    ```
3.  **Launch Primary Engine**:
    ```bash
    python main.py
    ```

### Frontend Setup
1.  **Initialize Environment**:
    ```bash
    cd frontend
    npm install
    ```
2.  **Launch Dashboard**:
    ```bash
    npm run dev
    ```

---

## Disclaimer
*ComplianceLens is a decision-support system. It is designed to augment human regulatory expertise, not replace it. All findings and AI-generated reports should be reviewed by qualified Regulatory Affairs Professionals before submission to notified bodies or regulatory agencies.*

---
© 2026 ComplianceLens AI. All rights reserved. Strategic Compliance Platform.
