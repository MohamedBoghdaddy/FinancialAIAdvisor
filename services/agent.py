from flask import Flask, request, jsonify
import json
import numpy as np
import requests
from transformers import pipeline
from dotenv import load_dotenv
import os
from pymongo import MongoClient

# 🔹 Load Environment Variables
load_dotenv("../server/.env")

# 🔹 Initialize Flask App
app = Flask(__name__)

# 🔹 Initialize MongoDB
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["financial_ai"]
users_collection = db["users"]
chats_collection = db["chats"]
questionnaire_collection = db["questionnairemodels"]

# 🔹 Initialize Sentiment Analysis
sentiment_analysis = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

# 🔹 Investment Forecast Data Files
FORECAST_FILES = {
    "gold": "./GOLD_forecast.json",
    "real_estate": "./REAL_forecast.json",
}

# ✅ **Utility: Fetch User Chat History**
def fetch_user_chats(user_id):
    chats = chats_collection.find({"userId": user_id})
    return [chat["message"] for chat in chats] if chats else []

# ✅ **Utility: Fetch User's Questionnaire Data**
def fetch_user_survey(user_id):
    survey_data = questionnaire_collection.find_one({"userId": user_id})
    return survey_data.get("responses", "No survey data found.") if survey_data else "No survey data found."

# ✅ **Utility: Sentiment Analysis**
def analyze_sentiment(text_data):
    """ Performs sentiment analysis on user chat or survey responses """
    if not text_data:
        return "Neutral"  # Default sentiment if there's no text

    text_data = " ".join(text_data) if isinstance(text_data, list) else text_data
    result = sentiment_analysis(text_data)
    return result[0]["label"] if result else "Neutral"

# ✅ **Utility: Financial Forecasting**
def get_forecast(forecast_type):
    """ Fetches financial predictions from stored JSON files """
    forecast_file = FORECAST_FILES.get(forecast_type)

    if not forecast_file:
        return None

    try:
        with open(forecast_file, "r") as file:
            forecast_data = json.load(file)

        avg_growth = np.mean([x["yhat"] for x in forecast_data.get("data", [])[-30:]])
        return {"predicted_growth": avg_growth}
    except Exception as e:
        print(f"⚠️ Error loading forecast for {forecast_type}: {e}")
        return {"predicted_growth": None}

# ✅ **Utility: Calculate Investment Allocation Based on Salary**
def calculate_recommendation(salary):
    if salary < 30000:
        return 10
    elif 30000 <= salary < 60000:
        return 15
    elif 60000 <= salary < 100000:
        return 20
    else:
        return 25

# ✅ **Main API: Financial AI Advisor**
@app.route("/api/user", methods=["POST"])
def financial_agent():
    """ Analyzes user data and provides financial advice """

    try:
        data = request.get_json()
        user_id = data.get("userId")
        salary = data.get("salary")

        if not user_id or not salary:
            return jsonify({"error": "Missing userId or salary"}), 400

        # 🔹 Fetch User Data
        chat_history = fetch_user_chats(user_id)
        survey_responses = fetch_user_survey(user_id)

        # 🔹 Analyze Sentiment
        chat_sentiment = analyze_sentiment(chat_history)
        survey_sentiment = analyze_sentiment(survey_responses)

        # 🔹 Get Financial Forecasts
        forecast_results = {key: get_forecast(key) for key in FORECAST_FILES.keys()}
        valid_forecasts = {k: v for k, v in forecast_results.items() if v["predicted_growth"] is not None}

        # 🔹 Determine Best Investment
        recommended_investment = max(valid_forecasts, key=lambda k: valid_forecasts[k]["predicted_growth"], default="savings accounts")

        # 🔹 Investment Allocation
        allocation_percent = calculate_recommendation(salary)
        investment_amount = salary * allocation_percent / 100

        # 🔹 Construct AI Response
        response = {
            "sentiment_analysis": {
                "chat_history": chat_sentiment,
                "survey": survey_sentiment,
            },
            "investment_recommendation": recommended_investment.replace("_", " ").capitalize(),
            "investment_allocation": {
                "total_salary": salary,
                "recommended_percent": allocation_percent,
                "investment_amount": investment_amount,
                "remaining_budget": salary - investment_amount,
            },
        }

        return jsonify(response)
    except Exception as e:
        print(f"⚠️ API Error: {e}")
        return jsonify({"error": "Internal server error"}), 500

# ✅ **Chatbot API: AI Financial Chat**
@app.route("/api/chat", methods=["POST"])
def chat_with_ai():
    """ Handles AI Chat Responses for Financial Queries """
    
    try:
        data = request.get_json()
        user_id = data.get("userId")
        salary = data.get("salary")
        user_message = data.get("message")

        if not user_id or not salary or not user_message:
            return jsonify({"error": "Missing userId, salary, or message"}), 400

        # 🔹 Save Chat to MongoDB
        chats_collection.insert_one({
            "userId": user_id,
            "message": user_message,
            "role": "user"
        })

        # 🔹 Analyze Sentiment
        sentiment_result = analyze_sentiment(user_message)

        # 🔹 Generate AI Response
        if "investment" in user_message.lower():
            forecast_results = {key: get_forecast(key) for key in FORECAST_FILES.keys()}
            valid_forecasts = {k: v for k, v in forecast_results.items() if v["predicted_growth"] is not None}
            recommended_investment = max(valid_forecasts, key=lambda k: valid_forecasts[k]["predicted_growth"], default="savings accounts")
            ai_response = f"Based on financial trends, I suggest looking into **{recommended_investment.replace('_', ' ')}** investments."
        else:
            ai_response = "I can help with financial advice! Try asking about investments, savings, or budgeting."

        # 🔹 Save AI Response
        chats_collection.insert_one({
            "userId": user_id,
            "message": ai_response,
            "role": "ai"
        })

        return jsonify({"response": ai_response, "sentiment": sentiment_result})

    except Exception as e:
        print(f"⚠️ Chat API Error: {e}")
        return jsonify({"error": "Internal server error"}), 500

# ✅ **Home Route for Testing**
@app.route("/")
def home():
    return jsonify({"message": "Financial AI Advisor API is running!"})

# ✅ **Run the Flask Server**
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)

