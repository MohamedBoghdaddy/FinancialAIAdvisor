import React, { useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { NODE_API_URL } from "../../../config/api";

/**
 * Tap-to-speak voice command UI. There is NO always-listening mode - the
 * microphone only activates while the user holds/clicks "Start Listening"
 * and stops as soon as a result (or silence) is detected.
 */
const VoiceCommandPage = () => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const startListening = () => {
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    setError(null);
    setResult(null);
    setTranscript("");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      sendCommand(text);
    };

    recognition.onerror = () => {
      setError("Could not capture audio. Please try again.");
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const sendCommand = async (text) => {
    try {
      const res = await axios.post(
        `${NODE_API_URL}/api/voice/command`,
        { text },
        { withCredentials: true }
      );
      setResult(res.data.data);
    } catch (err) {
      setError("Unable to process this command right now.");
    }
  };

  const execute = async (confirmed = false) => {
    if (!result) return;
    try {
      const res = await axios.post(
        `${NODE_API_URL}/api/voice/execute`,
        { intent: result.intent, parameters: result.parameters, confirmed },
        { withCredentials: true }
      );
      const data = res.data.data;
      if (data.status === "executed" && data.route) {
        navigate(data.route);
      } else {
        setResult({ ...result, executionStatus: data.status });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "This action could not be performed."
      );
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "0 1rem" }}>
      <h2>Voice Commands</h2>
      <p style={{ color: "#555" }}>
        Tap the button and speak a command, like "open dashboard" or "show my
        financial health score". FinGenie never listens in the background,
        and will never transfer money, place trades, or change account
        security settings by voice.
      </p>

      <button
        onClick={listening ? stopListening : startListening}
        style={{
          padding: "14px 28px",
          backgroundColor: listening ? "#d32f2f" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "999px",
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        {listening ? "Stop Listening" : "Tap to Speak"}
      </button>

      {transcript && (
        <p style={{ marginTop: "1rem" }}>
          <strong>You said:</strong> "{transcript}"
        </p>
      )}

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "1rem" }}>
          <p>
            <strong>Intent:</strong> {result.intent} ({result.risk_level} risk)
          </p>

          {result.action_required === "blocked" && (
            <p style={{ color: "#d32f2f" }}>
              This action cannot be performed by voice for your safety.
              Please use the app's normal interface.
            </p>
          )}

          {result.action_required === "confirm" && !result.executionStatus && (
            <div>
              <p>This action changes a setting. Do you want to continue?</p>
              <button onClick={() => execute(true)} style={{ marginRight: "8px" }}>
                Yes, continue
              </button>
              <button onClick={() => setResult(null)}>Cancel</button>
            </div>
          )}

          {result.action_required === "execute" && !result.executionStatus && (
            <button onClick={() => execute(false)}>Run</button>
          )}

          {result.executionStatus && <p>Status: {result.executionStatus}</p>}
        </div>
      )}
    </div>
  );
};

export default VoiceCommandPage;
