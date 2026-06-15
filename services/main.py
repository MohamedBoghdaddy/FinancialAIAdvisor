import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add project root to Python path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.append(PROJECT_ROOT)

# === Routers ===
try:
    from stock.stock_router import router as stock_router
    from gold.gold_router import router as gold_router
    from real_estate.real_estate_router import router as real_estate_router
    from agent.qwen.router import router as qwen_router
    from routes.chatbot import router as chatbot_router
    from routes.goals_router import router as goals_router
    from ds.router import router as ds_router
    from security.router import router as security_router
except ImportError as e:
    print(f"❌ Import Error: {str(e)}")
    print("Verify directory structure and __init__.py files:")
    print("services/")
    print("├── stock/")
    print("├── gold/")
    print("├── real_estate/")
    print("├── routes/")
    print("└── agent/qwen/")
    sys.exit(1)

# === FastAPI App Initialization ===
app = FastAPI(
    title="FinGenie API",
    version="2.0.0",
    description="FinGenie - AI Personal Finance Intelligence Platform",
    docs_url="/api/docs"
)

# === CORS Configuration ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React frontend
        "http://localhost:4000",  # Optional Express backend
        "*",                      # Allow all during development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Register Services ===
service_config = {
    "stock": {"router": stock_router, "prefix": "/api/stock"},
    "gold": {"router": gold_router, "prefix": "/api/gold"},
    "real_estate": {"router": real_estate_router, "prefix": "/api/realestate"},
    "llm": {"router": qwen_router, "prefix": "/api/llm"},
    "chatbot": {"router": chatbot_router, "prefix": "/chatbot"},
    "goals": {"router": goals_router, "prefix": "/api/goals"},
    "ds": {"router": ds_router, "prefix": "/api/ds"},
    "security": {"router": security_router, "prefix": "/api/security"},
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
    from agent.qwen import loader

    return {
        "status": "operational",
        "services": list(service_config.keys()),
        "llm_model_status": "loaded" if loader.is_loaded() else "not_loaded",
    }

# === Root Endpoint ===
@app.get("/")
async def root():
    return {
        "message": "✅ FinGenie API is live",
        "version": app.version,
        "documentation": "/api/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=False,
    )
