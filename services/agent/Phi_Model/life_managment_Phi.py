from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import os
import json

router = APIRouter()

# === Load Fine-tuned Phi-2 ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "phi2-finetuned")
OFFLOAD_DIR = os.path.join(BASE_DIR, "offload")
os.makedirs(OFFLOAD_DIR, exist_ok=True)

print("🚀 Loading fine-tuned Phi-2 model...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    device_map="auto",  # Automatically place layers on GPU/CPU
    offload_folder=OFFLOAD_DIR,
    torch_dtype=torch.float16,
    low_cpu_mem_usage=True  # Reduce RAM pressure
)
model.eval()

# === Input Schema ===
class FinancialProfile(BaseModel):
    income: str = Field(..., example="12000")
    rent: str = Field(..., example="3500")
    utilities: str = Field(..., example="900")
    dietPlan: str = Field(..., example="Healthy with meal prep")
    transportCost: str = Field(..., example="700")
    otherRecurring: str = Field(..., example="Gym, phone bill")
    savingAmount: str = Field(..., example="2000")

    customExpenses: list[dict] = Field(
        default_factory=list,
        example=[{"name": "Internet", "amount": "400"}]
    )

# === POST /generate ===
@router.post("/generate", summary="Generate life management tips from financial profile")
async def generate_advice(profile: FinancialProfile):
    try:
        print("📩 /generate endpoint called")

        # Format custom expenses
        expenses_str = "".join(
            f"- {e.get('name')}: {e.get('amount')} EGP\n" for e in profile.customExpenses
        )

        # Construct prompt
        prompt = (
            "You are a helpful financial planning AI assistant.\n"
            "The user provides their expense profile and monthly income. "
            "Generate a short summary and 6 personalized life management or budgeting tips.\n\n"
            "### Profile:\n"
            f"- Monthly Income: {profile.income} EGP\n"
            f"- Rent: {profile.rent} EGP\n"
            f"- Utilities: {profile.utilities} EGP\n"
            f"- Diet Plan: {profile.dietPlan}\n"
            f"- Transportation: {profile.transportCost} EGP\n"
            f"- Other Expenses: {profile.otherRecurring}\n"
            f"- Savings: {profile.savingAmount} EGP\n"
            "### Custom Expenses:\n" + expenses_str +
            "\nProvide your answer as:\n"
            "{\n"
            '  "summary": "Short paragraph...",\n'
            '  "advice": [\n'
            '    "Tip 1...",\n'
            '    "Tip 2...",\n'
            '    ...\n'
            "  ]\n"
            "}\n"
        )

        # Tokenize and Generate
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        with torch.no_grad():
            output = model.generate(
                **inputs,
                max_new_tokens=400,
                temperature=0.7,
                top_p=0.95,
                repetition_penalty=1.1
            )
        decoded = tokenizer.decode(output[0], skip_special_tokens=True)

        # Extract JSON from output
        json_start = decoded.find("{")
        json_end = decoded.rfind("}") + 1
        response_text = decoded[json_start:json_end]

        try:
            response_json = json.loads(response_text)
            return response_json
        except json.JSONDecodeError:
            print("⚠️ JSON parsing failed:\n", response_text)
            return {"raw_output": decoded.strip()}

    except Exception as e:
        print("❌ Server error:", e)
        raise HTTPException(status_code=500, detail=str(e))
