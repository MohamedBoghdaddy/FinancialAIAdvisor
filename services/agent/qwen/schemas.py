"""Pydantic request/response models for the Qwen LLM router."""
from typing import Literal, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    model_id: str
    loaded: bool
    device: Optional[str] = None
    load_in_4bit: bool
    error: Optional[str] = None


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    system_prompt: Optional[str] = None
    max_new_tokens: Optional[int] = Field(default=None, ge=1, le=2048)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class GenerateResponse(BaseModel):
    output: str
    model_id: str
    disclaimer: str


class FinancialAdviceRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    profile: dict = Field(default_factory=dict)


class FinancialAdviceResponse(BaseModel):
    advice: str
    disclaimer: str
    model_id: str


class IntentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


class IntentResponse(BaseModel):
    intent: str
    confidence: Literal["low", "medium", "high"]
    risk_level: Literal["low", "medium", "high"]
    parameters: dict = Field(default_factory=dict)
    raw: Optional[str] = None


class ScamCheckRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)


class ScamCheckResponse(BaseModel):
    is_suspicious: bool
    risk_level: Literal["low", "medium", "high"]
    reasons: list[str]
    explanation: str
    disclaimer: str
