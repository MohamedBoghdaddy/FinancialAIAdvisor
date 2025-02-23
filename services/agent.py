import json
import numpy as np
import requests
from transformers import pipeline
from dotenv import load_dotenv
import os
from tensorflow.keras.models import load_model
from sklearn.preprocessing import MinMaxScaler

load_dotenv("../server/.env")

# Initialize Hugging Face sentiment analysis
sentiment_analysis = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

# Hugging Face API configuration
HF_API_TOKEN = os.getenv('HF_API_TOKEN')
headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}

FORECAST_FILES = {
    'gold': {
        'arima': './GOLD_arima_results.json',
        'prophet': './GOLD_prophet_results.json',
        'lstm': './GOLD_lstm_results.json',
        'model': './Gold_lstm_model.keras'
    },
    'real_estate': {
        'arima': './REAL_forecast_results.json',
        'prophet': './REAL_prophet_results.json',
        'lstm': './REAL_lstm_results.json',
        'model': './Real_Estate_Forecasting.keras'
    }
}

def log(message):
    print(f"DEBUG: {message}")

# Sentiment analysis function
def analyze_user_sentiment(message):
    result = sentiment_analysis(message)
    return result[0]['label']

# Analyze survey data using Hugging Face
def analyze_survey(survey_data):
    response = requests.post(
        "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
        headers=headers,
        json={"inputs": survey_data}
    )
    return response.json()

# Calculate salary allocation recommendation
def calculate_recommendation(salary):
    if salary < 30000:
        return 10
    elif 30000 <= salary < 60000:
        return 15
    elif 60000 <= salary < 100000:
        return 20
    else:
        return 25

# Format currency display
def get_currency_format(amount):
    return "${:,.2f}".format(amount)

# Fetch forecast data from JSON files
def get_forecast(forecast_type):
    files = FORECAST_FILES.get(forecast_type)
    if not files:
        return None

    forecasts = {}

    # Load JSON forecast files
    try:
        with open(files['arima'], 'r') as file:
            forecasts['arima'] = json.load(file)
        with open(files['prophet'], 'r') as file:
            forecasts['prophet'] = json.load(file)
        with open(files['lstm'], 'r') as file:
            forecasts['lstm'] = json.load(file)
    except Exception as e:
        log(f"Error loading forecast JSON files: {e}")
        return None

    # Calculate average predictions
    try:
        arima_pred = np.mean(list(forecasts['arima'].values()))
        prophet_pred = np.mean([x['yhat'] for x in forecasts['prophet']['data'][-30:]])
        lstm_pred = np.mean(forecasts['lstm']['predictions'])

        avg_predicted_growth = np.mean([arima_pred, prophet_pred, lstm_pred])
    except Exception as e:
        log(f"Error calculating average predictions: {e}")
        avg_predicted_growth = None

    return {
        'arima_avg': arima_pred,
        'prophet_avg': prophet_pred,
        'lstm_avg': lstm_pred,
        'predicted_growth': avg_predicted_growth
    }

# Main financial agent integrating all functionalities
def financial_agent(user_message, survey_responses, salary):
    sentiment = analyze_user_sentiment(user_message)
    survey_analysis = analyze_survey(survey_responses)

    # Fetch forecast results from JSON
    forecast_results = {key: get_forecast(key) for key in FORECAST_FILES.keys()}

    # Filter out invalid forecasts
    valid_forecasts = {
        k: v for k, v in forecast_results.items()
        if v is not None and v['predicted_growth'] is not None
    }

    # Determine recommended investment
    if not valid_forecasts:
        recommended_investment = 'savings accounts'
        forecast_details = "No reliable forecast data available."
    else:
        recommended_investment = max(
            valid_forecasts,
            key=lambda k: valid_forecasts[k]['predicted_growth']
        )
        forecast_details = valid_forecasts[recommended_investment]

    allocation_percent = calculate_recommendation(salary)
    investment_amount = salary * allocation_percent / 100

    # Detailed advice message
    advice = (
        f"🤖 Hello! Based on your sentiment ({sentiment.lower()}) and survey responses, "
        f"I recommend investing in {recommended_investment.replace('_', ' ').capitalize()}.\n\n"
        f"📈 **Forecast Details**:\n"
        f"- ARIMA Avg: {forecast_details.get('arima_avg', 'N/A')}\n"
        f"- Prophet Avg: {forecast_details.get('prophet_avg', 'N/A')}\n"
        f"- LSTM Avg: {forecast_details.get('lstm_avg', 'N/A')}\n"
        f"- Predicted Growth: {forecast_details.get('predicted_growth', 'N/A')}\n\n"
        f"💰 Monthly salary: {get_currency_format(salary)}\n"
        f"- Investing: {allocation_percent}% ({get_currency_format(investment_amount)})\n"
        f"- Managing: {100 - allocation_percent}% ({get_currency_format(salary - investment_amount)})\n\n"
        f"Hope this helps! Feel free to ask for more advice or adjustments."
    )

    return advice

def interactive_salary_allocation():
    print("🤖 Welcome to the Financial Advisor AI! 💰\n")

    salary = float(input("📈 Enter your monthly salary amount: $"))
    user_message = input("✉️ What's your financial situation or concern? ")
    survey_responses = input("📝 Briefly describe your investment preferences: ")

    result = financial_agent(user_message, survey_responses, salary)
    print("\n" + result)

if __name__ == "__main__":
    interactive_salary_allocation()
