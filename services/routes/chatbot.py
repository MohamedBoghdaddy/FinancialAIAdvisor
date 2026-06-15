"""Gemini-backed financial chat assistant.

Converted from a Flask Blueprint to a FastAPI APIRouter so it can be mounted
directly on the FastAPI app in main.py (the previous Flask Blueprint could
not be registered via app.include_router and would crash on startup).
"""
import json
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["Chatbot"])

DISCLAIMER = (
    "This information is for educational and planning purposes only and is "
    "not financial advice. Consult a licensed financial advisor before "
    "making investment decisions."
)

_genai_model = None


def _get_genai_model():
    """Lazily configure and return the Gemini model, or None if unavailable."""
    global _genai_model
    if _genai_model is not None:
        return _genai_model

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    import google.generativeai as genai

    genai.configure(api_key=api_key)
    _genai_model = genai.GenerativeModel("gemini-1.5-flash")
    return _genai_model


def load_ai_insights():
    """Load cached model predictions / volatility, if available."""
    try:
        with open("ai_insights.json", "r") as f:
            data = json.load(f)
        return data.get("predicted_returns", {}), data.get("market_volatility", {})
    except Exception:
        return {}, {}


class ChatRequest(BaseModel):
    message: str
    profile: dict = {}


@router.post("/chat")
def chat_with_bot(payload: ChatRequest):
    model = _get_genai_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Chat assistant is not configured (missing GEMINI_API_KEY).",
        )

    prompt = f"""
You are an AI financial advisor.

If the user's question is not related to personal finance, budgeting, saving, investing, or financial planning,
respond ONLY with:
"I'm a financial advisor, so I can't help you with that topic. Please ask me something about your finances."

Otherwise, respond as a warm, expert financial coach using the profile below.

User Message:
"{payload.message}"

User Profile:
{json.dumps(payload.profile, indent=2)}

Never use JSON, markdown, or bullet points.
Only reply with full-text natural human-like advice, and remind the user that this is educational guidance, not financial advice.
"""

    try:
        response = model.generate_content(prompt)
        return {"output": response.text.strip(), "disclaimer": DISCLAIMER}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def build_prompt(user_input: dict, goal: str) -> str:
    if "modelPredictions" not in user_input or "marketVolatility" not in user_input:
        predictions, volatility = load_ai_insights()
        user_input["modelPredictions"] = predictions
        user_input["marketVolatility"] = volatility

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
        "IMPORTANT: You are a financial advisor AI.\n"
        "If the user's question is NOT related to financial planning, budgeting, saving, or investments,\n"
        "then respond with: \"I'm a financial advisor, so I can't help you with that topic. Please ask me something about your finances.\"\n\n"

        "Otherwise, continue with the following instructions:\n\n"

        "STEP 1 - Assess user's financial health:\n"
        "- Are they overspending?\n"
        "- Can they afford to invest?\n"
        "- What is their risk tolerance?\n\n"

        "STEP 2 - Provide guidance based on goal:\n"

        "If goal is 'investment':\n"
        "- Discuss ONE asset class that fits best: stocks, gold, OR real estate (no side-by-side comparisons).\n"
        "- Base your reasoning on income, expenses, savings, risk score, and predicted returns.\n"
        "- Frame this as an educational estimate, not a guarantee or instruction to buy/sell.\n\n"

        "If goal is 'life_management':\n"
        "- Share 3 practical money management tips (saving, budgeting, cutting costs).\n\n"

        "Respond like a real human advisor.\n"
        "NEVER use markdown, code, or bullet points.\n"
        "End with a brief reminder that this is educational, not financial advice.\n\n"

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
        "\n\nGive your guidance now:"
    )

    return prompt


@router.post("/generate/{goal}")
def generate_advice(goal: str, user_input: dict):
    model = _get_genai_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Chat assistant is not configured (missing GEMINI_API_KEY).",
        )

    try:
        prompt = build_prompt(user_input, goal)
        response = model.generate_content(prompt)
        return {"output": response.text.strip(), "disclaimer": DISCLAIMER}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
