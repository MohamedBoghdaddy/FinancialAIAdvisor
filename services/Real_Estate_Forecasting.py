import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM
from sklearn.preprocessing import MinMaxScaler
import warnings

warnings.filterwarnings('ignore')

# Debug Log
def log(message):
    print(f"DEBUG: {message}")

# Load dataset
file_path = './egypt_House_prices.csv'

log("Loading dataset...")
try:
    # Update to load CSV file
    df = pd.read_csv(file_path)
    log("Dataset loaded successfully.")
except Exception as e:
    print(f"Error reading the CSV file: {e}")
    exit()

# Display dataset structure and initial stats
log("Displaying dataset structure...")
print(df.head())
print(df.info())
print(df.isna().sum())
print(df.describe())

"""## Data Preprocessing"""
log("Preprocessing data...")

# Convert columns to numeric (coerce errors to NaN)
df['Price'] = pd.to_numeric(df['Price'], errors='coerce')
df['Bedrooms'] = pd.to_numeric(df['Bedrooms'], errors='coerce')
df['Bathrooms'] = pd.to_numeric(df['Bathrooms'], errors='coerce')
df['Area'] = pd.to_numeric(df['Area'], errors='coerce')

# Fill missing values for these numeric columns
df['Price'].fillna(df['Price'].mean(), inplace=True)
df['Bedrooms'].fillna(df['Bedrooms'].median(), inplace=True)
df['Bathrooms'].fillna(df['Bathrooms'].median(), inplace=True)
df['Area'].fillna(df['Area'].mean(), inplace=True)

# Check again for any missing values after filling
log(f"Missing values after preprocessing: {df.isna().sum()}")

# Optional: If you want to visualize price trends or any other column (e.g., 'Price')
plt.figure(figsize=(10, 6))
sns.lineplot(data=df, x=df.index, y='Price')  # Adjust 'Price' if necessary
plt.title('Price Trend After Preprocessing')
plt.xlabel('Index')
plt.ylabel('Price')
plt.xticks(rotation=45)
plt.show()
log("Data preprocessing completed successfully. Proceeding to train-test split...")

# Target column for forecasting
house_prices = df['Price']  # Adjust to match the column for house prices

"""### Train-Validate-Test Split"""
log("Splitting data into train, validate, and test sets...")
train_size = int(len(house_prices) * 0.7)  # 70% for training
val_size = int(len(house_prices) * 0.15)   # 15% for validation
train, val, test = (
    house_prices[:train_size],
    house_prices[train_size:train_size + val_size],
    house_prices[train_size + val_size:],
)

"""### ARIMA Forecasting"""
log("ARIMA Forecasting started...")
arima_model = ARIMA(train, order=(1, 1, 1))
arima_fitted = arima_model.fit()
arima_forecast = arima_fitted.forecast(steps=len(test))

# Plot ARIMA results
plt.figure(figsize=(12, 6))
plt.plot(train, label='Train')
plt.plot(val, label='Validation', color='purple')
plt.plot(test, label='Test', color='orange')
plt.plot(test.index, arima_forecast, label='ARIMA Forecast', color='green')
plt.title('ARIMA Forecast')
plt.legend()
plt.show()

# Evaluate ARIMA
arima_mae = mean_absolute_error(test, arima_forecast)
arima_rmse = np.sqrt(mean_squared_error(test, arima_forecast))
arima_r2 = r2_score(test, arima_forecast)
log(f"ARIMA Metrics: MAE={arima_mae}, RMSE={arima_rmse}, R^2={arima_r2}")

"""### SARIMA Forecasting"""
log("SARIMA Forecasting started...")
sarima_model = SARIMAX(train, order=(1, 1, 1), seasonal_order=(1, 1, 1, 12))
sarima_fitted = sarima_model.fit(disp=False)
sarima_forecast = sarima_fitted.forecast(steps=len(test))

# Plot SARIMA results
plt.figure(figsize=(12, 6))
plt.plot(train, label='Train')
plt.plot(val, label='Validation', color='purple')
plt.plot(test, label='Test', color='orange')
plt.plot(test.index, sarima_forecast, label='SARIMA Forecast', color='green')
plt.title('SARIMA Forecast')
plt.legend()
plt.show()

# Evaluate SARIMA
sarima_mae = mean_absolute_error(test, sarima_forecast)
sarima_rmse = np.sqrt(mean_squared_error(test, sarima_forecast))
sarima_r2 = r2_score(test, sarima_forecast)
log(f"SARIMA Metrics: MAE={sarima_mae}, RMSE={sarima_rmse}, R^2={sarima_r2}")

"""### Prophet Forecasting"""
log("Prophet Forecasting started...")

# Ensure proper column names for Prophet (use 'Date' or an appropriate column)
if 'Date' not in df.columns:
    # Assuming the dataset does not have a 'Date' column, create one using the index as a date range
    df['Date'] = pd.date_range(start='2022-01-01', periods=len(df), freq='D')

# Prepare the data for Prophet
prophet_data = df[['Date', 'Price']].rename(columns={'Date': 'ds', 'Price': 'y'})
prophet_model = Prophet(yearly_seasonality=True)
prophet_model.fit(prophet_data)

future = prophet_model.make_future_dataframe(periods=len(test))
prophet_forecast = prophet_model.predict(future)

# Plot Prophet results
fig = prophet_model.plot(prophet_forecast)
plt.title('Prophet Forecast')
plt.show()

# Evaluate Prophet
prophet_pred = prophet_forecast[-len(test):]['yhat'].values
prophet_mae = mean_absolute_error(test, prophet_pred)
prophet_rmse = np.sqrt(mean_squared_error(test, prophet_pred))
prophet_r2 = r2_score(test, prophet_pred)
log(f"Prophet Metrics: MAE={prophet_mae}, RMSE={prophet_rmse}, R^2={prophet_r2}")

"""### LSTM Forecasting"""
log("LSTM Forecasting started...")
scaler = MinMaxScaler(feature_range=(0, 1))
scaled_data = scaler.fit_transform(house_prices.values.reshape(-1, 1))

train_scaled, val_scaled, test_scaled = (
    scaled_data[:train_size],
    scaled_data[train_size:train_size + val_size],
    scaled_data[train_size + val_size:],
)

def create_sequences(data, sequence_length=60):
    X, y = [], []
    for i in range(len(data) - sequence_length):
        X.append(data[i:i + sequence_length])
        y.append(data[i + sequence_length])
    return np.array(X), np.array(y)

sequence_length = 60
X_train, y_train = create_sequences(train_scaled, sequence_length)
X_val, y_val = create_sequences(val_scaled, sequence_length)
X_test, y_test = create_sequences(test_scaled, sequence_length)

# Define and train LSTM model for 10 epochs
lstm_model = Sequential([
    LSTM(50, return_sequences=True, input_shape=(X_train.shape[1], 1)),
    LSTM(50, return_sequences=False),
    Dense(25),
    Dense(1)
])
lstm_model.compile(optimizer='adam', loss='mean_squared_error')
lstm_model.fit(X_train, y_train, validation_data=(X_val, y_val), batch_size=32, epochs=10)

lstm_pred_scaled = lstm_model.predict(X_test)
lstm_pred = scaler.inverse_transform(lstm_pred_scaled)

# Plot LSTM results
plt.figure(figsize=(12, 6))
plt.plot(test.index[sequence_length:], test.values[sequence_length:], label='Test')
plt.plot(test.index[sequence_length:], lstm_pred.flatten(), label='LSTM Forecast', color='green')
plt.title('LSTM Forecast')
plt.legend()
plt.show()

# Evaluate LSTM
lstm_mae = mean_absolute_error(test.values[sequence_length:], lstm_pred.flatten())
lstm_rmse = np.sqrt(mean_squared_error(test.values[sequence_length:], lstm_pred.flatten()))
lstm_r2 = r2_score(test.values[sequence_length:], lstm_pred.flatten())
log(f"LSTM Metrics: MAE={lstm_mae}, RMSE={lstm_rmse}, R^2={lstm_r2}")
