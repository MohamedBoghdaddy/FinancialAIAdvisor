from fastapi import FastAPI, APIRouter, HTTPException, Request, status, Depends
from pydantic import BaseModel, Field, validator
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoConfig
from peft import PeftModel
from accelerate import init_empty_weights, load_checkpoint_and_dispatch
import torch
import os
import jwt
import json
import requests
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv
import logging

# Initialize FastAPI application
app = FastAPI(
    title="Financial AI Advisor",
    description="API for personalized financial advice using Phi-2 model",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None
)

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# === Configuration ===
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "phi2-finetuned")
OFFLOAD_DIR = os.path.join(BASE_DIR, "offload")
FORECAST_DATA_DIR = os.path.join(BASE_DIR, "forecast_data")
os.makedirs(OFFLOAD_DIR, exist_ok=True)
os.makedirs(FORECAST_DATA_DIR, exist_ok=True)

JWT_SECRET = os.getenv("JWT_SECRET", "secure_dev_secret")
QUESTIONNAIRE_SERVICE_URL = os.getenv("QUESTIONNAIRE_SERVICE_URL", "http://localhost:4000")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "800"))
MODEL_LOAD_MODE = os.getenv("MODEL_LOAD_MODE", "balanced")  # Options: "balanced", "memory", "performance"

# === Optimized Model Loading ===
def load_model_with_fallback():
    """Smart model loader with multiple fallback strategies"""
    try:
        logger.info(f"🚀 Attempting to load model with {MODEL_LOAD_MODE} strategy...")
        
        if MODEL_LOAD_MODE == "memory":
            return load_4bit_quantized_model()
        elif MODEL_LOAD_MODE == "performance":
            return load_full_precision_model()
        else:  # balanced
            try:
                return load_offloaded_model()
            except Exception as e:
                logger.warning(f"⚠️ Offload loading failed, falling back to 4-bit: {str(e)}")
                return load_4bit_quantized_model()
                
    except Exception as e:
        logger.error(f"❌ All loading strategies failed, falling back to CPU: {str(e)}")
        return load_cpu_model()

def load_4bit_quantized_model():
    """4-bit quantized model for memory efficiency"""
    from transformers import BitsAndBytesConfig
    
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True
    )
    
    model = AutoModelForCausalLM.from_pretrained(
        "microsoft/phi-2",
        device_map="auto",
        quantization_config=quantization_config,
        trust_remote_code=True
    )
    tokenizer = AutoTokenizer.from_pretrained("microsoft/phi-2")
    tokenizer.pad_token = tokenizer.eos_token
    return model, tokenizer

def load_offloaded_model():
    """Model with smart offloading to CPU when not in use"""
    config = AutoConfig.from_pretrained("microsoft/phi-2")
    
    with init_empty_weights():
        model = AutoModelForCausalLM.from_config(config)
    
    model = load_checkpoint_and_dispatch(
        model,
        "microsoft/phi-2",
        device_map="auto",
        no_split_module_classes=["PhiDecoderLayer"],
        offload_folder=OFFLOAD_DIR,
        offload_state_dict=True,
        dtype=torch.float16
    )
    
    tokenizer = AutoTokenizer.from_pretrained("microsoft/phi-2")
    return model, tokenizer

def load_full_precision_model():
    """Full precision model for best performance"""
    model = AutoModelForCausalLM.from_pretrained(
        "microsoft/phi-2",
        device_map="auto",
        torch_dtype=torch.float16,
        trust_remote_code=True
    )
    tokenizer = AutoTokenizer.from_pretrained("microsoft/phi-2")
    tokenizer.pad_token = tokenizer.eos_token
    return model, tokenizer

def load_cpu_model():
    """CPU fallback model"""
    model = AutoModelForCausalLM.from_pretrained(
        "microsoft/phi-2",
        device_map="cpu",
        torch_dtype=torch.float32
    )
    tokenizer = AutoTokenizer.from_pretrained("microsoft/phi-2")
    return model, tokenizer

# Initialize model
try:
    model, tokenizer = load_model_with_fallback()
    logger.info("✅ Model successfully loaded")
except Exception as e:
    logger.critical(f"💥 Critical failure loading model: {str(e)}")
    raise RuntimeError("Failed to initialize model")

# === Data Models ===
class FinancialProfile(BaseModel):
    """Standard financial profile input"""
    income: float = Field(..., gt=0, example=12000)
    expenses: dict = Field(
        ...,
        example={
            "rent": 3500,
            "utilities": 900,
            "transport": 700,
            "food": 1500,
            "other": 1000
        }
    )
    savings: float = Field(..., ge=0, example=2000)
    risk_tolerance: int = Field(..., ge=1, le=10, example=5)
    financial_goals: list[str] = Field(
        default_factory=list,
        example=["Retirement savings", "Buy a home"]
    )
    custom_expenses: list[dict] = Field(
        default_factory=list,
        example=[{"name": "Internet", "amount": 400}]
    )

    @validator('expenses')
    def validate_expenses(cls, v):
        if sum(v.values()) <= 0:
            raise ValueError("Expenses must be positive values")
        return v

class ChatPrompt(BaseModel):
    """Input for chat-based financial advice"""
    message: str = Field(..., min_length=3, max_length=1000)
    include_market_data: bool = Field(True)
    tone_preference: Optional[str] = Field(
        None,
        description="Preferred tone: 'professional', 'casual', or 'technical'"
    )

class AnalysisParams(BaseModel):
    """Parameters for financial analysis"""
    detailed: bool = Field(False)
    time_horizon: str = Field(
        "short-term",
        enum=["short-term", "medium-term", "long-term"]
    )
    include_forecasts: bool = Field(True)

# === Helper Functions ===
def get_current_user(request: Request) -> dict:
    """JWT authentication middleware"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )

    try:
        token = auth_header.split(" ")[1]
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def fetch_user_profile(user_id: str) -> dict:
    """Fetch user profile from questionnaire service"""
    try:
        response = requests.get(
            f"{QUESTIONNAIRE_SERVICE_URL}/api/profile/{user_id}",
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Profile service error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile service unavailable"
        )

def load_market_data(asset_type: str) -> dict:
    """Load forecast data for specific asset type"""
    asset_files = {
        "stock": "stock_forecast.json",
        "gold": "gold_forecast.json",
        "real_estate": "real_estate_forecast.json"
    }
    
    try:
        with open(os.path.join(FORECAST_DATA_DIR, asset_files[asset_type])) as f:
            data = json.load(f)
        return {
            "predictions": data.get("predictions", []),
            "timestamp": data.get("timestamp", datetime.now().isoformat())
        }
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.warning(f"Market data load failed for {asset_type}: {str(e)}")
        return {}

def generate_response(prompt: str, max_tokens: int = 300) -> str:
    """Generate response using Phi-2 model"""
    try:
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=0.7,
                top_p=0.95,
                repetition_penalty=1.1,
                do_sample=True
            )
        return tokenizer.decode(outputs[0], skip_special_tokens=True)
    except Exception as e:
        logger.error(f"Model generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model inference error"
        )

# === API Routes ===
router = APIRouter()

@router.post("/generate-advice", response_model=dict)
async def generate_financial_advice(
    profile: FinancialProfile,
    request: Request,
    params: AnalysisParams = Depends()
):
    """
    Generate personalized financial advice based on complete profile.
    """
    try:
        # Authentication
        user = get_current_user(request)
        
        # Format expenses
        expenses_str = "\n".join(
            f"- {category}: {amount}" 
            for category, amount in profile.expenses.items()
        )
        
        # Add custom expenses
        if profile.custom_expenses:
            expenses_str += "\nCustom Expenses:\n" + "\n".join(
                f"- {e['name']}: {e['amount']}" 
                for e in profile.custom_expenses
            )
        
        # Load market data if requested
        market_context = ""
        if params.include_forecasts:
            market_data = {
                asset: load_market_data(asset)
                for asset in ["stock", "gold", "real_estate"]
            }
            market_context = "\nMarket Trends:\n" + "\n".join(
                f"- {asset}: {data.get('predictions', ['N/A'])[-1]}"
                for asset, data in market_data.items()
            )
        
        # Generate prompt
        prompt = f"""
Financial Profile Analysis Request
---------------------------------
User ID: {user['id']}
Risk Tolerance: {profile.risk_tolerance}/10
Time Horizon: {params.time_horizon}

Income: {profile.income}
Savings: {profile.savings}

Monthly Expenses:
{expenses_str}

Financial Goals:
{', '.join(profile.financial_goals) or 'Not specified'}

{market_context}

Analysis Guidelines:
1. Provide {'detailed' if params.detailed else 'concise'} recommendations
2. Focus on {params.time_horizon} strategies
3. Consider risk tolerance level
4. Suggest specific actions
5. Highlight potential savings opportunities
"""
        # Generate and parse response
        raw_response = generate_response(prompt, MAX_TOKENS)
        
        try:
            # Attempt to parse structured response
            json_start = raw_response.find("{")
            json_end = raw_response.rfind("}") + 1
            if json_start != -1 and json_end != -1:
                return json.loads(raw_response[json_start:json_end])
            return {"advice": raw_response.strip()}
        except json.JSONDecodeError:
            return {"advice": raw_response.strip()}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Advice generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate financial advice"
        )

@router.post("/chat", response_model=dict)
async def financial_chat(
    prompt: ChatPrompt,
    request: Request
):
    """
    Interactive financial Q&A with market context awareness.
    """
    try:
        user = get_current_user(request)
        profile = await fetch_user_profile(user['id'])
        
        # Build market context if requested
        market_context = ""
        if prompt.include_market_data:
            market_data = {
                asset: load_market_data(asset)
                for asset in ["stock", "gold", "real_estate"]
            }
            market_context = "\nCurrent Market Trends:\n" + "\n".join(
                f"- {asset}: {data.get('predictions', ['N/A'])[-1]}"
                for asset, data in market_data.items()
            )
        
        # Determine tone
        tone = prompt.tone_preference or (
            "technical" if profile.get('risk_tolerance', 5) >= 7 
            else "professional"
        )
        
        # Generate prompt
        full_prompt = f"""
Financial Chat Request (Tone: {tone})
------------------------------------
User Question: {prompt.message}

User Profile:
- Risk Tolerance: {profile.get('risk_tolerance', 5)}/10
- Primary Goals: {', '.join(profile.get('financial_goals', [])) or 'Not specified'}

{market_context}

Response Guidelines:
1. Address the specific question
2. Consider user's risk profile
3. Provide actionable advice
4. Use {tone} tone
5. Keep response under 3 paragraphs
"""
        return {"response": generate_response(full_prompt)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat request"
        )

@router.post("/analyze-portfolio", response_model=dict)
async def analyze_investment_portfolio(
    request: Request,
    params: AnalysisParams = Depends()
):
    """
    Comprehensive portfolio analysis with market data integration.
    """
    try:
        user = get_current_user(request)
        profile = await fetch_user_profile(user['id'])
        
        # Load all market data
        market_data = {
            asset: load_market_data(asset)
            for asset in ["stock", "gold", "real_estate"]
        }
        
        # Generate analysis prompt
        prompt = f"""
Portfolio Analysis Request
-------------------------
User: {user['id']}
Risk Tolerance: {profile.get('risk_tolerance', 5)}/10
Time Horizon: {params.time_horizon}

Current Market Conditions:
{json.dumps(market_data, indent=2)}

Analysis Guidelines:
1. Provide {'comprehensive' if params.detailed else 'high-level'} assessment
2. Focus on {params.time_horizon} performance
3. Suggest rebalancing if needed
4. Highlight risks and opportunities
5. Recommend specific actions
"""
        return {"analysis": generate_response(prompt, MAX_TOKENS)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portfolio analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze portfolio"
        )

@router.get("/health", include_in_schema=False)
async def health_check():
    """Service health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "market_data_available": all(
            os.path.exists(os.path.join(FORECAST_DATA_DIR, f))
            for f in ["stock_forecast.json", "gold_forecast.json"]
        )
    }

@router.get("/model-info")
async def model_info():
    """Get model loading information"""
    return {
        "load_mode": MODEL_LOAD_MODE,
        "device": str(model.device),
        "dtype": str(model.dtype),
        "memory_usage": f"{torch.cuda.memory_allocated()/1024**3:.2f}GB" 
            if torch.cuda.is_available() else "CPU"
    }

# Include the router in the main app
app.include_router(router, prefix="/api")

# For direct execution
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)