"""Deterministic, dependency-free heuristics for scam/phishing detection.

These run without the LLM so the endpoints stay fast and always available.
The LLM-backed /api/llm/scam-check endpoint can be used for deeper analysis
of free-form text.
"""
import re
from urllib.parse import urlparse

URGENCY_PATTERNS = [
    r"act now", r"urgent", r"immediately", r"verify your account",
    r"suspend(ed)?", r"limited time", r"final notice", r"within 24 hours",
    r"your account (will be|has been) (locked|closed|suspended)",
]

CREDENTIAL_REQUEST_PATTERNS = [
    r"\botp\b", r"one[- ]time (password|code)", r"\bpin\b", r"password",
    r"verification code", r"security code", r"cvv", r"card number",
]

MONEY_REQUEST_PATTERNS = [
    r"gift card", r"wire transfer", r"send money", r"western union",
    r"bitcoin", r"crypto(currency)?", r"processing fee", r"claim your prize",
    r"you('ve| have) won",
]

SUSPICIOUS_TLDS = {"zip", "top", "xyz", "click", "info", "loan", "work"}


def _matches_any(text: str, patterns: list[str]) -> list[str]:
    lowered = text.lower()
    return [p for p in patterns if re.search(p, lowered)]


def analyze_message(text: str) -> dict:
    """Heuristic scam analysis for a message body (email/SMS/chat)."""
    reasons: list[str] = []

    urgency_hits = _matches_any(text, URGENCY_PATTERNS)
    if urgency_hits:
        reasons.append("Uses urgency/pressure language typical of scams.")

    credential_hits = _matches_any(text, CREDENTIAL_REQUEST_PATTERNS)
    if credential_hits:
        reasons.append("Requests sensitive credentials (password, OTP, PIN, card details).")

    money_hits = _matches_any(text, MONEY_REQUEST_PATTERNS)
    if money_hits:
        reasons.append("Requests money transfer, gift cards, or crypto payment.")

    urls = re.findall(r"https?://[^\s]+", text)
    suspicious_urls = [u for u in urls if _is_suspicious_url(u)]
    if suspicious_urls:
        reasons.append("Contains links to suspicious or unusual domains.")

    score = len(urgency_hits) + len(credential_hits) * 2 + len(money_hits) * 2 + len(suspicious_urls) * 2

    if score >= 4:
        risk_level = "high"
    elif score >= 1:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "is_suspicious": score > 0,
        "risk_level": risk_level,
        "reasons": reasons,
        "suspicious_urls": suspicious_urls,
    }


def _is_suspicious_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ""
    except ValueError:
        return True

    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", host):
        return True

    tld = host.rsplit(".", 1)[-1].lower() if "." in host else ""
    if tld in SUSPICIOUS_TLDS:
        return True

    if host.count("-") >= 3:
        return True

    return False


def analyze_url(url: str) -> dict:
    """Heuristic phishing analysis for a single URL."""
    reasons: list[str] = []

    if _is_suspicious_url(url):
        try:
            host = urlparse(url).hostname or url
        except ValueError:
            host = url

        if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", host):
            reasons.append("URL uses a raw IP address instead of a domain name.")
        else:
            reasons.append(f"Domain '{host}' uses a pattern commonly seen in phishing links.")

    if not url.lower().startswith("https://"):
        reasons.append("Link does not use HTTPS.")

    risk_level = "high" if len(reasons) >= 2 else ("medium" if reasons else "low")

    return {
        "is_suspicious": bool(reasons),
        "risk_level": risk_level,
        "reasons": reasons,
    }
