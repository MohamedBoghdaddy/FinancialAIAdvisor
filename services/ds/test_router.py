from fastapi import FastAPI
from fastapi.testclient import TestClient

from .router import router

app = FastAPI()
app.include_router(router, prefix="/api/ds")
client = TestClient(app)


def test_financial_health_score_excellent():
    payload = {
        "income": 5000,
        "rent": 1000,
        "utilities": 200,
        "transportCost": 100,
        "otherRecurring": 100,
        "savingAmount": 9000,
    }
    res = client.post("/api/ds/financial-health-score", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["rating"] == "Excellent"
    assert len(body["breakdown"]) == 3
    assert body["disclaimer"]


def test_financial_health_score_zero_income():
    payload = {"income": 0}
    res = client.post("/api/ds/financial-health-score", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["rating"] == "Needs Attention"


def test_anomaly_detection_flags_outlier():
    payload = {
        "transactions": [
            {"date": "2024-01-01", "amount": 50, "category": "groceries"},
            {"date": "2024-01-02", "amount": 55, "category": "groceries"},
            {"date": "2024-01-03", "amount": 48, "category": "groceries"},
            {"date": "2024-01-04", "amount": 52, "category": "groceries"},
            {"date": "2024-01-05", "amount": 5000, "category": "electronics"},
        ],
        "z_score_threshold": 1.0,
    }
    res = client.post("/api/ds/anomaly-detection", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["transactions_analyzed"] == 5
    assert any(a["amount"] == 5000 for a in body["anomalies"])


def test_scenario_simulation_growth():
    payload = {
        "monthly_income": 3000,
        "monthly_expenses": 2000,
        "current_savings": 1000,
        "months": 3,
        "annual_return_pct": 0,
    }
    res = client.post("/api/ds/scenario-simulation", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert len(body["timeline"]) == 3
    # No growth (0% return), so balance = current_savings + 3 * net_savings
    assert body["ending_balance"] == 1000 + 3 * (3000 - 2000)


def test_user_segmentation_strong_saver():
    payload = {"income": 5000, "totalExpenses": 3000, "savingAmount": 0}
    res = client.post("/api/ds/user-segmentation", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["segment"] == "Strong Saver"
    assert body["status"] == "rule_based_placeholder"
