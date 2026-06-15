"""Cyber-finance protection endpoints (/api/security/*).

These use fast, deterministic heuristics (heuristics.py) so they work even
when the local LLM is not loaded. For deeper free-form analysis, see
/api/llm/scam-check.
"""
from fastapi import APIRouter

from . import heuristics
from .schemas import (
    PhishingCheckRequest,
    PhishingCheckResponse,
    ScamCheckRequest,
    ScamCheckResponse,
)

router = APIRouter(tags=["Security"])

DISCLAIMER = (
    "This is an automated heuristic check and may miss new or sophisticated "
    "scams, or flag legitimate messages. When in doubt, do not click links "
    "or share codes/passwords, and contact the organization directly using "
    "a number or address you already trust."
)


@router.post("/scam-check", response_model=ScamCheckResponse)
def scam_check(payload: ScamCheckRequest):
    result = heuristics.analyze_message(payload.text)
    return ScamCheckResponse(
        is_suspicious=result["is_suspicious"],
        risk_level=result["risk_level"],
        reasons=result["reasons"],
        suspicious_urls=result["suspicious_urls"],
        explanation=(
            "Checked the message for urgency language, requests for "
            "credentials or money, and suspicious links."
            if result["reasons"]
            else "No common scam indicators were found in this message."
        ),
        disclaimer=DISCLAIMER,
    )


@router.post("/phishing-check", response_model=PhishingCheckResponse)
def phishing_check(payload: PhishingCheckRequest):
    result = heuristics.analyze_url(payload.url)
    return PhishingCheckResponse(
        is_suspicious=result["is_suspicious"],
        risk_level=result["risk_level"],
        reasons=result["reasons"],
        explanation=(
            "Checked the link for common phishing indicators (IP-based "
            "hosts, suspicious top-level domains, lack of HTTPS)."
            if result["reasons"]
            else "No common phishing indicators were found in this link."
        ),
        disclaimer=DISCLAIMER,
    )
