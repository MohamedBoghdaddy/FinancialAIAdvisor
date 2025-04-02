import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthContext } from "../../../context/AuthContext";
import Cookies from "js-cookie";
import "../styles/AIChat.css";

const CHAT_API_URL = "http://127.0.0.1:5000/api/chat"; // AI Chat API
const USER_ANALYSIS_API_URL = "http://127.0.0.1:5000/api/user"; // User Financial Analysis API

const AIChat = () => {
  const { state } = useAuthContext();
  const { user, isAuthenticated } = state;
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [financialAnalysis, setFinancialAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // ✅ Fetch User Financial Analysis from `/api/user`
  const fetchFinancialAnalysis = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      let token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found.");

      console.log("🔍 Fetching Financial Analysis...");
      const response = await fetch(USER_ANALYSIS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ userId: user._id }),
      });

      if (!response.ok)
        throw new Error(`Failed to fetch analysis: ${response.status}`);

      const data = await response.json();
      setFinancialAnalysis(data);
    } catch (error) {
      console.error("❌ Financial Analysis Fetch Error:", error.message);
    }
  }, [isAuthenticated, user]);

  // ✅ Fetch the latest questionnaire
  const fetchQuestionnaire = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      let token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found.");

      console.log("🔍 Fetching Questionnaire...");
      const response = await fetch(
        "http://localhost:4000/api/questionnaire/latest",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok)
        throw new Error(`Failed to fetch questionnaire: ${response.status}`);

      const data = await response.json();
      setQuestionnaire(data);
    } catch (error) {
      console.error("❌ Questionnaire Fetch Error:", error.message);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchQuestionnaire();
    fetchFinancialAnalysis();
  }, [fetchQuestionnaire, fetchFinancialAnalysis]);

  // ✅ Scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // ✅ Handle User Message Submission
const sendMessageToAI = async (e) => {
  e.preventDefault();
  if (!userInput.trim()) {
    console.warn("⚠️ Missing User Data or Empty Input.");
    return;
  }

  console.log("🔍 Sending message:", userInput);

  setChatHistory((prev) => [...prev, { role: "user", text: userInput }]);
  setUserInput("");
  setLoading(true);

  try {
    let token =
      user?.token || Cookies.get("token") || localStorage.getItem("token");

    const response = await fetch("http://127.0.0.1:5000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include", // ✅ Ensures cookies and authentication headers are sent
      body: JSON.stringify({
        userId: user._id,
        message: userInput,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Server Error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    setChatHistory((prev) => [
      ...prev,
      {
        role: "ai",
        text: `🤖 AI: ${data.response || "No response available."}`,
      },
    ]);
  } catch (error) {
    console.error("❌ AI Chat Error:", error);
    setChatHistory((prev) => [
      ...prev,
      { role: "ai", text: "❌ AI is unavailable. Try again later." },
    ]);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="ai-chat-container">
      <h2>💬 Financial AI Advisor</h2>

      {/* 📋 Financial Profile */}
      {financialAnalysis ? (
        <div className="financial-analysis-box">
          <h3>📊 Financial Insights</h3>
          <p>
            <strong>Investment Recommendation:</strong>{" "}
            {financialAnalysis.investment_recommendation || "N/A"}
          </p>
          <p>
            <strong>Behavior Analysis:</strong>{" "}
            {financialAnalysis.survey_analysis?.financial_behavior.join(", ") ||
              "N/A"}
          </p>
        </div>
      ) : (
        <p className="no-financial-analysis">❌ No financial analysis found.</p>
      )}

      {/* 📋 Questionnaire */}
      {questionnaire ? (
        <div className="questionnaire-box">
          <h3>📋 Your Financial Profile</h3>
          {Object.entries(questionnaire).map(([key, value]) => (
            <p key={key}>
              <strong>{key.replace(/_/g, " ").toUpperCase()}:</strong>{" "}
              {value || "N/A"}
            </p>
          ))}
        </div>
      ) : (
        <p className="no-questionnaire">❌ No questionnaire found.</p>
      )}

      {/* 💬 Chatbox */}
      <div className="chat-box">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`message ${msg.role}-message`}>
            <span dangerouslySetInnerHTML={{ __html: msg.text }} />
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* 📝 Input Field */}
      <form onSubmit={sendMessageToAI} className="chat-form">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          className="chat-input"
          placeholder="Ask about investments..."
          disabled={loading}
        />
        <button type="submit" className="chat-button" disabled={loading}>
          {loading ? "⏳ Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default AIChat;
