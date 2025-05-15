from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field, validator
from agent.Phi_Model.phi2_loader import model, tokenizer
import requests
import torch
import os
import jwt
import json
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv

router = APIRouter()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../../server/.env"))

# === Config ===
JWT_SECRET = os.environ.get("JWT_SECRET", "")
FORECAST_DATA_DIR = os.path.join(os.path.dirname(__file__), "../../forecast_data")
QUESTIONNAIRE_SERVICE_URL = os.environ.get("QUESTIONNAIRE_SERVICE_URL", "http://localhost:4000")

# === Input Schemas ===
class Prompt(BaseModel):
    instruction: str = Field(..., min_length=3, max_length=1000, 
                           description="User's financial question or instruction")
    
    @validator('instruction')
    def validate_instruction(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("Instruction too short or unclear.")
        return v.strip()

class AnalysisParams(BaseModel):
    detailed: bool = Field(False, description="Return detailed analysis")
    include_forecasts: bool = Field(True, description="Include market forecasts in analysis")

# === Helper Functions ===
def get_user_from_request(request: Request) -> dict:
    """Decode and validate JWT token from request header"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header."
        )

    token = auth_header.split(" ")[1]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token."
        )

async def fetch_latest_questionnaire(request: Request) -> dict:
    """Fetch user questionnaire from external service"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing Bearer token."
            )

        response = requests.get(
            f"{QUESTIONNAIRE_SERVICE_URL}/api/questionnaire/latest",
            headers={"Authorization": auth_header},
            timeout=5
        )

        response.raise_for_status()
        return response.json()

    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Questionnaire service unavailable: {str(e)}"
        )

def load_forecast_data(asset: str) -> dict:
    """Load forecast data for specified asset type"""
    asset_files = {
        "gold": "GOLD_lstm_results.json",
        "stock": "stock_forecast_results.json",
        "realestate": "REAL_forecast_results.json"
    }
    
    if asset not in asset_files:
        raise ValueError(f"Unsupported asset type: {asset}")
    
    file_path = os.path.join(FORECAST_DATA_DIR, asset, asset_files[asset])
    
    try:
        with open(file_path, "r") as f:
            data = json.load(f)
            
        # Add timestamp if not present
        if "timestamp" not in data:
            data["timestamp"] = datetime.now().isoformat()
            
        return data
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast data for {asset} not found"
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid forecast data format for {asset}"
        )

def generate_forecast_summary() -> str:
    """Generate a formatted summary of all market forecasts"""
    try:
        gold = load_forecast_data("gold")
        stock = load_forecast_data("stock")
        realestate = load_forecast_data("realestate")
        
        return f"""
## Latest Market Forecasts (last 3 periods)
📈 **Gold**: {gold.get('predictions', [])[-3:]}
📊 **Stocks**: {stock.get('LSTM', {}).get('Forecast', [])[-3:]}
🏠 **Real Estate**: {realestate.get('LSTM', {}).get('Forecast', [])[-3:]}

_Updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}_
"""
    except Exception:
        return "\n⚠️ Market data currently unavailable\n"

def determine_tone(risk_score: int) -> str:
    """Determine response tone based on risk tolerance score"""
    if not 1 <= risk_score <= 10:
        risk_score = 5
        
    return (
        "bold and ambitious" if risk_score >= 8 else
        "cautious and protective" if risk_score <= 3 else
        "balanced and pragmatic"
    )

# === API Endpoints ===
@router.post("/chat", summary="Get financial advice based on user question")
async def generate_chat_response(data: Prompt, request: Request):
    """
    Provides personalized financial advice based on user's question and current market data.
    Automatically detects mentions of specific asset types (gold, stocks, real estate).
    """
    try:
        # Authentication
        user_info = get_user_from_request(request)
        
        # Load relevant forecast data based on user question
        question_lower = data.instruction.lower()
        assets_to_check = []
        
        if "gold" in question_lower:
            assets_to_check.append("gold")
        if "stock" in question_lower or "stocks" in question_lower:
            assets_to_check.append("stock")
        if "real estate" in question_lower or "property" in question_lower or "house" in question_lower:
            assets_to_check.append("realestate")
            
        # If no specific asset mentioned, include all for context
        if not assets_to_check:
            assets_to_check = ["gold", "stock", "realestate"]
            
        # Build context data
        context_data = []
        for asset in assets_to_check:
            try:
                data = load_forecast_data(asset)
                context_data.append(
                    f"**{asset.upper()}**: Latest forecasts: {data.get('predictions', data.get('LSTM', {}).get('Forecast', []))[-3:]}"
                )
            except Exception:
                continue
                
        context_str = "\n".join(context_data) if context_data else "Current market data unavailable"
        
        # Generate prompt
        prompt = f"""
You are a professional financial advisor with access to real market data.

### USER QUESTION:
{data.instruction}

### MARKET CONTEXT:
{context_str}

### RESPONSE GUIDELINES:
1. Address the user's question directly
2. Reference relevant market data where applicable
3. Provide clear, actionable advice
4. Mention risks and alternatives
5. Keep response concise (3-5 sentences)

ADVISOR RESPONSE:
"""
        # Generate response
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        with torch.no_grad():
            output = model.generate(
                **inputs,
                max_new_tokens=300,
                do_sample=True,
                top_k=50,
                top_p=0.95,
                temperature=0.7,
                repetition_penalty=1.1
            )
            
        response = tokenizer.decode(
            output[0], 
            skip_special_tokens=True
        ).replace(prompt.strip(), "").strip()
        
        return {
            "response": response,
            "context": {
                "assets_analyzed": assets_to_check,
                "timestamp": datetime.now().isoformat()
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}"
        )

@router.post("/analyze_profile", summary="Comprehensive financial profile analysis")
async def analyze_user_profile(
    request: Request, 
    params: Optional[AnalysisParams] = None
):
    """
    Provides a comprehensive financial analysis based on user's questionnaire data,
    risk profile, and current market conditions.
    """
    if params is None:
        params = AnalysisParams()
        
    try:
        # Authentication and data fetching
        user_info = get_user_from_request(request)
        questionnaire = await fetch_latest_questionnaire(request)
        
        # Prepare profile data
        profile_text = "\n".join(
            f"- {k.replace('_', ' ').title()}: {v}"
            for k, v in questionnaire.items()
            if v not in [None, ""]
        )
        
        # Determine tone and risk
        risk_score = int(questionnaire.get("riskTolerance", 5))
        tone = determine_tone(risk_score)
        
        # Prepare market data if requested
        market_summary = ""
        if params.include_forecasts:
            market_summary = generate_forecast_summary()
            
        # Generate prompt
        prompt = f"""
You are an advanced financial planning AI analyzing a user's complete financial profile.

### USER PROFILE:
{profile_text}

{market_summary if params.include_forecasts else ""}

### ANALYSIS REQUEST:
Create a {'detailed' if params.detailed else 'concise'} financial plan with:
1. Key observations about the user's financial situation
2. Recommended investment strategy based on their risk score ({risk_score}/10)
3. {'Detailed budgeting advice' if params.detailed else 'Budgeting tips'}
4. {'Comprehensive goal planning' if params.detailed else 'Goal suggestions'}

TONE: {tone}
{'LENGTH: 2-3 paragraphs' if not params.detailed else 'LENGTH: Comprehensive analysis'}
"""
        # Generate response
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        with torch.no_grad():
            output = model.generate(
                **inputs,
                max_new_tokens=800 if params.detailed else 400,
                do_sample=True,
                top_k=50,
                top_p=0.95,
                temperature=0.7,
                repetition_penalty=1.1
            )
            
        response = tokenizer.decode(
            output[0], 
            skip_special_tokens=True
        ).replace(prompt.strip(), "").strip()
        
        return {
            "response": response,
            "metadata": {
                "risk_score": risk_score,
                "analysis_type": "detailed" if params.detailed else "summary",
                "market_data_included": params.include_forecasts,
                "timestamp": datetime.now().isoformat()
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile analysis failed: {str(e)}"
        )

@router.post("/infer", summary="Raw model inference (testing only)")
async def raw_prompt_infer(data: Prompt):
    """
    Direct model inference endpoint for testing purposes.
    No authentication or additional processing.
    """
    try:
        inputs = tokenizer(data.instruction, return_tensors="pt").to(model.device)
        with torch.no_grad():
            output = model.generate(
                **inputs,
                max_new_tokens=250,
                do_sample=True,
                top_k=50,
                top_p=0.95,
                temperature=0.7,
                repetition_penalty=1.1
            )
            
        return {
            "response": tokenizer.decode(output[0], skip_special_tokens=True).strip()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}"
        )