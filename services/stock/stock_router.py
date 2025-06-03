from fastapi import APIRouter, Query, HTTPException
import pandas as pd
import yfinance as yf
import joblib
import os
from datetime import datetime, timedelta

router = APIRouter(prefix="/stock", tags=["Stock"])

# === Config ===
MODEL_DIR = "stock/model"
os.makedirs(MODEL_DIR, exist_ok=True)

# === Prediction ===
@router.get("/predict")
def predict(symbol: str = Query("AAPL"), days: int = Query(15, ge=1, le=60)):
    try:
        model_path = os.path.join(MODEL_DIR, "rf_model.pkl")
        scaler_path = os.path.join(MODEL_DIR, "rf_scaler.pkl")

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            raise HTTPException(status_code=404, detail="Model not trained.")

        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)

        df = yf.download(symbol, period="6mo")
        df = df[['Close']].copy().reset_index()
        df['SMA_50'] = df['Close'].rolling(window=50).mean()
        df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
        df.dropna(inplace=True)

        if df.empty:
            raise HTTPException(status_code=400, detail="Not enough data after indicators.")

        latest_close = df['Close'].iloc[-1]
        sma = df['SMA_50'].iloc[-1]
        ema = df['EMA_20'].iloc[-1]

        predictions = []
        future_dates = pd.date_range(datetime.today(), periods=days)

        for date in future_dates:
            scaled_input = scaler.transform([[0, sma, ema]])[:, 1:3]
            pred_scaled = model.predict(scaled_input)[0]
            pred_close = scaler.inverse_transform([[pred_scaled, sma, ema]])[0][0]
            predictions.append((date.strftime('%Y-%m-%d'), pred_close))
            sma = (sma * 49 + pred_close) / 50
            ema = (ema * 19 + pred_close) / 20

        final_predicted_price = predictions[-1][1]
        predicted_return_pct = ((final_predicted_price - latest_close) / latest_close) * 100

        return {
            "symbol": symbol,
            "days": days,
            "latest_close": round(latest_close, 2),
            "final_prediction": round(final_predicted_price, 2),
            "predicted_return_pct": round(predicted_return_pct, 2),
            "dates": [d[0] for d in predictions],
            "predicted": [round(d[1], 2) for d in predictions]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


# === Historical ===
@router.get("/historical")
def historical(symbol: str = Query("AAPL"), period: str = Query("1y")):
    try:
        end = datetime.today()
        start_map = {
            "1d": end - timedelta(days=2),
            "7d": end - timedelta(days=7),
            "1mo": end - timedelta(days=30),
            "3mo": end - timedelta(days=90),
            "6mo": end - timedelta(days=180),
            "1y": end - timedelta(days=365),
            "3y": end - timedelta(days=3 * 365),
            "5y": end - timedelta(days=5 * 365)
        }
        start = start_map.get(period, end - timedelta(days=365))
        df = yf.download(symbol, start=start, end=end)
        df = df[['Close']].reset_index()
        df['Date'] = pd.to_datetime(df['Date']).dt.strftime('%Y-%m-%d')
        return {"symbol": symbol, "data": df.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === Metrics ===
@router.get("/metrics")
def metrics(symbol: str = Query("AAPL")):
    try:
        model = joblib.load(os.path.join(MODEL_DIR, "rf_model.pkl"))
        scaler = joblib.load(os.path.join(MODEL_DIR, "rf_scaler.pkl"))
        return {
            "model": "Random Forest",
            "symbol": symbol,
            "n_estimators": model.n_estimators,
            "max_depth": model.max_depth,
            "feature_range": scaler.feature_range,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics error: {str(e)}")
