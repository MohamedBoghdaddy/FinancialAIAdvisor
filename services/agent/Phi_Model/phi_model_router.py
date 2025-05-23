from fastapi import FastAPI, APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from services.agent.Phi_Model.phi2_loader import model, tokenizer
import torch
import os
import jwt
import asyncio
import requests
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# === Load environment variables ===
load_dotenv()

# === Initialize App ===
app = FastAPI()
router = APIRouter()

# === CORS Middleware ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Consider replacing with frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Configuration ===
JWT_SECRET = os.getenv("JWT_SECRET", "")
PROFILE_SERVICE_URL = os.getenv("PROFILE_SERVICE_URL", "http://localhost:3000")

# === Input Schema ===
class BudgetAdviceRequest(BaseModel):
    message: Optional[str] = None
    use_profile: bool = False

# === Utility Functions ===
def auth_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    try:
        return jwt.decode(auth_header.split(" ")[1], JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def fetch_profile(request: Request) -> dict:
    try:
        response = await asyncio.to_thread(
            lambda: requests.get(
                f"{PROFILE_SERVICE_URL}/api/profile/me",
                headers={"Authorization": request.headers["Authorization"]},
                timeout=1.5
            )
        )
        response.raise_for_status()
        return response.json()
    except Exception:
        raise HTTPException(503, "Profile service unavailable")

def format_profile(profile: dict) -> str:
    return f"""
Age: {profile.get('age', 30)}
Income: {profile.get('income', 0)}/month
Debt Status: {'Has debt' if profile.get('hasDebt') else 'No debt'}
Risk Tolerance: {profile.get('riskTolerance', 5)}/10
Financial Goals: {profile.get('financialGoals', 'Not specified')}
Savings Rate: {profile.get('savingsRate', 15)}%
"""

async def generate_budget_response(prompt: str) -> str:
    try:
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        with torch.inference_mode():
            output = model.generate(
                **inputs,
                max_new_tokens=400,
                do_sample=True,
                top_k=50,
                top_p=0.95,
                temperature=0.7,
                pad_token_id=tokenizer.pad_token_id
            )
        generated = tokenizer.decode(output[0], skip_special_tokens=True)
        return generated.split("### Response:")[-1].strip()[:1500]
    except Exception as e:
        raise RuntimeError(f"Generation failed: {str(e)}")

# === API Endpoint ===
@router.post("/budget-advice", status_code=200)
async def get_budget_advice(request: Request, data: BudgetAdviceRequest):
    try:
        user = auth_user(request)
        profile = await fetch_profile(request) if data.use_profile else None

        prompt = f"""### Instruction:
You are a financial assistant. {'Use this profile:' if data.use_profile else 'Answer this question:'}

{format_profile(profile) if data.use_profile else data.message}

Provide advice structured as:
1️⃣ Fixed Expenses
2️⃣ Variable Expenses
3️⃣ Financial Goals

Include specific percentages that total 100%
Add one practical tip

### Response:
"""

        response = await generate_budget_response(prompt)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = f"budgets/budget_{timestamp}.txt" if os.getenv("SAVE_ADVICE") else None

        if file_path:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "w") as f:
                f.write(response)

        return {
            "advice": response,
            "saved_path": file_path,
            "timestamp": timestamp
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(500, detail=f"Budget advice error: {str(e)}")

# === Register Router ===
app.include_router(router)
