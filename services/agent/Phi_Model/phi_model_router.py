# services/agent/Phi_Model/phi_model_router.py
from fastapi import FastAPI, APIRouter, HTTPException, Request, status, Depends, WebSocket
from pydantic import BaseModel, Field
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
from datetime import datetime
from dotenv import load_dotenv
from googletrans import Translator
import torch
import jwt
import asyncio
import requests
import json
import os
import re

# === Load environment variables ===
load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET", "")
PROFILE_SERVICE_URL = os.getenv("PROFILE_SERVICE_URL", "http://localhost:4000")
MAX_HISTORY = 20

# === App & Router Setup ===
app = FastAPI()
router = APIRouter()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Model Setup ===
model_name = "microsoft/phi-2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)
model.eval()
chat = pipeline("text-generation", model=model, tokenizer=tokenizer)

# === Models ===
class PromptInput(BaseModel):
    message: str
    userId: Optional[str]
    salary: Optional[float]

class TranslationRequest(BaseModel):
    text: str
    targetLang: str

class ChatMessage(BaseModel):
    content: str
    is_user: bool
    timestamp: datetime

# In-memory chat history per user (simple placeholder, replace with DB in production)
user_histories: Dict[str, List[ChatMessage]] = {}

# === Utilities ===
def auth_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    try:
        return jwt.decode(auth_header.split(" ")[1], JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def fetch_profile_from_node_backend(request: Request) -> dict:
    try:
        response = requests.get(
            f"{PROFILE_SERVICE_URL}/me",
            headers={"Authorization": request.headers.get("Authorization", "")},
            timeout=3.0
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to fetch profile: {str(e)}")

def profile_to_prompt(profile):
    return f"""
I am a {profile['age']}-year-old {profile['employmentStatus'].lower()} individual earning {profile['salary']} EGP monthly.
I currently {profile['homeOwnership'].lower()} my home and I {'do' if profile['hasDebt'] == 'Yes' else "don’t"} have any debts.
My lifestyle is best described as {profile['lifestyle'].lower()}.
I have a risk tolerance of {profile['riskTolerance']} out of 10, and I usually invest surplus money (investment approach score: {profile['investmentApproach']}).
On emergency preparedness I score {profile['emergencyPreparedness']} out of 10, and I research financial trends about {profile['financialTracking']} out of 10.
I prioritize future financial security over present comfort (score: {profile['futureSecurity']}/10), and my spending discipline is {profile['spendingDiscipline']}/10.
If I received a large sum of money, I would allocate {profile['assetAllocation']} out of 10 toward long-term assets.
I am slightly {'risk-averse' if profile['riskTaking'] <= 5 else 'risk-seeking'}, and I {'have' if profile['dependents'] == 'Yes' else "don’t have"} financial dependents.
My primary financial goals are: {profile['financialGoals']}.
"""

def clean_output(text):
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    text = re.sub(r"(?i)(print|def|class|import|for|if|while|return).*", "", text)
    return text.strip()

def get_response(user_input: str, is_profile: bool = False) -> str:
    prompt = f"""### System:
You are Phi-2, a fine-tuned AI trained on expert-level financial planning data and real-world scenarios. Your goal is to provide **personalized**, **practical**, and **emotionally intelligent** financial advice. Communicate in clear, concise, and encouraging language.

When given a user **profile**, analyze it holistically to understand the user’s lifestyle, goals, financial health, and risk tolerance. Then summarize key insights and formulate an investment + life management strategy.

When given a **question**, treat it as a standalone inquiry. Provide step-by-step reasoning, define any key terms, and tailor your response to non-experts.

Only respond under the "### Response:" section.
Never refer to yourself as an AI model.
Be proactive, yet grounded in logic.

### {"User Profile" if is_profile else "User Question"}:
{user_input}

### Response:
"""
    try:
        response = chat(
            prompt,
            max_new_tokens=500,
            do_sample=True,
            top_k=20,
            top_p=0.85,
            temperature=0.5,
            pad_token_id=tokenizer.pad_token_id
        )
        generated = response[0]['generated_text']
        answer = generated.split("### Response:")[-1].strip()
        return clean_output(answer)
    except Exception as e:
        return f"⚠️ Error: {str(e)}"

# === API Endpoints ===
@router.post("/chat")
async def chat_with_ai(prompt: PromptInput, request: Request):
    try:
        profile_data = fetch_profile_from_node_backend(request)
        prompt_text = profile_to_prompt(profile_data)

        user_id = prompt.userId or "anonymous"
        if user_id not in user_histories:
            user_histories[user_id] = []

        # Combine history
        history_str = "\n".join(
            f"{'User' if msg.is_user else 'Assistant'}: {msg.content}" for msg in user_histories[user_id][-MAX_HISTORY:]
        )

        combined = f"{prompt_text}\n\nConversation History:\n{history_str}\n\nUser Question: {prompt.message}"
        response_text = get_response(combined, is_profile=True)

        # Save exchange to history
        user_histories[user_id].append(ChatMessage(content=prompt.message, is_user=True, timestamp=datetime.now()))
        user_histories[user_id].append(ChatMessage(content=response_text, is_user=False, timestamp=datetime.now()))

        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@router.post("/translate")
async def translate_text(body: TranslationRequest):
    try:
        translator = Translator()
        translated = translator.translate(body.text, dest=body.targetLang)
        return {"translation": translated.text}
    except Exception as e:
        raise HTTPException(500, f"Translation error: {str(e)}")

# === Mount Router ===
app.include_router(router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
