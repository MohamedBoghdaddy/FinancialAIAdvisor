from fastapi import APIRouter, FastAPI, HTTPException, Query
from pydantic import BaseModel
import json
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import load_model
from datetime import datetime, timedelta

router = APIRouter()

# === Response Schemas ===
class ForecastResponse(BaseModel):
    model: str
    predictions: list[float]
    actual: list[float]

class MetricResponse(BaseModel):
    model: str
    MAE: float
    RMSE: float
    R2: float

class BestModelResponse(BaseModel):
    best_model: str
    rmses: dict

class PredictResponse(BaseModel):
    model: str
    days: int
    predictions: list[float]

# === Helper ===
def load_json_file(filename: str):
    try:
        with open(filename, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading {filename}: {str(e)}")

# === /gold/history ===
@router.get("/history")
def get_gold_history(period: str = Query("1y", enum=["5y", "3y", "1y", "6mo", "3mo", "1mo", "15d", "7d", "1d"])):
    try:
        df = pd.read_csv("data.csv")
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
        df["24K - Global Price"] = pd.to_numeric(df["24K - Global Price"], errors="coerce")
        df = df.dropna(subset=["Date", "24K - Global Price"]).sort_values("Date")

        today = df["Date"].max()
        period_map = {
            "5y": today - timedelta(days=5 * 365),
            "3y": today - timedelta(days=3 * 365),
            "1y": today - timedelta(days=365),
            "6mo": today - timedelta(days=180),
            "3mo": today - timedelta(days=90),
            "1mo": today - timedelta(days=30),
            "15d": today - timedelta(days=15),
            "7d": today - timedelta(days=7),
            "1d": today - timedelta(days=2),
        }

        cutoff = period_map.get(period)
        df = df[df["Date"] >= cutoff]

        history = df[["Date", "24K - Global Price"]].copy()
        history["Date"] = history["Date"].dt.strftime("%Y-%m-%d")

        return {
            "period": period,
            "dates": history["Date"].tolist(),
            "prices": history["24K - Global Price"].tolist()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"History fetch error: {str(e)}")

# === /gold/forecast ===
@router.get("/forecast", response_model=list[ForecastResponse])
def get_all_gold_forecasts():
    try:
        arima = load_json_file("GOLD_arima_results.json")
        prophet = load_json_file("GOLD_prophet_results.json")
        lstm = load_json_file("GOLD_lstm_results.json")

        return [
            ForecastResponse(model="ARIMA", predictions=arima["predictions"], actual=arima["actual"]),
            ForecastResponse(model="Prophet", predictions=prophet["predictions"], actual=prophet["actual"]),
            ForecastResponse(model="LSTM", predictions=lstm["predictions"], actual=lstm["actual"]),
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast fetch error: {str(e)}")

# === /gold/metrics ===
@router.get("/metrics", response_model=list[MetricResponse])
def get_model_metrics():
    try:
        results = []
        for model_name, filename in [
            ("ARIMA", "GOLD_arima_results.json"),
            ("Prophet", "GOLD_prophet_results.json"),
            ("LSTM", "GOLD_lstm_results.json")
        ]:
            data = load_json_file(filename)
            y_true = np.array(data["actual"])
            y_pred = np.array(data["predictions"])

            results.append(MetricResponse(
                model=model_name,
                MAE=float(mean_absolute_error(y_true, y_pred)),
                RMSE=float(np.sqrt(mean_squared_error(y_true, y_pred))),
                R2=float(r2_score(y_true, y_pred))
            ))
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metric computation error: {str(e)}")

# === /gold/best-model ===
@router.get("/best-model", response_model=BestModelResponse)
def get_best_model():
    try:
        best_model = load_json_file("GOLD_best_model.json")
        return BestModelResponse(**best_model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Best model fetch error: {str(e)}")

# === /gold/predict?days=15 ===
@router.get("/predict", response_model=PredictResponse)
def predict_next_days(days: int = Query(15, ge=1, le=60)):
    try:
        df = pd.read_csv("data.csv")
        df["24K - Global Price"] = pd.to_numeric(df["24K - Global Price"], errors="coerce")
        df["24K - Global Price"].fillna(df["24K - Global Price"].mean(), inplace=True)

        scaler = MinMaxScaler()
        scaled = scaler.fit_transform(df["24K - Global Price"].values.reshape(-1, 1))
        window = scaled[-60:].reshape(1, 60, 1)

        model = load_model("GOLD_lstm_model.keras")
        pred_scaled = []

        for _ in range(days):
            pred = model.predict(window, verbose=0)[0][0]
            pred_scaled.append(pred)
            window = np.append(window[:, 1:, :], [[[pred]]], axis=1)

        predictions = scaler.inverse_transform(np.array(pred_scaled).reshape(-1, 1)).flatten().tolist()
        return PredictResponse(model="LSTM", days=days, predictions=predictions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# === Enable Standalone Run ===
app = FastAPI(title="🌍 Gold Price Forecast API")
app.include_router(router, prefix="/gold", tags=["Gold"])
