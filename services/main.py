from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import os

# Load your fine-tuned Phi-2 model
MODEL_PATH = "Phi-Model/phi2-finetuned"

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, trust_remote_code=True)
    model.eval()
    print("✅ Fine-tuned Phi-2 model loaded.")
except Exception as e:
    raise RuntimeError(f"❌ Failed to load Phi-2 model from {MODEL_PATH}: {e}")

# Initialize FastAPI app
app = FastAPI(title="AI Financial Advisor")

# Enable CORS for your frontend (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Use specific origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the custom logic routes
from stock import router as stock_router
from gold import router as gold_router
from real_estate import router as real_estate_router

app.include_router(stock_router, prefix="/stock", tags=["Stock"])
app.include_router(gold_router, prefix="/gold", tags=["Gold"])
app.include_router(real_estate_router, prefix="/realestate", tags=["Real Estate"])

# Route for prompting the Phi model directly
@app.post("/ask")
async def ask_phi(prompt: str):
    try:
        inputs = tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            outputs = model.generate(**inputs, max_length=200, do_sample=True)
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {e}")
