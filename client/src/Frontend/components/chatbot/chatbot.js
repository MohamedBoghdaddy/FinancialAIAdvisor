import { useState, useEffect, useRef } from "react";
import useChat from "../../../hooks/useChat";
import { useAuthContext } from "../../../context/AuthContext"; // Import AuthContext for user ID
import "../styles/chat.css";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:4000/api/chat";

const Chatbot = () => {
  const { messages, addMessage } = useChat();
  const { user } = useAuthContext(); // Get logged-in user
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // ✅ Scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Handle sending messages
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    addMessage(input, "user");
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input, // Fixed variable name
          userId: user?._id || null, // Include user ID if available
        }),
      });

      const data = await response.json();

      // ✅ Format JSON responses for readability
      const formattedResponse =
        typeof data.response === "object"
          ? `<pre>${JSON.stringify(data.response, null, 2)}</pre>` // Preformatted JSON
          : data.response;

      addMessage(formattedResponse, "bot");
    } catch (error) {
      addMessage("❌ Error fetching response. Please try again.", "bot");
      console.error("Chatbot API Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}-message`}>
            <span dangerouslySetInnerHTML={{ __html: msg.text }} />
          </div>
        ))}
        <div ref={chatEndRef} /> {/* Ensures auto-scroll */}
      </div>

      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="chat-input"
          placeholder="Ask a financial question..."
          disabled={loading}
        />
        <button type="submit" className="chat-button" disabled={loading}>
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
