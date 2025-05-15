# stock_router.py

from fastapi import APIRouter, HTTPException, Query
import pandas as pd
import yfinance as yf
import joblib
import os
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler

router = APIRouter(prefix="/stock", tags=["Stock Forecasting"])

# === Config ===
SYMBOLS = [
    "AAPL", "META", "AMZN", "NFLX", "GOOGL",
    "MSFT", "TSLA", "NVDA", "BRK-B", "JPM",
    "V", "JNJ", "WMT", "UNH", "PG"
]
OUTPUT_DIR = "checkpoints"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# === Helper: Train and Save Model ===
def train_and_save_model(symbol: str):
    yf_symbol = symbol.replace("-", ".")
    df = yf.download(yf_symbol, start='2014-01-01', end=datetime.today().strftime('%Y-%m-%d'), progress=False)

    if df.empty or "Close" not in df.columns:
        raise ValueError("Invalid or missing data")

    df = df[["Close"]].copy().reset_index()
    df.columns = ["Date", "Close"]
    df["SMA_50"] = df["Close"].rolling(window=50).mean()
    df["EMA_20"] = df["Close"].ewm(span=20, adjust=False).mean()
    df.dropna(inplace=True)

    scaler = MinMaxScaler()
    df_scaled = scaler.fit_transform(df[["Close", "SMA_50", "EMA_20"]])
    X = df_scaled[:, 1:3]
    y = df_scaled[:, 0]

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)

    joblib.dump(model, os.path.join(OUTPUT_DIR, f"{symbol}_model.pkl"))
    joblib.dump(scaler, os.path.join(OUTPUT_DIR, f"{symbol}_scaler.pkl"))

    # Forecast next 15 days
    sma, ema = df["SMA_50"].iloc[-1], df["EMA_20"].iloc[-1]
    future_dates = pd.date_range(datetime.today(), periods=15)
    preds = []

    for date in future_dates:
        scaled_input = scaler.transform([[0, sma, ema]])[:, 1:3]
        pred_scaled = model.predict(scaled_input)[0]
        pred_close = scaler.inverse_transform([[pred_scaled, sma, ema]])[0][0]
        preds.append((date.strftime('%Y-%m-%d'), pred_close))
        sma = (sma * 49 + pred_close) / 50
        ema = (ema * 19 + pred_close) / 20

    pd.DataFrame(preds, columns=["Date", "Predicted"]).to_csv(
        os.path.join(OUTPUT_DIR, f"{symbol}_forecast.csv"), index=False
    )

# === API Endpoints ===
@router.get("/")
def root():
    return {"message": "✅ Stock Forecasting API Ready"}

@router.post("/train")
def train(symbol: str = Query(..., description="Stock symbol (e.g., AAPL)")):
    try:
        train_and_save_model(symbol)
        return {"message": f"{symbol} model trained and saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predict")
def predict(symbol: str = Query("AAPL")):
    try:
        path = os.path.join(OUTPUT_DIR, f"{symbol}_forecast.csv")
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="No forecast found. Please train the model first.")

        df = pd.read_csv(path)
        return {
            "symbol": symbol,
            "dates": df["Date"].tolist(),
            "predicted": df["Predicted"].tolist(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {e}")

@router.get("/historical")
def historical(symbol: str = Query("AAPL"), period: str = Query("1y", enum=["1d", "7d", "1mo", "3mo", "6mo", "1y", "3y", "5y"])):
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
            "5y": end - timedelta(days=5 * 365),
        }
        start = start_map[period]
        df = yf.download(symbol, start=start, end=end, progress=False)

        if df.empty:
            raise HTTPException(status_code=404, detail="No historical data found")

        df = df[["Close"]].reset_index()
        df["Date"] = pd.to_datetime(df["Date"]).dt.strftime('%Y-%m-%d')
        return {"symbol": symbol, "data": df.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Historical fetch failed: {e}")

@router.get("/metrics")
def metrics(symbol: str = Query("AAPL")):
    try:
        model_path = os.path.join(OUTPUT_DIR, f"{symbol}_model.pkl")
        scaler_path = os.path.join(OUTPUT_DIR, f"{symbol}_scaler.pkl")

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            raise HTTPException(status_code=404, detail="Model or scaler not found.")

        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)

        return {
            "symbol": symbol,
            "model_type": "RandomForestRegressor",
            "n_estimators": model.n_estimators,
            "feature_range": scaler.feature_range,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics fetch failed: {e}")
