from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import json

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# ✅ Configure Gemini
genai.configure(api_key="AIzaSyByzGIAbMmpEz8BaI9FTx6LTBfmBVFouTk")
model = genai.GenerativeModel("gemini-1.5-flash")


def build_prompt(user_input, goal):
    income = user_input.get("income", "0")
    rent = user_input.get("rent", "0")
    utilities = user_input.get("utilities", "0")
    diet = user_input.get("dietPlan", "Not Provided")
    transport = user_input.get("transportCost", "0")
    recurring = user_input.get("otherRecurring", "None")
    savings = user_input.get("savingAmount", "0")
    custom_expenses = user_input.get("customExpenses", [])
    predictions = user_input.get("modelPredictions", {})
    volatility = user_input.get("marketVolatility", {})

    prompt = (
        "You are a professional financial advisor trained on user profiles, market data (stocks, gold, real estate), and behavioral economics.\n\n"
        "Your task is to analyze the user’s financial profile and return advice **only** based on their selected goal.\n\n"
        "Use predicted investment returns and market volatility to guide asset selection (gold, stocks, real estate).\n"
        "Responses must be realistic, actionable, and tailored to the user.\n\n"
        "Respond in valid **JSON format only**.\n\n"
        "User Profile:\n"
        f"- Monthly Income: {income} EGP\n"
        f"- Rent: {rent} EGP\n"
        f"- Utilities: {utilities} EGP\n"
        f"- Diet Plan: {diet}\n"
        f"- Transportation Cost: {transport} EGP\n"
        f"- Other Recurring Expenses: {recurring}\n"
        f"- Monthly Savings: {savings} EGP\n"
        "Custom Expenses:\n" +
        "".join([f"  - {e.get('name', '')}: {e.get('amount', '')} EGP\n" for e in custom_expenses]) +
        "\nPredicted Investment Returns:\n" +
        "".join([f"- {asset}: {value}\n" for asset, value in predictions.items()]) +
        "\nMarket Volatility:\n" +
        "".join([f"- {asset}: Variance = {value}\n" for asset, value in volatility.items()]) +
        f"\n\nUser Goal: {goal}\n\n"
        "### Respond only in this JSON format:\n"
        "{\n"
        "  \"investment_plan\": [\"...\"],\n"
        "  \"life_plan\": [\"...\"]\n"
        "}\n"
        f"Only include the section(s) based on the user's goal: '{goal}'."
    )
    return prompt

@app.route("/generate/investment", methods=["POST"])
def generate_investment():
    return generate_advice(goal="investment")

@app.route("/generate/life", methods=["POST"])
def generate_life():
    return generate_advice(goal="life_management")

def generate_advice(goal):
    try:
        user_input = request.get_json()
        prompt = build_prompt(user_input, goal)
        response = model.generate_content(prompt)
        result_text = response.text

        try:
            cleaned = result_text.strip().removeprefix("```json").removesuffix("```").strip()
            result_json = json.loads(cleaned)
            return jsonify(result_json)
        except json.JSONDecodeError:
            return jsonify({"output": result_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001)
