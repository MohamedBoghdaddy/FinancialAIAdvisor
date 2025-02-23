import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.tsa.arima.model import ARIMA
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import MinMaxScaler
import warnings
import datetime

from tensorflow import keras

Sequential = keras.models.Sequential
Dense = keras.layers.Dense
LSTM = keras.layers.LSTM

warnings.filterwarnings('ignore')

# Logging function
def log(message):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] DEBUG: {message}")

# Load dataset
file_path = './data.csv'
log("Loading gold price dataset...")

try:
    df = pd.read_csv(file_path)
    log("CSV data loaded successfully.")
except Exception as e:
    log(f"Error reading CSV file: {e}")
    exit()

# Select the target column
TARGET_COLUMN = '24K - Global Price'

# Data Preprocessing
df = df.dropna(subset=[TARGET_COLUMN])
df.columns = df.columns.str.strip()
df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
df.dropna(subset=['Date'], inplace=True)
df.set_index('Date', inplace=True)
df[TARGET_COLUMN] = df[TARGET_COLUMN].interpolate(method='linear').ffill().bfill()

# Train-Validation-Test Split
train_size = int(len(df) * 0.7)
val_size = int(len(df) * 0.15)
train = df[TARGET_COLUMN][:train_size]
val = df[TARGET_COLUMN][train_size:train_size + val_size]
test = df[TARGET_COLUMN][train_size + val_size:]

# Save data splits as JSON
train.to_json("GOLD_train_data.json", orient='split', date_format='iso')
val.to_json("GOLD_validation_data.json", orient='split', date_format='iso')
test.to_json("GOLD_test_data.json", orient='split', date_format='iso')

log("Data splits saved as JSON.")

# ARIMA Forecasting
log("Running ARIMA...")
arima_model = ARIMA(train, order=(1, 1, 1)).fit()
arima_forecast = arima_model.forecast(steps=len(test))

# Save ARIMA results
arima_results = arima_forecast.to_json()
with open('GOLD_arima_results.json', 'w') as f:
    f.write(arima_results)

# Prophet Forecasting
log("Running Prophet...")
prophet_data = df.reset_index()[['Date', TARGET_COLUMN]].rename(columns={'Date': 'ds', TARGET_COLUMN: 'y'})
prophet_model = Prophet(yearly_seasonality=True)
prophet_model.fit(prophet_data)
future = prophet_model.make_future_dataframe(periods=len(test))
prophet_forecast = prophet_model.predict(future)

# Save Prophet results
prophet_forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].to_json('GOLD_prophet_results.json', date_format='iso')

# LSTM Forecasting
log("Running LSTM...")
scaler = MinMaxScaler(feature_range=(0, 1))
scaled_data = scaler.fit_transform(df[TARGET_COLUMN].values.reshape(-1, 1))
sequence_length = 60

# Function to create sequences
def create_sequences(data, seq_length):
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i + seq_length])
        y.append(data[i + seq_length])
    return np.array(X), np.array(y)

X_train, y_train = create_sequences(scaled_data[:train_size], sequence_length)
X_val, y_val = create_sequences(scaled_data[train_size:train_size + val_size], sequence_length)
X_test, y_test = create_sequences(scaled_data[train_size + val_size:], sequence_length)

lstm_model = Sequential([
    LSTM(50, return_sequences=True, input_shape=(sequence_length, 1)),
    LSTM(50, return_sequences=False),
    Dense(25),
    Dense(1)
])
lstm_model.compile(optimizer='adam', loss='mean_squared_error')
lstm_model.fit(X_train, y_train, validation_data=(X_val, y_val), batch_size=32, epochs=10)

lstm_pred_scaled = lstm_model.predict(X_test)
lstm_pred = scaler.inverse_transform(lstm_pred_scaled)

# Save LSTM results
lstm_results = {'predictions': lstm_pred.flatten().tolist(), 'actual': test[sequence_length:].tolist()}
with open('GOLD_lstm_results.json', 'w') as f:
    json.dump(lstm_results, f)

# Save LSTM model
lstm_model.save('GOLD_lstm_model.keras')
log("LSTM model saved successfully.")

log("All models completed and results saved successfully.")