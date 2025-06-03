# main.py
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.chatbot import chatbot_bp
# Add project root to Python path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.append(PROJECT_ROOT)

# === Routers ===
try:
    from services.stock.stock_router import router as stock_router
    from services.gold.gold_router import router as gold_router
    from services.real_estate.real_estate_router import router as real_estate_router
    from services.agent.Phi_Model.phi2_loader import model, tokenizer
    from services.agent.Phi_Model.phi_model_router import router as phi_model_router
except ImportError as e:
    print(f"❌ Import Error: {str(e)}")
    print("Verify directory structure and __init__.py files:")
    print("services/")
    print("├── stock/")
    print("├── gold/")
    print("├── real_estate/")
    print("└── agent/Phi_Model/")
    sys.exit(1)

# === FastAPI App Initialization ===
app = FastAPI(
    title="AI Financial Advisor",
    version="1.3.0",
    description="Multi-Market Financial Analysis Platform",
    docs_url="/api/docs"
)

# === CORS Configuration ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Register Services ===
service_config = {
    "stock": {"router": stock_router, "prefix": "/api/stock"},
    "gold": {"router": gold_router, "prefix": "/api/gold"},
    "real_estate": {"router": real_estate_router, "prefix": "/api/realestate"},
    "phi_model": {"router": phi_model_router, "prefix": "/api/phi"}
}

for service, config in service_config.items():
    try:
        app.include_router(config["router"], prefix=config["prefix"], tags=[service.title()])
        print(f"✅ {service.title()} service loaded")
    except Exception as e:
        print(f"❌ Failed to load {service} service: {str(e)}")

# === Health Check ===
@app.get("/api/health")
async def health_check():
    return {
        "status": "operational",
        "services": list(service_config.keys()),
        "model_status": "loaded" if model else "offline"
    }

# === Root Endpoint ===
@app.get("/")
async def root():
    return {
        "message": "AI Financial Advisor API",
        "version": app.version,
        "documentation": "/api/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        ssl_keyfile="./localhost-key.pem",
        ssl_certfile="./localhost.pem"
    )