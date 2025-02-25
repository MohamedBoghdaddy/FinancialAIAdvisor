import { useState, useRef, useEffect } from "react";
import { useAuthContext } from "../../../context/AuthContext";
import Cookies from "js-cookie";
import "../styles/AIChat.css";

const API_URLS = [
  "http://127.0.0.1:5000/api/chat", // Flask API
  "http://localhost:4000/api/chat/chat", // Express API
  "http://127.0.0.1:8000/api/chat", // FastAPI
];

const AIChat = () => {
  const { state } = useAuthContext();
  const { user, isAuthenticated } = state;
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // ✅ Fetch the latest questionnaire when the user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.warn(
        "🚫 User is not authenticated. Skipping questionnaire fetch."
      );
      return;
    }

    const fetchQuestionnaire = async () => {
      try {
        let token = Cookies.get("token") || localStorage.getItem("token");

        if (!token) {
          console.error("❌ No token found. Ensure the user is logged in.");
          return;
        }

        const response = await fetch(
          "http://localhost:4000/api/questionnaire/latest",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`, // ✅ Ensure token is sent
              "Content-Type": "application/json",
            },
            credentials: "include", // ✅ Allow cookies to be sent
          }
        );

        if (!response.ok)
          throw new Error(
            `Failed to fetch questionnaire. Status: ${response.status}`
          );

        const data = await response.json();
        setQuestionnaire(data);
      } catch (error) {
        console.error("❌ Error fetching questionnaire:", error.message);
      }
    };

    fetchQuestionnaire();
  }, [isAuthenticated, user]);

  // ✅ Scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // ✅ Handles user message and sends it to AI API
  const sendMessageToAI = async (e) => {
    e.preventDefault();
    if (!user?._id || !user.salary || !userInput.trim()) return;

    const newUserMessage = { role: "user", text: userInput };
    setChatHistory((prev) => [...prev, newUserMessage]);
    setUserInput("");
    setLoading(true);

    try {
      let response;
      for (const url of API_URLS) {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id,
            salary: user.salary,
            message: userInput,
          }),
        });

        if (response.ok) break;
      }

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();

      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: `🤖 AI Agent: Analyzing data...` },
        { role: "ai", text: data.response || "🤖 No response from AI." },
      ]);
    } catch (error) {
      console.error("❌ Error chatting with AI:", error);
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: "❌ AI is unavailable." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-chat-container">
      <h2>💬 Financial AI Advisor</h2>

      {/* 📌 Read-Only Questionnaire Data */}
      {questionnaire ? (
        <div className="questionnaire-box">
          <h3>📋 Your Financial Profile</h3>
          <p>
            <strong>Age:</strong> {questionnaire.age || "N/A"}
          </p>
          <p>
            <strong>Employment Status:</strong>{" "}
            {questionnaire.employmentStatus || "N/A"}
          </p>
          <p>
            <strong>Home Ownership:</strong>{" "}
            {questionnaire.homeOwnership || "N/A"}
          </p>
          <p>
            <strong>Debt Status:</strong> {questionnaire.hasDebt ? "Yes" : "No"}
          </p>
          <p>
            <strong>Lifestyle:</strong> {questionnaire.lifestyle || "N/A"}
          </p>
          <p>
            <strong>Risk Tolerance:</strong>{" "}
            {questionnaire.riskTolerance || "N/A"}
          </p>
          <p>
            <strong>Dependents:</strong> {questionnaire.dependents || "N/A"}
          </p>
          <p>
            <strong>Financial Goals:</strong>{" "}
            {questionnaire.financialGoals || "N/A"}
          </p>
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
