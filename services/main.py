from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# === Routers ===
from stock.stock_router import router as stock_router
from gold.gold_router import router as gold_router
from real_estate.real_estate_router import router as real_estate_router
from agent.Phi_Model.phi_model_router import router as phi_model_router

# === Shared Model Loader (used internally, not exposed directly) ===
from agent.Phi_Model.phi2_loader import model, tokenizer

# === FastAPI App Initialization ===
app = FastAPI(title="AI Financial Advisor")

# === CORS Setup ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React frontend
        "http://localhost:4000",  # Optional Express backend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Register API Routers ===
app.include_router(stock_router, prefix="/stock", tags=["Stock"])
app.include_router(gold_router, prefix="/gold", tags=["Gold"])
app.include_router(real_estate_router, prefix="/realestate", tags=["Real Estate"])
app.include_router(phi_model_router, prefix="/phi-model", tags=["Phi-Model"])

# === Root Endpoint ===
@app.get("/")
def root():
    return {"message": "✅ AI Financial Advisor API is live"}
