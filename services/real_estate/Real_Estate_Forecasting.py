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
import xgboost as xgb

Sequential = keras.models.Sequential
Dense = keras.layers.Dense
LSTM = keras.layers.LSTM
warnings.filterwarnings('ignore')

def log(message):
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] DEBUG: {message}")

def normalized_evaluation(y_true, y_pred, model_name):
    """Helper function to calculate and log evaluation metrics"""
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    
    log(f"{model_name} Metrics - MAE: {mae:.2f}, RMSE: {rmse:.2f}, R2: {r2:.2f}")
    
    return {
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2,
        "Forecast": y_pred.tolist() if isinstance(y_pred, np.ndarray) else list(y_pred)
    }

def run_xgboost(train_df, test_df, y_train, y_test):
    log("Running XGBoost...")
    # Prepare features - using Days_Since_Start and Area as features
    train_df['Days_Since_Start'] = (train_df.index - train_df.index[0]).days
    test_df['Days_Since_Start'] = (test_df.index - test_df.index[0]).days
    
    X_train = train_df[['Days_Since_Start', 'Area']].fillna(0)
    X_test = test_df[['Days_Since_Start', 'Area']].fillna(0)

    # Train model
    model = xgb.XGBRegressor(objective="reg:squarederror", n_estimators=100)
    model.fit(X_train, y_train)

    # Predict
    test_pred = model.predict(X_test)

    # Evaluate
    metrics = normalized_evaluation(y_test, test_pred, "XGBoost")

    # Compute Predicted Return
    current_price = y_test.iloc[-1]  # Last actual price
    predicted_price = test_pred[-1]  # Last predicted price
    predicted_return = ((predicted_price - current_price) / current_price) * 100

    log(f"Predicted Real Estate Return: {predicted_return:.2f}%")
    metrics["predicted_return"] = f"{predicted_return:.2f}%"

    return metrics

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

# Split the dataframe similarly
train_df = df[:train_size]
val_df = df[train_size:train_size+val_size]
test_df = df[train_size+val_size:]

# === ARIMA
log("Running ARIMA...")
arima_model = ARIMA(train, order=(1,1,1)).fit()
arima_pred = arima_model.forecast(steps=len(test))
arima_metrics = normalized_evaluation(test, arima_pred, "ARIMA")

# === SARIMA
log("Running SARIMA...")
sarima_model = SARIMAX(train, order=(1,1,1), seasonal_order=(1,1,1,12)).fit(disp=False)
sarima_pred = sarima_model.forecast(steps=len(test))
sarima_metrics = normalized_evaluation(test, sarima_pred, "SARIMA")

# === Prophet
log("Running Prophet...")
prophet_data = df.reset_index()[['Date', 'Price']].rename(columns={'Date': 'ds', 'Price': 'y'})
prophet_model = Prophet(yearly_seasonality=True)
prophet_model.fit(prophet_data)
future = prophet_model.make_future_dataframe(periods=len(test))
forecast = prophet_model.predict(future)
prophet_pred = forecast[-len(test):]['yhat'].values
prophet_metrics = normalized_evaluation(test, prophet_pred, "Prophet")

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

lstm_metrics = normalized_evaluation(test.values[60:], predicted.flatten(), "LSTM")

# === XGBoost
xgboost_metrics = run_xgboost(train_df, test_df, train, test)

# === Save Everything
log("Saving metrics and model...")
results = {
    "ARIMA": arima_metrics,
    "SARIMA": sarima_metrics,
    "Prophet": prophet_metrics,
    "LSTM": lstm_metrics,
    "XGBoost": xgboost_metrics
}
with open("REAL_forecast_results.json", "w") as f:
    json.dump(results, f, indent=4)

model.save("REAL_lstm_forecast_model.keras")

# Determine best model
all_models = {
    "ARIMA": arima_metrics['RMSE'],
    "SARIMA": sarima_metrics['RMSE'],
    "Prophet": prophet_metrics['RMSE'],
    "LSTM": lstm_metrics['RMSE'],
    "XGBoost": xgboost_metrics['RMSE']
}
best_model = min(all_models, key=all_models.get)
log(f"✅ Best model: {best_model} with RMSE: {all_models[best_model]:.2f}")
log("All forecasting complete.")