import React, { useState } from "react";
import axios from "axios";
import "../styles/chhat.css";
import { useAuthContext } from "../../../context/AuthContext";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

const Chatbot = () => {
  const [goal, setGoal] = useState("investment");
  const { state } = useAuthContext();
  const { user, isAuthenticated } = state;

  const [profile, setProfile] = useState({
    income: 10000,
    rent: 2000,
    utilities: 800,
    dietPlan: "Moderate",
    transportCost: 500,
    otherRecurring: 1000,
    savingAmount: 2000,
    customExpenses: [],
    modelPredictions: {
      gold: "6%",
      stocks: "9%",
      real_estate: "4%"
    },
    marketVolatility: {
      gold: "0.02",
      stocks: "0.06",
      real_estate: "0.01"
    }
  });

  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! I'm your AI Financial Advisor. What would you like help with?"
    }
  ]);
  const [loading, setLoading] = useState(false);

  const sendProfile = async () => {
    setLoading(true);
    setMessages(prev => [
      ...prev,
      { sender: "user", text: `Give me a ${goal.replace("_", " ")}.` }
    ]);

    const endpoint = `${API_URL}/chatbot/generate/${goal === "life_management" ? "life" : "investment"}`;

    try {
      const res = await axios.post(endpoint, profile);
      const formatted = JSON.stringify(res.data, null, 2);
      setMessages(prev => [...prev, { sender: "bot", text: formatted }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { sender: "bot", text: "❌ Something went wrong. Please try again." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">💬 AI Financial Advisor</div>

      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="chat-bubble bot">Typing...</div>}
      </div>

      <div className="chat-input-area">
        <select value={goal} onChange={(e) => setGoal(e.target.value)}>
          <option value="investment">Investment Plan</option>
          <option value="life_management">Life Management Plan</option>
        </select>
        <button onClick={sendProfile} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
