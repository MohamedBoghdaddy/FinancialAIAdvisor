from flask import Blueprint, request, jsonify
import google.generativeai as genai
import json
import os

# ✅ Define Blueprint
chatbot_bp = Blueprint("chatbot", __name__)

# ✅ Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

# ✅ Utility: Load AI model predictions and volatility
def load_ai_insights():
    try:
        with open("ai_insights.json", "r") as f:
            data = json.load(f)
        return data.get("predicted_returns", {}), data.get("market_volatility", {})
    except Exception as e:
        print("❌ Failed to load AI insights:", e)
        return {}, {}

# ✅ Free-style chat endpoint (any financial question)
@chatbot_bp.route("/chat", methods=["POST"])
def chat_with_bot():
    try:
        data = request.get_json()
        user_message = data.get("message", "")
        profile = data.get("profile", {})

        prompt = f"""
You are an AI financial advisor.

🛑 If the user's question is not related to personal finance, budgeting, saving, investing, or financial planning,
respond ONLY with:
"I'm a financial advisor, so I can't help you with that topic. Please ask me something about your finances."

✅ Otherwise, respond as a warm, expert financial coach using the profile below.

User Message:
"{user_message}"

User Profile:
{json.dumps(profile, indent=2)}

❌ Never use JSON, markdown, or bullet points.
✅ Only reply with full-text natural human-like advice.
"""

        response = model.generate_content(prompt)
        return jsonify({"output": response.text.strip()})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Structured prompt builder for goal-specific planning
def build_prompt(user_input, goal):
    # Inject predictions if missing
    if "modelPredictions" not in user_input or "marketVolatility" not in user_input:
        predictions, volatility = load_ai_insights()
        user_input["modelPredictions"] = predictions
        user_input["marketVolatility"] = volatility

    # Extract profile data
    income = user_input.get("salary", "0")
    utilities = user_input.get("utilities", "0")
    diet = user_input.get("dietPlan", "Not Provided")
    transport = user_input.get("transportCost", "0")
    recurring = user_input.get("otherRecurring", "None")
    custom_expenses = user_input.get("customExpenses", [])
    predictions = user_input.get("modelPredictions", {})
    volatility = user_input.get("marketVolatility", {})
    lifestyle = user_input.get("lifestyle", "Not Provided")
    risk_tolerance = user_input.get("riskTolerance", "N/A")
    dependents = user_input.get("dependents", "Not Provided")
    goals = user_input.get("financialGoals", "Not Provided")
    home = user_input.get("homeOwnership", "Not Provided")

    prompt = (
        "🛑 IMPORTANT: You are a financial advisor AI.\n"
        "If the user's question is NOT related to financial planning, budgeting, saving, or investments,\n"
        "then respond with: \"I'm a financial advisor, so I can’t help you with that topic. Please ask me something about your finances.\"\n\n"

        "Otherwise, continue with the following instructions:\n\n"

        "STEP 1 — Assess user's financial health:\n"
        "- Are they overspending?\n"
        "- Can they afford to invest?\n"
        "- What is their risk tolerance?\n\n"

        "STEP 2 — Provide advice based on goal:\n"

        "👉 If goal is 'investment':\n"
        "- Recommend ONLY ONE: stocks, gold, OR real estate (no comparisons).\n"
        "- Base your decision on income, expenses, savings, risk score, and predicted returns.\n\n"

        "👉 If goal is 'life_management':\n"
        "- Share 3 practical money management tips (saving, budgeting, cutting costs).\n\n"

        "✅ Respond like a real human advisor.\n"
        "❌ NEVER use markdown, code, or bullet points.\n\n"

        f"User Goal: {goal}\n\n"
        f"- Salary: {income} EGP\n"
        f"- Home Ownership: {home}\n"
        f"- Utilities: {utilities} EGP\n"
        f"- Diet: {diet}\n"
        f"- Transport: {transport} EGP\n"
        f"- Other Recurring Expenses: {recurring}\n"
        f"- Lifestyle: {lifestyle}\n"
        f"- Risk Tolerance: {risk_tolerance}/10\n"
        f"- Dependents: {dependents}\n"
        f"- Goals: {goals}\n"
        "Custom Expenses:\n" +
        "".join([f"  - {e.get('name', 'Unknown')}: {e.get('amount', 0)} EGP\n" for e in custom_expenses]) +
        "\nPredicted Returns:\n" +
        "".join([f"- {k.capitalize()}: {v}\n" for k, v in predictions.items()]) +
        "\nMarket Volatility:\n" +
        "".join([f"- {k.capitalize()}: {v}\n" for k, v in volatility.items()]) +
        "\n\nGive your recommendation now:"
    )

    return prompt

# ✅ Investment or life management advice endpoint
@chatbot_bp.route("/generate/<goal>", methods=["POST"])
def generate_advice(goal):
    try:
        user_input = request.get_json()
        prompt = build_prompt(user_input, goal)
        response = model.generate_content(prompt)
        return response.text.strip(), 200, {"Content-Type": "text/plain"}
    except Exception as e:
        return jsonify({"error": str(e)}), 500
