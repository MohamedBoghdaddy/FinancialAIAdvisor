import json
import pandas as pd
import numpy as np
import datetime
import warnings

from statsmodels.tsa.arima.model import ARIMA
from prophet import Prophet
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import MinMaxScaler
from tensorflow import keras

Sequential = keras.models.Sequential
Dense = keras.layers.Dense
LSTM = keras.layers.LSTM

warnings.filterwarnings('ignore')

# === Logging function ===
def log(message):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] DEBUG: {message}")

# === Load Dataset ===
file_path = './data.csv'
log("Loading gold price dataset...")

try:
    df = pd.read_csv(file_path)
    log("CSV data loaded successfully.")
except Exception as e:
    log(f"Error reading CSV file: {e}")
    exit()

# === Preprocess ===
TARGET_COLUMN = '24K - Global Price'
df = df.dropna(subset=[TARGET_COLUMN])
df.columns = df.columns.str.strip()
df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
df.dropna(subset=['Date'], inplace=True)
df.set_index('Date', inplace=True)
df[TARGET_COLUMN] = df[TARGET_COLUMN].interpolate(method='linear').ffill().bfill()

# === Splits ===
train_size = int(len(df) * 0.7)
val_size = int(len(df) * 0.15)
train = df[TARGET_COLUMN][:train_size]
val = df[TARGET_COLUMN][train_size:train_size + val_size]
test = df[TARGET_COLUMN][train_size + val_size:]

train.to_json("GOLD_train_data.json", orient='split', date_format='iso')
val.to_json("GOLD_validation_data.json", orient='split', date_format='iso')
test.to_json("GOLD_test_data.json", orient='split', date_format='iso')

# === ARIMA ===
log("Running ARIMA...")
arima_model = ARIMA(train, order=(1, 1, 1)).fit()
arima_forecast = arima_model.forecast(steps=len(test))
arima_rmse = np.sqrt(mean_squared_error(test, arima_forecast))
arima_result = {
    "model": "ARIMA",
    "rmse": arima_rmse,
    "predictions": arima_forecast.tolist(),
    "actual": test.tolist()
}
with open('GOLD_arima_results.json', 'w') as f:
    json.dump(arima_result, f)

# === Prophet ===
log("Running Prophet...")
prophet_data = df.reset_index()[['Date', TARGET_COLUMN]].rename(columns={'Date': 'ds', TARGET_COLUMN: 'y'})
prophet_model = Prophet(yearly_seasonality=True)
prophet_model.fit(prophet_data)
future = prophet_model.make_future_dataframe(periods=len(test))
forecast = prophet_model.predict(future)
prophet_preds = forecast['yhat'][-len(test):].values
prophet_rmse = np.sqrt(mean_squared_error(test, prophet_preds))
prophet_result = {
    "model": "Prophet",
    "rmse": prophet_rmse,
    "predictions": prophet_preds.tolist(),
    "actual": test.tolist()
}
with open('GOLD_prophet_results.json', 'w') as f:
    json.dump(prophet_result, f)

# === LSTM ===
log("Running LSTM...")
scaler = MinMaxScaler()
scaled_data = scaler.fit_transform(df[TARGET_COLUMN].values.reshape(-1, 1))
sequence_length = 60

def create_sequences(data, seq_length):
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i + seq_length])
        y.append(data[i + seq_length])
    return np.array(X), np.array(y)

X_all, y_all = create_sequences(scaled_data, sequence_length)
split_1 = train_size - sequence_length
split_2 = train_size + val_size - sequence_length

X_train, y_train = X_all[:split_1], y_all[:split_1]
X_val, y_val = X_all[split_1:split_2], y_all[split_1:split_2]
X_test, y_test = X_all[split_2:], y_all[split_2:]

lstm_model = Sequential([
    LSTM(50, return_sequences=True, input_shape=(sequence_length, 1)),
    LSTM(50),
    Dense(25),
    Dense(1)
])
lstm_model.compile(optimizer='adam', loss='mean_squared_error')
lstm_model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=10, batch_size=32)

lstm_preds_scaled = lstm_model.predict(X_test)
lstm_preds = scaler.inverse_transform(lstm_preds_scaled)
actual_lstm = scaler.inverse_transform(y_test.reshape(-1, 1))
lstm_rmse = np.sqrt(mean_squared_error(actual_lstm, lstm_preds))

lstm_result = {
    "model": "LSTM",
    "rmse": float(lstm_rmse),
    "predictions": lstm_preds.flatten().tolist(),
    "actual": actual_lstm.flatten().tolist()
}
with open('GOLD_lstm_results.json', 'w') as f:
    json.dump(lstm_result, f)

lstm_model.save("GOLD_lstm_model.keras")
log("LSTM model saved successfully.")

# === Determine Best Model ===
model_rmses = {
    "ARIMA": arima_rmse,
    "Prophet": prophet_rmse,
    "LSTM": lstm_rmse
}
best_model = min(model_rmses, key=model_rmses.get)
with open("GOLD_best_model.json", "w") as f:
    json.dump({
        "best_model": best_model,
        "rmses": model_rmses
    }, f)

log(f"✅ Best model: {best_model} with RMSE {model_rmses[best_model]:.4f}")
log("All model results saved.")
