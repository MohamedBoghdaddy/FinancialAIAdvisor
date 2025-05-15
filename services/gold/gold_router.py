from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import json
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import load_model

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

# === Load JSON Helper ===
def load_json_file(filename):
    try:
        with open(filename, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading {filename}: {str(e)}")

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
            mae = float(mean_absolute_error(y_true, y_pred))
            rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
            r2 = float(r2_score(y_true, y_pred))
            results.append(MetricResponse(model=model_name, MAE=mae, RMSE=rmse, R2=r2))
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
