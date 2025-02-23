# main.py
from fastapi import FastAPI
from agent import financial_agent
import subprocess
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env")

app = FastAPI(title="Financial Advisor AI")

# API endpoints for different forecast models
@app.get("/predict/{forecast_type}")
def forecast(forecast_type: str):
    script_mapping = {
        "gold": "Gold_Forecasting.py",
        "real_estate": "Real_Estate_Forecasting.py",
        "stocks": "Stock_Price_Forecasting.py"
    }

    script = script_mapping.get(forecast_type)

    if not script:
        return {"error": "Invalid forecast type"}

    try:
        result = subprocess.run(["python", f"services/{script}"], capture_output=True, text=True, check=True)
        return {"forecast": result.stdout}
    except subprocess.CalledProcessError as e:
        return {"error": e.stderr}



@app.get("/")
def home():
    return {"message": "Financial AI Advisor is running!"}

# Endpoint for financial advice
@app.post("/financial-advice")
def get_advice(user_message: str, survey_responses: str, salary: float):
    advice = financial_agent(user_message, survey_responses, salary)
    return {"advice": advice}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("PORT", 8000)))
