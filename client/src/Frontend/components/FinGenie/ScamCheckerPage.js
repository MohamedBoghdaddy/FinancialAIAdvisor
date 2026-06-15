import React, { useState } from "react";
import axios from "axios";
import { FASTAPI_URL } from "../../../config/api";

const ScamCheckerPage = () => {
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [messageResult, setMessageResult] = useState(null);
  const [urlResult, setUrlResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${FASTAPI_URL}/api/security/scam-check`, {
        text: message,
      });
      setMessageResult(res.data);
    } catch (err) {
      setError("Unable to check this message right now.");
    } finally {
      setLoading(false);
    }
  };

  const checkUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${FASTAPI_URL}/api/security/phishing-check`, {
        url,
      });
      setUrlResult(res.data);
    } catch (err) {
      setError("Unable to check this link right now.");
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (risk) =>
    risk === "high" ? "#d32f2f" : risk === "medium" ? "#ed6c02" : "#2e7d32";

  return (
    <div style={{ maxWidth: "650px", margin: "2rem auto", padding: "0 1rem" }}>
      <h2>Scam & Phishing Checker</h2>
      <p style={{ color: "#555" }}>
        Paste a suspicious message or link to check it for common scam and
        phishing indicators. This is an automated heuristic check - when in
        doubt, don't click links or share codes/passwords.
      </p>

      <h3>Message / SMS / Email Text</h3>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        style={{ width: "100%", padding: "8px" }}
        placeholder="Paste the message text here..."
      />
      <button
        onClick={checkMessage}
        disabled={loading}
        style={{ marginTop: "8px", padding: "8px 16px", cursor: "pointer" }}
      >
        Check Message
      </button>

      {messageResult && (
        <div style={{ marginTop: "1rem" }}>
          <p>
            <strong>Risk level: </strong>
            <span style={{ color: riskColor(messageResult.risk_level) }}>
              {messageResult.risk_level.toUpperCase()}
            </span>
          </p>
          <p>{messageResult.explanation}</p>
          {messageResult.reasons.length > 0 && (
            <ul>
              {messageResult.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <h3 style={{ marginTop: "2rem" }}>Link</h3>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: "100%", padding: "8px" }}
        placeholder="https://example.com/..."
      />
      <button
        onClick={checkUrl}
        disabled={loading}
        style={{ marginTop: "8px", padding: "8px 16px", cursor: "pointer" }}
      >
        Check Link
      </button>

      {urlResult && (
        <div style={{ marginTop: "1rem" }}>
          <p>
            <strong>Risk level: </strong>
            <span style={{ color: riskColor(urlResult.risk_level) }}>
              {urlResult.risk_level.toUpperCase()}
            </span>
          </p>
          <p>{urlResult.explanation}</p>
          {urlResult.reasons.length > 0 && (
            <ul>
              {urlResult.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {(messageResult || urlResult) && (
        <p style={{ fontStyle: "italic", color: "#777", marginTop: "1rem" }}>
          {(messageResult || urlResult).disclaimer}
        </p>
      )}
    </div>
  );
};

export default ScamCheckerPage;
