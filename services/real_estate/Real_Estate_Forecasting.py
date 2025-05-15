import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import MinMaxScaler
import warnings
import json
from tensorflow import keras
import datetime

Sequential = keras.models.Sequential
Dense = keras.layers.Dense
LSTM = keras.layers.LSTM
warnings.filterwarnings('ignore')

def log(message):
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] DEBUG: {message}")

log("Loading dataset...")
df = pd.read_csv('./egypt_House_prices.csv')
df['Price'] = pd.to_numeric(df['Price'], errors='coerce')
df['Bedrooms'] = pd.to_numeric(df['Bedrooms'], errors='coerce')
df['Bathrooms'] = pd.to_numeric(df['Bathrooms'], errors='coerce')
df['Area'] = pd.to_numeric(df['Area'], errors='coerce')
df['Price'].fillna(df['Price'].mean(), inplace=True)
df['Bedrooms'].fillna(df['Bedrooms'].median(), inplace=True)
df['Bathrooms'].fillna(df['Bathrooms'].median(), inplace=True)
df['Area'].fillna(df['Area'].mean(), inplace=True)
if 'Date' not in df.columns:
    df['Date'] = pd.date_range(start='2022-01-01', periods=len(df), freq='D')
df.set_index('Date', inplace=True)

target = df['Price']
train_size = int(len(target) * 0.7)
val_size = int(len(target) * 0.15)
train, val, test = target[:train_size], target[train_size:train_size+val_size], target[train_size+val_size:]

# === ARIMA
log("Running ARIMA...")
arima_model = ARIMA(train, order=(1,1,1)).fit()
arima_pred = arima_model.forecast(steps=len(test))
arima_metrics = {
    "MAE": mean_absolute_error(test, arima_pred),
    "RMSE": np.sqrt(mean_squared_error(test, arima_pred)),
    "R2": r2_score(test, arima_pred),
    "Forecast": arima_pred.tolist()
}

# === SARIMA
log("Running SARIMA...")
sarima_model = SARIMAX(train, order=(1,1,1), seasonal_order=(1,1,1,12)).fit(disp=False)
sarima_pred = sarima_model.forecast(steps=len(test))
sarima_metrics = {
    "MAE": mean_absolute_error(test, sarima_pred),
    "RMSE": np.sqrt(mean_squared_error(test, sarima_pred)),
    "R2": r2_score(test, sarima_pred),
    "Forecast": sarima_pred.tolist()
}

# === Prophet
log("Running Prophet...")
prophet_data = df.reset_index()[['Date', 'Price']].rename(columns={'Date': 'ds', 'Price': 'y'})
prophet_model = Prophet(yearly_seasonality=True)
prophet_model.fit(prophet_data)
future = prophet_model.make_future_dataframe(periods=len(test))
forecast = prophet_model.predict(future)
prophet_pred = forecast[-len(test):]['yhat'].values
prophet_metrics = {
    "MAE": mean_absolute_error(test, prophet_pred),
    "RMSE": np.sqrt(mean_squared_error(test, prophet_pred)),
    "R2": r2_score(test, prophet_pred),
    "Forecast": prophet_pred.tolist()
}

# === LSTM
log("Running LSTM...")
scaler = MinMaxScaler()
scaled = scaler.fit_transform(target.values.reshape(-1,1))
train_scaled = scaled[:train_size]
val_scaled = scaled[train_size:train_size+val_size]
test_scaled = scaled[train_size+val_size:]

def create_seq(data, seq_len=60):
    X, y = [], []
    for i in range(len(data)-seq_len):
        X.append(data[i:i+seq_len])
        y.append(data[i+seq_len])
    return np.array(X), np.array(y)

X_train, y_train = create_seq(train_scaled)
X_val, y_val = create_seq(val_scaled)
X_test, y_test = create_seq(test_scaled)

model = Sequential([
    LSTM(50, return_sequences=True, input_shape=(X_train.shape[1], 1)),
    LSTM(50),
    Dense(25),
    Dense(1)
])
model.compile(optimizer='adam', loss='mean_squared_error')
model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=10, batch_size=32)
pred_scaled = model.predict(X_test)
predicted = scaler.inverse_transform(pred_scaled)

lstm_metrics = {
    "MAE": mean_absolute_error(test.values[60:], predicted.flatten()),
    "RMSE": np.sqrt(mean_squared_error(test.values[60:], predicted.flatten())),
    "R2": r2_score(test.values[60:], predicted.flatten()),
    "Forecast": predicted.flatten().tolist()
}

# === Save Everything
log("Saving metrics and model...")
results = {
    "ARIMA": arima_metrics,
    "SARIMA": sarima_metrics,
    "Prophet": prophet_metrics,
    "LSTM": lstm_metrics
}
with open("REAL_forecast_results.json", "w") as f:
    json.dump(results, f, indent=4)

model.save("REAL_lstm_forecast_model.keras")
log(f"✅ Best model: {'LSTM' if lstm_metrics['RMSE'] == min([arima_metrics['RMSE'], sarima_metrics['RMSE'], prophet_metrics['RMSE'], lstm_metrics['RMSE']]) else 'Unknown'}")
log("All forecasting complete.")
