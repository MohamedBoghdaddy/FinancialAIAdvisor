import { useState, useRef, useEffect } from "react";
import { useAuthContext } from "../../../context/AuthContext";
import "../styles/AIChat.css";

const AIChat = () => {
  const { state } = useAuthContext();
  const { user } = state;
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // ✅ Scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // ✅ Tries Flask API first, then falls back to Express, then FastAPI
  const sendMessageToAI = async (e) => {
    e.preventDefault();
    if (!user?._id || !user.salary || !userInput.trim()) return;

    // ✅ Add user message to chat instantly
    const newUserMessage = { role: "user", text: userInput };
    setChatHistory((prev) => [...prev, newUserMessage]);
    setUserInput("");
    setLoading(true);

    // ✅ API Endpoints
    const flaskAPI = "http://127.0.0.1:5000/api/chat";
    const expressAPI = "http://localhost:4000/api/chat";
    const fastAPI = "http://127.0.0.1:8000/api/chat"; // FastAPI fallback

    try {
      let response;

      // 🔹 Try Flask API first
      response = await fetch(flaskAPI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          salary: user.salary,
          message: userInput,
        }),
      });

      // 🔹 If Flask fails, try Express API
      if (!response.ok) {
        console.warn("⚠️ Flask API failed. Trying Express...");
        response = await fetch(expressAPI, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id,
            salary: user.salary,
            message: userInput,
          }),
        });
      }

      // 🔹 If Express also fails, try FastAPI
      if (!response.ok) {
        console.warn("⚠️ Express API failed. Trying FastAPI...");
        response = await fetch(fastAPI, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id,
            salary: user.salary,
            message: userInput,
          }),
        });
      }

      // 🔹 If all fail, show error
      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();

      // ✅ Append AI Response
      setChatHistory((prev) => [
        ...prev,
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
      <div className="chat-box">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`message ${msg.role}-message`}>
            <span dangerouslySetInnerHTML={{ __html: msg.text }} />
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

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
