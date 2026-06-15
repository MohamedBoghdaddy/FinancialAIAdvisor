from typing import Literal

from pydantic import BaseModel, Field


class ScamCheckRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)


class ScamCheckResponse(BaseModel):
    is_suspicious: bool
    risk_level: Literal["low", "medium", "high"]
    reasons: list[str]
    suspicious_urls: list[str]
    explanation: str
    disclaimer: str


class PhishingCheckRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2000)


class PhishingCheckResponse(BaseModel):
    is_suspicious: bool
    risk_level: Literal["low", "medium", "high"]
    reasons: list[str]
    explanation: str
    disclaimer: str
