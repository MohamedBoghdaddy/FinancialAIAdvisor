"""FastAPI router exposing the local Qwen2.5-Instruct model.

All endpoints lazy-load the model on first use (see loader.py). If the
model fails to load (e.g. dependencies missing, no GPU/CPU memory), the
endpoints return HTTP 503 rather than crashing the whole app.
"""
from fastapi import APIRouter, HTTPException

from . import loader, prompts, safety
from .schemas import (
    FinancialAdviceRequest,
    FinancialAdviceResponse,
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
    IntentRequest,
    IntentResponse,
    ScamCheckRequest,
    ScamCheckResponse,
)

router = APIRouter(tags=["LLM"])


def _run_generate(messages, **kwargs) -> str:
    try:
        return loader.generate(messages, **kwargs)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"LLM unavailable: {str(e)}",
        )


@router.get("/health", response_model=HealthResponse)
def llm_health():
    status = loader.get_status()
    return HealthResponse(
        status="ok",
        model_id=status["model_id"],
        loaded=status["loaded"],
        device=status["device"],
        load_in_4bit=status["load_in_4bit"],
        error=status["error"],
    )


@router.post("/generate", response_model=GenerateResponse)
def generate(payload: GenerateRequest):
    if safety.contains_prompt_injection(payload.prompt):
        return GenerateResponse(
            output=(
                "I can't follow instructions that try to override my "
                "configuration. Please rephrase your question about your "
                "finances."
            ),
            model_id=loader.MODEL_ID,
            disclaimer=prompts.FINANCIAL_DISCLAIMER,
        )

    messages = prompts.build_generate_prompt(payload.prompt, payload.system_prompt)
    output = _run_generate(
        messages,
        max_new_tokens=payload.max_new_tokens,
        temperature=payload.temperature,
        top_p=payload.top_p,
    )
    return GenerateResponse(
        output=output, model_id=loader.MODEL_ID, disclaimer=prompts.FINANCIAL_DISCLAIMER
    )


@router.post("/financial-advice", response_model=FinancialAdviceResponse)
def financial_advice(payload: FinancialAdviceRequest):
    if safety.contains_prompt_injection(payload.question):
        return FinancialAdviceResponse(
            advice=(
                "I can't follow instructions that try to override my "
                "configuration. Please rephrase your question about your "
                "finances."
            ),
            disclaimer=prompts.FINANCIAL_DISCLAIMER,
            model_id=loader.MODEL_ID,
        )

    messages = prompts.build_financial_advice_prompt(payload.question, payload.profile)
    output = _run_generate(messages)
    return FinancialAdviceResponse(
        advice=output, disclaimer=prompts.FINANCIAL_DISCLAIMER, model_id=loader.MODEL_ID
    )


@router.post("/intent", response_model=IntentResponse)
def parse_intent(payload: IntentRequest):
    # Deterministic backstop: obvious high-risk actions are flagged even
    # before consulting the LLM.
    if safety.contains_prompt_injection(payload.text) or safety.mentions_forbidden_action(
        payload.text
    ):
        return IntentResponse(
            intent="forbidden_action",
            confidence="high",
            risk_level="high",
            parameters={},
            raw=None,
        )

    messages = prompts.build_intent_prompt(payload.text)
    raw = _run_generate(messages, temperature=0.0)
    parsed = safety.extract_json(raw)

    if not parsed or "intent" not in parsed:
        return IntentResponse(
            intent="unknown",
            confidence="low",
            risk_level="medium",
            parameters={},
            raw=raw,
        )

    risk_level = parsed.get("risk_level", "medium")
    if risk_level not in ("low", "medium", "high"):
        risk_level = "medium"

    return IntentResponse(
        intent=parsed.get("intent", "unknown"),
        confidence="medium",
        risk_level=risk_level,
        parameters=parsed.get("parameters", {}) or {},
        raw=raw,
    )


@router.post("/scam-check", response_model=ScamCheckResponse)
def scam_check(payload: ScamCheckRequest):
    messages = prompts.build_scam_check_prompt(payload.text)
    raw = _run_generate(messages, temperature=0.0)
    parsed = safety.extract_json(raw)

    if not parsed:
        return ScamCheckResponse(
            is_suspicious=False,
            risk_level="low",
            reasons=[],
            explanation=(
                "Unable to analyze this message automatically. When in "
                "doubt, do not click links or share codes/passwords, and "
                "contact your bank directly using a known phone number."
            ),
            disclaimer=prompts.FINANCIAL_DISCLAIMER,
        )

    risk_level = parsed.get("risk_level", "low")
    if risk_level not in ("low", "medium", "high"):
        risk_level = "low"

    return ScamCheckResponse(
        is_suspicious=bool(parsed.get("is_suspicious", False)),
        risk_level=risk_level,
        reasons=list(parsed.get("reasons", []) or []),
        explanation=parsed.get("explanation", ""),
        disclaimer=prompts.FINANCIAL_DISCLAIMER,
    )
