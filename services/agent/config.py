import os
from flask import Flask
from flask_pymongo import PyMongo
from dotenv import load_dotenv

# ✅ Load Environment Variables
load_dotenv("../server/.env")

# ✅ Flask App Initialization
app = Flask(__name__)

# ✅ MongoDB Configuration
app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb+srv://defaultUser:defaultPass@cluster0.mongodb.net/mydatabase?retryWrites=true&w=majority")
mongo = PyMongo(app)

# ✅ API Keys (Stored Securely in .env)
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
MARKETSTACK_API_KEY = os.getenv("MARKETSTACK_API_KEY")
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
BINANCE_SECRET_KEY = os.getenv("BINANCE_SECRET_KEY")
MEDIASTACK_API_KEY = os.getenv("MEDIASTACK_API_KEY")
HUGGINGFACEHUB_API_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")
