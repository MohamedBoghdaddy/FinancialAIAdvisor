"""Data Science endpoints for FinGenie (/api/ds/*).

All scores and projections here are computed with deterministic, documented
formulas - not trained ML models - so results are explainable and
reproducible. Each response includes assumptions/limitations/disclaimer
fields per the project's "do not fake metrics" rule.
"""
import statistics

from fastapi import APIRouter

from .schemas import (
    AnomalyDetectionRequest,
    AnomalyDetectionResponse,
    AnomalyResult,
    FinancialHealthBreakdown,
    FinancialHealthRequest,
    FinancialHealthResponse,
    ScenarioMonth,
    ScenarioSimulationRequest,
    ScenarioSimulationResponse,
    UserSegmentationRequest,
    UserSegmentationResponse,
)

router = APIRouter(tags=["Data Science"])

DISCLAIMER = (
    "This is an educational estimate based on the figures you provided, "
    "not financial advice. It does not account for taxes, debt, or "
    "circumstances not entered here."
)


# === Financial Health Score ===
@router.post("/financial-health-score", response_model=FinancialHealthResponse)
def financial_health_score(payload: FinancialHealthRequest):
    custom_total = sum(e.amount for e in payload.customExpenses)
    total_expenses = (
        payload.rent + payload.utilities + payload.transportCost
        + payload.otherRecurring + custom_total
    )

    breakdown: list[FinancialHealthBreakdown] = []

    # 1. Savings rate: (income - expenses) / income, target >= 20%
    if payload.income > 0:
        savings_rate = (payload.income - total_expenses) / payload.income
    else:
        savings_rate = 0.0
    savings_score = max(0.0, min(100.0, (savings_rate / 0.20) * 100))
    breakdown.append(
        FinancialHealthBreakdown(
            metric="savings_rate",
            value=round(savings_rate * 100, 2),
            score=round(savings_score, 2),
            weight=0.4,
            explanation=(
                "Share of income left after recurring expenses. "
                "A 20% savings rate scores 100."
            ),
        )
    )

    # 2. Expense-to-income ratio: lower is better, target <= 50%
    if payload.income > 0:
        expense_ratio = total_expenses / payload.income
    else:
        expense_ratio = 1.0
    expense_score = max(0.0, min(100.0, (1 - expense_ratio / 0.5) * 100))
    breakdown.append(
        FinancialHealthBreakdown(
            metric="expense_to_income_ratio",
            value=round(expense_ratio * 100, 2),
            score=round(expense_score, 2),
            weight=0.3,
            explanation=(
                "Recurring expenses as a percentage of income. "
                "50% or less scores 100; higher ratios score lower."
            ),
        )
    )

    # 3. Emergency fund coverage: savingAmount / monthly expenses, target >= 6 months
    if total_expenses > 0:
        coverage_months = payload.savingAmount / total_expenses
    else:
        coverage_months = 6.0 if payload.savingAmount > 0 else 0.0
    coverage_score = max(0.0, min(100.0, (coverage_months / 6.0) * 100))
    breakdown.append(
        FinancialHealthBreakdown(
            metric="emergency_fund_coverage_months",
            value=round(coverage_months, 2),
            score=round(coverage_score, 2),
            weight=0.3,
            explanation=(
                "How many months of expenses your current savings could "
                "cover. 6 months or more scores 100."
            ),
        )
    )

    overall = sum(b.score * b.weight for b in breakdown)

    if overall >= 80:
        rating = "Excellent"
    elif overall >= 60:
        rating = "Good"
    elif overall >= 40:
        rating = "Fair"
    else:
        rating = "Needs Attention"

    return FinancialHealthResponse(
        score=round(overall, 2),
        rating=rating,
        breakdown=breakdown,
        explanation=(
            "Score is a weighted average of savings rate (40%), "
            "expense-to-income ratio (30%), and emergency fund coverage (30%), "
            "each scaled to 0-100 against the targets described below."
        ),
        assumptions=[
            "Income and expenses are treated as fixed monthly figures.",
            "Targets used: 20% savings rate, <=50% expense-to-income ratio, "
            ">=6 months of expenses held as emergency savings.",
        ],
        limitations=[
            "Does not account for debt repayment, taxes, or irregular income.",
            "Does not consider dependents, location cost-of-living, or goals.",
            "A single snapshot - trends over time are not captured.",
        ],
        disclaimer=DISCLAIMER,
    )


# === Anomaly Detection ===
@router.post("/anomaly-detection", response_model=AnomalyDetectionResponse)
def anomaly_detection(payload: AnomalyDetectionRequest):
    amounts = [t.amount for t in payload.transactions]

    mean = statistics.mean(amounts)
    std_dev = statistics.pstdev(amounts) if len(amounts) > 1 else 0.0

    anomalies: list[AnomalyResult] = []
    if std_dev > 0:
        for t in payload.transactions:
            z = (t.amount - mean) / std_dev
            if abs(z) >= payload.z_score_threshold:
                anomalies.append(
                    AnomalyResult(
                        date=t.date,
                        amount=t.amount,
                        category=t.category,
                        description=t.description,
                        z_score=round(z, 2),
                        reason=(
                            f"Amount is {abs(z):.2f} standard deviations "
                            f"{'above' if z > 0 else 'below'} the average "
                            f"transaction ({mean:.2f})."
                        ),
                    )
                )

    return AnomalyDetectionResponse(
        anomalies=anomalies,
        mean=round(mean, 2),
        std_dev=round(std_dev, 2),
        transactions_analyzed=len(payload.transactions),
        explanation=(
            "Flags transactions whose amount deviates from the mean by more "
            "than the given z-score threshold (default 2.5 standard "
            "deviations) using simple descriptive statistics."
        ),
        assumptions=[
            "All transactions are treated as a single population "
            "(not split by category or time period).",
            f"z-score threshold used: {payload.z_score_threshold}.",
        ],
        limitations=[
            "Requires a reasonable number of transactions to be meaningful; "
            "results on very small datasets may be unreliable.",
            "A statistical outlier is not necessarily fraudulent or wrong - "
            "review flagged items manually.",
            "Does not detect anomalies that are similar in size to normal "
            "spending but unusual in pattern (e.g. timing, merchant).",
        ],
        disclaimer=DISCLAIMER,
    )


# === Scenario Simulation ===
@router.post("/scenario-simulation", response_model=ScenarioSimulationResponse)
def scenario_simulation(payload: ScenarioSimulationRequest):
    income = payload.monthly_income * (1 + payload.income_change_pct / 100)
    expenses = payload.monthly_expenses * (1 + payload.expense_change_pct / 100)
    monthly_return = (payload.annual_return_pct / 100) / 12

    balance = payload.current_savings
    total_contributions = 0.0
    total_growth = 0.0
    timeline: list[ScenarioMonth] = []

    for month in range(1, payload.months + 1):
        net_savings = income - expenses
        growth = balance * monthly_return
        balance = balance + net_savings + growth

        total_contributions += net_savings
        total_growth += growth

        timeline.append(
            ScenarioMonth(
                month=month,
                income=round(income, 2),
                expenses=round(expenses, 2),
                net_savings=round(net_savings, 2),
                projected_balance=round(balance, 2),
            )
        )

    return ScenarioSimulationResponse(
        timeline=timeline,
        ending_balance=round(balance, 2),
        total_contributions=round(total_contributions, 2),
        total_growth=round(total_growth, 2),
        explanation=(
            "Projects your balance month-by-month: each month adds "
            "(income - expenses) plus growth at the given annual return "
            "rate (applied monthly, compounded)."
        ),
        assumptions=[
            "Income and expense changes are applied immediately and held "
            "constant for the whole simulation.",
            "Annual return is divided evenly across 12 months "
            "(simple monthly compounding, not variable market returns).",
            "No taxes, fees, or inflation are modeled.",
        ],
        limitations=[
            "Real markets fluctuate - actual returns will differ from this "
            "straight-line projection.",
            "Does not model irregular income, one-time expenses, or debt.",
            "Longer time horizons compound any inaccuracy in the inputs.",
        ],
        disclaimer=DISCLAIMER,
    )


# === User Segmentation (placeholder) ===
@router.post("/user-segmentation", response_model=UserSegmentationResponse)
def user_segmentation(payload: UserSegmentationRequest):
    """Rule-based placeholder for a future ML-based segmentation model.

    Uses simple thresholds on savings rate to bucket the user. This is a
    stand-in until a properly trained/evaluated segmentation model exists -
    it intentionally avoids presenting itself as ML output.
    """
    savings_rate = (
        (payload.income - payload.totalExpenses) / payload.income
        if payload.income > 0
        else 0.0
    )

    if savings_rate >= 0.3:
        segment = "Strong Saver"
    elif savings_rate >= 0.1:
        segment = "Steady Saver"
    elif savings_rate >= 0:
        segment = "Tight Budget"
    else:
        segment = "Overspending"

    return UserSegmentationResponse(
        segment=segment,
        status="rule_based_placeholder",
        explanation=(
            f"Based on a savings rate of {savings_rate * 100:.1f}%, "
            f"this account is bucketed as '{segment}' using fixed "
            "thresholds (>=30% Strong Saver, >=10% Steady Saver, "
            ">=0% Tight Budget, <0% Overspending)."
        ),
        assumptions=[
            "Segmentation is based only on income and total expenses.",
        ],
        limitations=[
            "This is a simple rule-based placeholder, not a trained "
            "machine-learning segmentation model.",
            "Does not consider spending categories, goals, age, or "
            "financial history.",
        ],
        disclaimer=DISCLAIMER,
    )
