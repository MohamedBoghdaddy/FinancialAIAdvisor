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

# Debug Log function to track progress and errors
def log(message):
    print(f"DEBUG: {message}")

# Load dataset with exception handling
file_path = './data.csv'  # Change to the gold price dataset file path
log("Loading gold price dataset...")

try:
    df = pd.read_csv(file_path)
    log("CSV data loaded successfully.")
except Exception as e:
    log(f"Error reading CSV file: {e}")
    exit()

# Dataset structure and initial stats with exception handling
log("Displaying dataset structure...")
try:
    print(df.columns)  # where df is your DataFrame
    print(df.head())
    print(df.info())
    print(df.isna().sum())
    print(df.describe())
except Exception as e:
    log(f"Error displaying dataset information: {e}")
    exit()

# Select the target column for forecasting (adjust as necessary)
target_column = '24K - Global Price'  # Adjust this to the relevant column
log(f"Using {target_column} for forecasting")

# Drop rows with missing target column values
df = df.dropna(subset=[target_column])

# Data Preprocessing with exception handling
log("Preprocessing gold price data...")
try:
    # Clean up column names (strip spaces)
    df.columns = df.columns.str.strip()
    
    # Convert 'Date' to datetime format and handle errors
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    
    # Drop rows with invalid dates
    df = df.dropna(subset=['Date'])
    
    # Set 'Date' as the index
    df.set_index('Date', inplace=True)
    
    # Interpolate missing values (only for non-target columns, if needed)
    df[target_column] = df[target_column].interpolate(method='linear')
    
    if df.isna().sum().any():
        log("Warning: Missing values remain after interpolation.")
except Exception as e:
    log(f"Error during data preprocessing: {e}")
    exit()

# Visualize data after preprocessing
try:
    plt.figure(figsize=(10, 6))
    sns.lineplot(data=df, x=df.index, y='GOLDPRICE')  # Replace 'GOLDPRICE' with actual price column name
    plt.title('Gold Price Trend After Preprocessing')
    plt.xlabel('Date')
    plt.ylabel('Gold Price (USD)')
    plt.xticks(rotation=45)
    plt.show()
    log("Gold price data preprocessing completed successfully.")
except Exception as e:
    log(f"Error visualizing data: {e}")
    exit()

# Target column for forecasting
gold_prices = df['GOLDPRICE']  # Adjust the target column name accordingly

# Train-Validate-Test Split with exception handling
log("Splitting gold price data into train, validate, and test sets...")
try:
    train_size = int(len(gold_prices) * 0.7)  # 70% for training
    val_size = int(len(gold_prices) * 0.15)   # 15% for validation
    test_size = len(gold_prices) - train_size - val_size  # Remaining for testing
    train, val, test = (
        gold_prices[:train_size],
        gold_prices[train_size:train_size + val_size],
        gold_prices[train_size + val_size:],
    )
except Exception as e:
    log(f"Error splitting data: {e}")
    exit()

# ARIMA Forecasting with exception handling
log("ARIMA Forecasting for gold prices started...")
try:
    arima_model = ARIMA(train, order=(1, 1, 1))
    arima_fitted = arima_model.fit()
    arima_forecast = arima_fitted.forecast(steps=len(test))

    # Plot ARIMA results
    plt.figure(figsize=(12, 6))
    plt.plot(train, label='Train')
    plt.plot(val, label='Validation', color='purple')
    plt.plot(test, label='Test', color='orange')
    plt.plot(test.index, arima_forecast, label='ARIMA Forecast', color='green')
    plt.title('ARIMA Gold Price Forecast')
    plt.legend()
    plt.show()

    # Evaluate ARIMA
    arima_mae = mean_absolute_error(test, arima_forecast)
    arima_rmse = np.sqrt(mean_squared_error(test, arima_forecast))
    arima_r2 = r2_score(test, arima_forecast)
    log(f"ARIMA Gold Price Metrics: MAE={arima_mae}, RMSE={arima_rmse}, R^2={arima_r2}")
except Exception as e:
    log(f"Error during ARIMA forecasting: {e}")
    exit()

# SARIMA Forecasting with exception handling
log("SARIMA Forecasting for gold prices started...")
try:
    sarima_model = SARIMAX(train, order=(1, 1, 1), seasonal_order=(1, 1, 1, 12))
    sarima_fitted = sarima_model.fit(disp=False)
    sarima_forecast = sarima_fitted.forecast(steps=len(test))

    # Plot SARIMA results
    plt.figure(figsize=(12, 6))
    plt.plot(train, label='Train')
    plt.plot(val, label='Validation', color='purple')
    plt.plot(test, label='Test', color='orange')
    plt.plot(test.index, sarima_forecast, label='SARIMA Forecast', color='green')
    plt.title('SARIMA Gold Price Forecast')
    plt.legend()
    plt.show()

    # Evaluate SARIMA
    sarima_mae = mean_absolute_error(test, sarima_forecast)
    sarima_rmse = np.sqrt(mean_squared_error(test, sarima_forecast))
    sarima_r2 = r2_score(test, sarima_forecast)
    log(f"SARIMA Gold Price Metrics: MAE={sarima_mae}, RMSE={sarima_rmse}, R^2={sarima_r2}")
except Exception as e:
    log(f"Error during SARIMA forecasting: {e}")
    exit()

# Prophet Forecasting with exception handling
log("Prophet Forecasting for gold prices started...")
try:
    prophet_data = df.reset_index()[['DATE', 'GOLDPRICE']].rename(columns={'DATE': 'ds', 'GOLDPRICE': 'y'})
    prophet_model = Prophet(yearly_seasonality=True)
    prophet_model.fit(prophet_data)

    future = prophet_model.make_future_dataframe(periods=len(test))
    prophet_forecast = prophet_model.predict(future)

    # Plot Prophet results
    fig = prophet_model.plot(prophet_forecast)
    plt.title('Prophet Gold Price Forecast')
    plt.show()

    # Evaluate Prophet
    prophet_pred = prophet_forecast[-len(test):]['yhat'].values
    prophet_mae = mean_absolute_error(test, prophet_pred)
    prophet_rmse = np.sqrt(mean_squared_error(test, prophet_pred))
    prophet_r2 = r2_score(test, prophet_pred)
    log(f"Prophet Gold Price Metrics: MAE={prophet_mae}, RMSE={prophet_rmse}, R^2={prophet_r2}")
except Exception as e:
    log(f"Error during Prophet forecasting: {e}")
    exit()

# LSTM Forecasting with exception handling
log("LSTM Forecasting for gold prices started...")
try:
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(gold_prices.values.reshape(-1, 1))

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
    plt.plot(gold_prices.index[-len(test):], test, label='Test Data', color='orange')
    plt.plot(gold_prices.index[-len(test):], lstm_pred, label='LSTM Forecast', color='green')
    plt.title('LSTM Gold Price Forecast')
    plt.legend()
    plt.show()

    # Evaluate LSTM
    lstm_mae = mean_absolute_error(test, lstm_pred)
    lstm_rmse = np.sqrt(mean_squared_error(test, lstm_pred))
    lstm_r2 = r2_score(test, lstm_pred)
    log(f"LSTM Gold Price Metrics: MAE={lstm_mae}, RMSE={lstm_rmse}, R^2={lstm_r2}")
except Exception as e:
    log(f"Error during LSTM forecasting: {e}")
    exit()

log("All models evaluated successfully.")
