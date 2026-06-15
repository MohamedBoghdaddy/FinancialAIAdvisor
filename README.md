# FinGenie - AI Personal Finance Intelligence Platform

FinGenie helps people understand their finances using a local LLM, statistical
analysis, and rule-based heuristics. It includes budgeting and goal-planning
tools, forecasting models for stocks/gold/real estate, a financial health
score, a scam/phishing checker, a security center, and a tap-to-speak voice
command foundation.

> **FinGenie is an educational tool, not a licensed financial advisor.** It does
> not guarantee investment returns and cannot move money, place trades, or
> change account security settings - by voice or otherwise. See the in-app
> "AI Trust Center" page for details.

## Architecture

The project has three parts:

| Folder | Stack | Purpose |
| --- | --- | --- |
| `client/` | React | Web frontend |
| `server/` | Node.js / Express / MongoDB | Auth, user data, audit logging, security & voice command APIs, proxy to `services/` |
| `services/` | Python / FastAPI | Forecasting models (stock, gold, real estate), local LLM (Qwen2.5-1.5B-Instruct), data science endpoints, scam/phishing heuristics |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB (local or Atlas)

### 1. Clone the repository

```bash
git clone https://github.com/MohamedBoghdaddy/FinancialAIAdvisor.git
cd FinancialAIAdvisor
```

### 2. Configure environment variables

Each subproject has a `.env.example` file. Copy it to `.env` and fill in real
values:

```bash
cp server/.env.example server/.env
cp services/.env.example services/.env
cp client/.env.example client/.env
```

At minimum, set `JWT_SECRET` and `MONGO_URL` in `server/.env` (and the same
`JWT_SECRET` in `services/.env`, since the FastAPI service verifies tokens
issued by the Node server).

### 3. Install dependencies

```bash
# Backend (Node)
cd server
npm install

# Frontend
cd ../client
npm install

# AI/ML services (Python)
cd ../services
pip install -r requirements.txt
```

### 4. Run the apps

```bash
# Terminal 1 - Node API (http://localhost:4000)
cd server
npm run dev

# Terminal 2 - FastAPI services (http://localhost:8000)
cd services
uvicorn main:app --reload

# Terminal 3 - React frontend (http://localhost:3000)
cd client
npm start
```

## Key Features

### Financial planning & forecasting
- Goal planning with milestone suggestions (Qwen2.5-1.5B-Instruct)
- Stock, gold, and real estate forecasting models with a `/metrics` endpoint
  reporting real backtest MAE/RMSE/R2 (no placeholder values)
- **Financial Health Score** - a transparent, weighted score based on savings
  rate, expense-to-income ratio, and emergency fund coverage
- **Scenario Simulator** - month-by-month projection of savings under
  different income/expense/return assumptions

### Cyber-finance protection
- **Scam & Phishing Checker** - heuristic analysis of messages and links for
  common scam patterns (urgency language, credential/money requests,
  suspicious URLs/TLDs)
- **Security Center** - account security score, recent activity (audit log),
  and an admin-only platform security overview

### Voice commands (foundation)
- Tap-to-speak only - no always-listening mode
- Commands are classified by risk level (low/medium/high) using the local LLM
  plus a deterministic safety backstop
- Medium-risk actions require confirmation; high-risk actions (money
  movement, security changes) are always blocked

### AI Trust Center
A dedicated in-app page explaining what FinGenie can and cannot do, how
metrics and heuristics work, and their limitations.

## API Overview

| Service | Base path | Notes |
| --- | --- | --- |
| Node | `/api/users`, `/api/profile`, `/api/security`, `/api/voice`, `/api/loan`, `/api/expenses`, `/api/currency` | Auth-gated, talks to MongoDB |
| FastAPI | `/api/stock`, `/api/gold`, `/api/realestate` | Forecasting + `/metrics` |
| FastAPI | `/api/llm` | Qwen2.5-1.5B-Instruct: `/generate`, `/financial-advice`, `/intent`, `/scam-check` |
| FastAPI | `/api/ds` | Financial health score, anomaly detection, scenario simulation, segmentation |
| FastAPI | `/api/security` | Scam/phishing heuristics |
| FastAPI | `/chatbot` | Gemini-based chat (optional, requires `GEMINI_API_KEY`) |

Interactive API docs are available at `http://localhost:8000/api/docs` once
the FastAPI service is running.

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE)
file for details.
