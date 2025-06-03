# === Full Merged Code with Caching & Natural Language Explanations ===
from fastapi import FastAPI, APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from transformers import pipeline
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from dotenv import load_dotenv
from googletrans import Translator
import torch
import jwt
import requests
import json
import os
import re
from .phi2_loader import get_model

# === Load environment variables ===
load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET", "")
PROFILE_SERVICE_URL = os.getenv("PROFILE_SERVICE_URL", "http://localhost:4000")
BASE_API_URL = "http://localhost:8000"
MAX_HISTORY = 20

# === App & Router Setup ===
app = FastAPI()
router = APIRouter()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# === Model Setup ===
model, tokenizer = get_model()
model.eval()
chat = pipeline("text-generation", model=model, tokenizer=tokenizer)

# === Caching (in-memory, expires in 60s) ===
cache = {}
CACHE_TTL = 60

def get_cached(key: str):
    entry = cache.get(key)
    if entry and datetime.now() - entry['time'] < timedelta(seconds=CACHE_TTL):
        return entry['data']
    return None

def set_cached(key: str, data):
    cache[key] = {"data": data, "time": datetime.now()}

# === Pydantic Models ===
class PromptInput(BaseModel):
    message: str
    userId: Optional[str] = None
    salary: Optional[float] = None

class TranslationRequest(BaseModel):
    text: str
    targetLang: str

class ChatMessage(BaseModel):
    content: str
    is_user: bool
    timestamp: datetime

user_histories: Dict[str, List[ChatMessage]] = {}

# === API Helpers ===
def call_api(endpoint: str) -> dict:
    cache_key = f"api::{endpoint}"
    cached = get_cached(cache_key)
    if cached:
        return cached
    try:
        res = requests.get(f"{BASE_API_URL}/{endpoint}", timeout=5)
        res.raise_for_status()
        data = res.json()
        set_cached(cache_key, data)
        return data
    except Exception as e:
        return {"error": f"Failed to call {endpoint}: {str(e)}"}

def get_stock_data():
    return {
        "metrics": call_api("stock/metrics"),
        "history": call_api("stock/historical"),
        "predict": call_api("stock/predict")
    }

def get_gold_data():
    return {
        "metrics": call_api("gold/metrics"),
        "forecast": call_api("gold/forecast"),
        "history": call_api("gold/history"),
        "predict": call_api("gold/predict")
    }

def get_real_estate_data():
    return {
        "metrics": call_api("real_estate/metrics"),
        "forecast": call_api("real_estate/forecast"),
        "predict": call_api("real_estate/predict"),
        "return": call_api("real_estate/return")
    }

# === Explanation Helpers ===
def explain_metrics(title: str, data: dict) -> str:
    if "error" in data:
        return f"{title}: ⚠️ {data['error']}"
    lines = [f"{title}:"]
    for item in data:
        model = item.get("model") or item.get("symbol")
        rmse = item.get("RMSE")
        mae = item.get("MAE")
        r2 = item.get("R2")
        lines.append(f"- {model}: RMSE = {rmse:.2f}, MAE = {mae:.2f}, R² = {r2:.2f}")
    return "\n".join(lines)

def is_financial_question(msg: str) -> bool:
    keywords = ["invest", "savings", "retirement", "stock", "gold", "real estate", "budget", "debt", "salary", "expenses", "financial goal", "risk tolerance", "short term", "long term", "buy", "sell", "portfolio", "income", "loan"]
    return any(k in msg.lower() for k in keywords)

def fetch_best_stock(short_term=True) -> str:
    try:
        metrics = call_api("stock/metrics")
        best = sorted(metrics, key=lambda x: x["RMSE"])[0]["symbol"]
        term = "short-term" if short_term else "long-term"
        return f"The best {term} stock to invest in currently is **{best}** based on model performance."
    except Exception as e:
        return f"⚠️ Unable to fetch best stock data: {str(e)}"

def fetch_best_gold_or_real_estate(type_: str) -> str:
    try:
        metrics = call_api(f"{type_}/metrics")
        best_model = sorted(metrics, key=lambda x: x["RMSE"])[0]["model"]
        return f"The most accurate model for {type_.replace('_', ' ')} prediction is **{best_model}**."
    except Exception as e:
        return f"⚠️ Could not retrieve {type_} insights: {str(e)}"

# === Prompt Processing ===
def clean_output(text: str) -> str:
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    text = re.sub(r"(?i)(print|def|class|import|for|if|while|return).*", "", text)
    return text.strip()

def get_response(user_input: str, is_profile: bool = False) -> str:
    prompt = f"""### System:
You are Phi-2, a fine-tuned AI trained on expert-level financial planning data.
Provide personalized, emotionally intelligent, and practical advice.

### {'User Profile' if is_profile else 'User Question'}:
{user_input}

### Response:
"""
    try:
        response = chat(prompt, max_new_tokens=500, do_sample=True, top_k=20, top_p=0.85, temperature=0.5, pad_token_id=tokenizer.pad_token_id)
        answer = response[0]['generated_text'].split("### Response:")[-1].strip()
        return clean_output(answer)
    except Exception as e:
        return f"⚠️ Error: {str(e)}"

# === Main Chat Route ===
@router.post("/chat")
async def chat_with_ai(prompt: PromptInput, request: Request):
    if not is_financial_question(prompt.message):
        return {"response": "❌ I’m specialized in financial and life management advice only."}

    if "best stock" in prompt.message.lower():
        if "short" in prompt.message.lower():
            return {"response": fetch_best_stock(short_term=True)}
        elif "long" in prompt.message.lower():
            return {"response": fetch_best_stock(short_term=False)}

    if "gold" in prompt.message.lower():
        return {"response": fetch_best_gold_or_real_estate("gold")}

    if "real estate" in prompt.message.lower():
        return {"response": fetch_best_gold_or_real_estate("real_estate")}

    try:
        profile_data = requests.get(f"{PROFILE_SERVICE_URL}/api/profile/me", headers={"Authorization": request.headers.get("Authorization", "")}, timeout=3).json()
        profile = profile_data.get("data", {})
        prompt_text = f"""
I am a {profile['age']}-year-old {profile['employmentStatus'].lower()} earning {profile['salary']} EGP/month.
I currently {profile['homeOwnership'].lower()} my home and {'have' if profile['hasDebt']=='Yes' else "don’t have"} debts.
Lifestyle: {profile['lifestyle']}, Risk Tolerance: {profile['riskTolerance']}, Goals: {profile['financialGoals']}.
"""

        user_id = prompt.userId or "anonymous"
        if user_id not in user_histories:
            user_histories[user_id] = []

        history_str = "\n".join(f"{'User' if msg.is_user else 'Assistant'}: {msg.content}" for msg in user_histories[user_id][-MAX_HISTORY:])

        stock_data = get_stock_data()
        gold_data = get_gold_data()
        real_estate_data = get_real_estate_data()

        insights = "\n\n".join([
            explain_metrics("📈 Stock Market Metrics", stock_data['metrics']),
            explain_metrics("📊 Gold Market Metrics", gold_data['metrics']),
            explain_metrics("🏠 Real Estate Metrics", real_estate_data['metrics'])
        ])

        combined = f"{prompt_text}\n\n{insights}\n\nHistory:\n{history_str}\n\nUser: {prompt.message}"
        response_text = get_response(combined, is_profile=True)

        user_histories[user_id].append(ChatMessage(content=prompt.message, is_user=True, timestamp=datetime.now()))
        user_histories[user_id].append(ChatMessage(content=response_text, is_user=False, timestamp=datetime.now()))

        return {"response": response_text}
    except Exception as e:
        return {"response": f"💥 Internal Error: {str(e)}"}

@router.post("/translate")
async def translate_text(body: TranslationRequest):
    try:
        translated = Translator().translate(body.text, dest=body.targetLang)
        return {"translation": translated.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

app.include_router(router, prefix="/api")