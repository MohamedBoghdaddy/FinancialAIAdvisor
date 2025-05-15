from fastapi import APIRouter, FastAPI, HTTPException, Query
from pydantic import BaseModel
import json
import numpy as np
from tensorflow.keras.models import load_model
from sklearn.preprocessing import MinMaxScaler
import pandas as pd

router = APIRouter()

# === Response Schemas ===
class ForecastResponse(BaseModel):
    model: str
    forecast: list[float]

class MetricResponse(BaseModel):
    model: str
    MAE: float
    RMSE: float
    R2: float

class BestModelResponse(BaseModel):
    model: str
    RMSE: float

class PredictResponse(BaseModel):
    model: str
    days: int
    predictions: list[float]

# === /realestate/forecast ===
@router.get("/forecast", response_model=list[ForecastResponse])
def get_forecasts():
    try:
        with open("REAL_forecast_results.json", "r") as f:
            results = json.load(f)
        return [
            ForecastResponse(model=model, forecast=data["Forecast"])
            for model, data in results.items()
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")

# === /realestate/metrics ===
@router.get("/metrics", response_model=list[MetricResponse])
def get_metrics():
    try:
        with open("REAL_forecast_results.json", "r") as f:
            results = json.load(f)
        return [
            MetricResponse(model=model, MAE=data["MAE"], RMSE=data["RMSE"], R2=data["R2"])
            for model, data in results.items()
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metric error: {str(e)}")

# === /realestate/best-model ===
@router.get("/best-model", response_model=BestModelResponse)
def get_best_model():
    try:
        with open("REAL_forecast_results.json", "r") as f:
            results = json.load(f)
        best = min(results.items(), key=lambda x: x[1]["RMSE"])
        return BestModelResponse(model=best[0], RMSE=best[1]["RMSE"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Best model error: {str(e)}")

# === /realestate/predict?days=15 ===
@router.get("/predict", response_model=PredictResponse)
def predict(days: int = Query(15, ge=1, le=60)):
    try:
        # Load pre-trained LSTM model
        model = load_model("REAL_lstm_forecast_model.keras")

        # Load historical data
        df = pd.read_csv("egypt_House_prices.csv")
        df["Price"] = pd.to_numeric(df["Price"], errors="coerce")
        df["Price"].fillna(df["Price"].mean(), inplace=True)

        # Normalize the price
        scaler = MinMaxScaler()
        scaled = scaler.fit_transform(df["Price"].values.reshape(-1, 1))

        # Use the last 60 entries as the input window
        window = scaled[-60:].reshape(1, 60, 1)
        predictions_scaled = []

        for _ in range(days):
            pred = model.predict(window, verbose=0)[0][0]
            predictions_scaled.append(pred)
            window = np.append(window[:, 1:, :], [[[pred]]], axis=1)

        # Rescale back to original price range
        predictions = scaler.inverse_transform(np.array(predictions_scaled).reshape(-1, 1)).flatten().tolist()

        return PredictResponse(model="LSTM", days=days, predictions=predictions)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# === STANDALONE RUN SUPPORT ===
app = FastAPI(title="🏡 Real Estate Forecast API")
app.include_router(router, prefix="/realestate", tags=["Real Estate"])
