"""Pydantic models for the Data Science module (/api/ds/*)."""
from typing import Optional

from pydantic import BaseModel, Field


# === Financial Health Score ===
class CustomExpense(BaseModel):
    name: str
    amount: float = Field(ge=0)


class FinancialHealthRequest(BaseModel):
    income: float = Field(ge=0)
    rent: float = Field(default=0, ge=0)
    utilities: float = Field(default=0, ge=0)
    transportCost: float = Field(default=0, ge=0)
    otherRecurring: float = Field(default=0, ge=0)
    customExpenses: list[CustomExpense] = Field(default_factory=list)
    savingAmount: float = Field(default=0, ge=0)
    emergencyFundMonths: Optional[float] = Field(default=None, ge=0)


class FinancialHealthBreakdown(BaseModel):
    metric: str
    value: float
    score: float
    weight: float
    explanation: str


class FinancialHealthResponse(BaseModel):
    score: float
    rating: str
    breakdown: list[FinancialHealthBreakdown]
    explanation: str
    assumptions: list[str]
    limitations: list[str]
    disclaimer: str


# === Anomaly Detection ===
class Transaction(BaseModel):
    date: str
    amount: float
    category: Optional[str] = None
    description: Optional[str] = None


class AnomalyDetectionRequest(BaseModel):
    transactions: list[Transaction] = Field(..., min_length=1)
    z_score_threshold: float = Field(default=2.5, gt=0)


class AnomalyResult(BaseModel):
    date: str
    amount: float
    category: Optional[str] = None
    description: Optional[str] = None
    z_score: float
    reason: str


class AnomalyDetectionResponse(BaseModel):
    anomalies: list[AnomalyResult]
    mean: float
    std_dev: float
    transactions_analyzed: int
    explanation: str
    assumptions: list[str]
    limitations: list[str]
    disclaimer: str


# === Scenario Simulation ===
class ScenarioSimulationRequest(BaseModel):
    monthly_income: float = Field(ge=0)
    monthly_expenses: float = Field(ge=0)
    current_savings: float = Field(default=0, ge=0)
    months: int = Field(default=12, ge=1, le=600)
    income_change_pct: float = Field(default=0, ge=-100, le=1000)
    expense_change_pct: float = Field(default=0, ge=-100, le=1000)
    annual_return_pct: float = Field(default=0, ge=-100, le=100)


class ScenarioMonth(BaseModel):
    month: int
    income: float
    expenses: float
    net_savings: float
    projected_balance: float


class ScenarioSimulationResponse(BaseModel):
    timeline: list[ScenarioMonth]
    ending_balance: float
    total_contributions: float
    total_growth: float
    explanation: str
    assumptions: list[str]
    limitations: list[str]
    disclaimer: str


# === User Segmentation (placeholder) ===
class UserSegmentationRequest(BaseModel):
    income: float = Field(ge=0)
    savingAmount: float = Field(default=0, ge=0)
    totalExpenses: float = Field(default=0, ge=0)


class UserSegmentationResponse(BaseModel):
    segment: str
    status: str
    explanation: str
    assumptions: list[str]
    limitations: list[str]
    disclaimer: str
