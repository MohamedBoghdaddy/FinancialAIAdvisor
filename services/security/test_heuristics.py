from . import heuristics


def test_analyze_message_flags_scam_pattern():
    text = (
        "URGENT: Your account has been suspended. Verify your account "
        "immediately by sending your one-time password and pay a processing fee "
        "via gift card to https://secure-login-update.zip/verify"
    )
    result = heuristics.analyze_message(text)
    assert result["is_suspicious"] is True
    assert result["risk_level"] == "high"
    assert result["reasons"]


def test_analyze_message_benign_text():
    text = "Hey, are we still on for lunch tomorrow?"
    result = heuristics.analyze_message(text)
    assert result["is_suspicious"] is False
    assert result["risk_level"] == "low"
    assert result["reasons"] == []


def test_analyze_url_raw_ip_is_suspicious():
    result = heuristics.analyze_url("http://192.168.1.1/login")
    assert result["is_suspicious"] is True
    assert result["risk_level"] in ("medium", "high")


def test_analyze_url_normal_https_is_not_suspicious():
    result = heuristics.analyze_url("https://www.example.com/account")
    assert result["is_suspicious"] is False
    assert result["risk_level"] == "low"
