"""Goal-planning endpoint, powered by the local Qwen LLM.

Previously this loaded the Phi-2 fine-tuned model eagerly at import time
from a local ./phi2-finetuned directory that is not checked into the repo,
which made the whole app fail to start. It now reuses the shared, lazily
loaded Qwen model from agent.qwen.loader.
"""
import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agent.qwen import loader, safety
from agent.qwen.prompts import FINANCIAL_DISCLAIMER

router = APIRouter(tags=["Goals"])


class GoalRequest(BaseModel):
    profile: dict
    advice: dict


@router.post("/generate")
def generate_goal_plan(req: GoalRequest):
    profile_text = "\n".join(f"{k}: {v}" for k, v in req.profile.items())
    advice_text = "\n".join(req.advice.get("advice", []))

    prompt = (
        "You're an AI financial coach helping users turn advice into "
        "actionable goals.\n\n"
        f"User Profile:\n{profile_text}\n\n"
        f"AI Advice:\n{advice_text}\n\n"
        "### TASK:\n"
        "Generate 2-3 long-term goals. For each goal, break it into 2-3 "
        "milestones with suggested target dates (these are estimates, not "
        "commitments). Respond with STRICT JSON only, no markdown, in this "
        "exact shape:\n"
        '[{"goal": "...", "milestones": [{"task": "...", "target_date": "YYYY-MM"}]}]'
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a financial planning assistant. Always respond "
                "with valid JSON only, matching the requested shape."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    try:
        raw = loader.generate(messages, temperature=0.7, top_p=0.95)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"LLM unavailable: {str(e)}")

    goals = safety.extract_json(raw)
    if goals is None:
        # extract_json only handles objects; try a JSON array fallback.
        try:
            start, end = raw.find("["), raw.rfind("]") + 1
            goals = json.loads(raw[start:end])
        except (ValueError, json.JSONDecodeError):
            raise HTTPException(
                status_code=502, detail="Model did not return valid JSON"
            )

    return {"goals": goals, "disclaimer": FINANCIAL_DISCLAIMER}
