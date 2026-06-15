"""Safety helpers: prompt-injection guards and structured JSON parsing.

These are intentionally simple, deterministic heuristics layered on top of
the LLM output - they do not replace the LLM's own judgement but provide a
defensive fallback so the API never crashes or returns raw garbage to the
client.
"""
import json
import re

# Phrases that suggest an attempt to override the system prompt / safety
# rules. Used to flag (not silently rewrite) user input before it reaches
# the LLM.
PROMPT_INJECTION_PATTERNS = [
    r"ignore (all|any|the) (previous|prior|above) instructions",
    r"disregard (all|any|the) (previous|prior|above) (instructions|rules)",
    r"you are now",
    r"new system prompt",
    r"act as (an? )?(unfiltered|jailbroken|dan)",
    r"reveal your (system )?prompt",
    r"bypass (your )?(safety|content) (filters|guidelines)",
]

_INJECTION_RE = re.compile("|".join(PROMPT_INJECTION_PATTERNS), re.IGNORECASE)

# Keywords that indicate a request for a high-risk financial action. Used by
# the intent endpoint as a deterministic backstop in case the LLM's JSON
# misses an obvious case.
FORBIDDEN_ACTION_KEYWORDS = [
    "transfer", "send money", "wire", "withdraw", "pay ", "buy ", "sell ",
    "delete account", "delete user", "remove user", "make admin",
    "change password", "reset password", "grant admin", "revoke admin",
]


def contains_prompt_injection(text: str) -> bool:
    return bool(_INJECTION_RE.search(text or ""))


def mentions_forbidden_action(text: str) -> bool:
    lowered = (text or "").lower()
    return any(keyword in lowered for keyword in FORBIDDEN_ACTION_KEYWORDS)


def extract_json(raw: str) -> dict | None:
    """Best-effort extraction of a JSON object from an LLM response.

    Handles the common case where the model wraps JSON in markdown code
    fences or adds extra commentary around it.
    """
    if not raw:
        return None

    text = raw.strip()

    # Strip markdown code fences if present.
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1)

    # Try direct parse first.
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Fall back to grabbing the first {...} block.
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            return None

    return None
