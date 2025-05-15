from fastapi import FastAPI, APIRouter, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import yfinance as yf
import joblib
import os
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler

# === Setup FastAPI app ===
app = FastAPI()
router = APIRouter(prefix="/stock", tags=["Stock"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Config ===
SYMBOLS = [
    "AAPL", "META", "AMZN", "NFLX", "GOOGL",
    "MSFT", "TSLA", "NVDA", "BRK-B", "JPM",
    "V", "JNJ", "WMT", "UNH", "PG"
]
OUTPUT_DIR = "checkpoints"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# === Training Function ===
def train_and_save_model(symbol: str):
    yf_symbol = symbol.replace("-", ".")
    df = yf.download(yf_symbol, start='2014-01-01', end=datetime.today().strftime('%Y-%m-%d'))

    df = df[['Close']].copy().reset_index()
    df.columns = ['Date', 'Close']
    df['SMA_50'] = df['Close'].rolling(window=50).mean()
    df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
    df = df.dropna()

    scaler = MinMaxScaler()
    df_scaled = scaler.fit_transform(df[['Close', 'SMA_50', 'EMA_20']])
    X = df_scaled[:, 1:3]
    y = df_scaled[:, 0]

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)

    joblib.dump(model, os.path.join(OUTPUT_DIR, f"{symbol}_rf_model.pkl"))
    joblib.dump(scaler, os.path.join(OUTPUT_DIR, f"{symbol}_scaler.pkl"))


# === Routes ===
@router.get("/train")
def train_model(symbol: str = Query(...)):
    try:
        train_and_save_model(symbol)
        return {"message": f"{symbol} model trained and saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predict")
def predict(symbol: str = Query("AAPL"), days: int = Query(15, ge=1, le=60)):
    try:
        model_path = os.path.join(OUTPUT_DIR, f"{symbol}_rf_model.pkl")
        scaler_path = os.path.join(OUTPUT_DIR, f"{symbol}_scaler.pkl")

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            raise HTTPException(status_code=404, detail="Model not trained yet.")

        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)

        df = yf.download(symbol, period="6mo")
        df = df[['Close']].copy().reset_index()
        df['SMA_50'] = df['Close'].rolling(window=50).mean()
        df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
        df.dropna(inplace=True)

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

        return {
            "symbol": symbol,
            "days": days,
            "dates": [d[0] for d in predictions],
            "predicted": [round(d[1], 2) for d in predictions]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


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


@router.get("/metrics")
def metrics(symbol: str = Query("AAPL")):
    try:
        model = joblib.load(os.path.join(OUTPUT_DIR, f"{symbol}_rf_model.pkl"))
        scaler = joblib.load(os.path.join(OUTPUT_DIR, f"{symbol}_scaler.pkl"))
        return {
            "model": f"Random Forest - {symbol}",
            "n_estimators": model.n_estimators,
            "max_depth": model.max_depth,
            "feature_range": scaler.feature_range,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics error: {str(e)}")


# ✅ Attach router
app.include_router(router)
