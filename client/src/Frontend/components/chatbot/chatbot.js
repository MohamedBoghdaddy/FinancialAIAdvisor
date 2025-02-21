import { useState } from "react";
import useChat from "../../../hooks/useChat";
import "../styles/chat.css";

const Chatbot = () => {
  const { messages, addMessage } = useChat();
  const [input, setInput] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    addMessage(input, "user");
    setInput("");

    try {
      const response = await fetch("http://localhost:4000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await response.json();
      // Format JSON response
      let formattedResponse = "";
      if (typeof data.response === "object") {
        formattedResponse = JSON.stringify(data.response, null, 2) // Pretty print JSON
          .replace(/\\n/g, "<br>") // Preserve line breaks
          .replace(/ /g, "&nbsp;"); // Preserve spaces for alignment
      } else {
        formattedResponse = data.response;
      }
      addMessage(formattedResponse, "bot");
    } catch (error) {
      addMessage("Error fetching response.", "bot");
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
      </div>

      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="chat-input"
          placeholder="Type your financial question..."
        />
        <button type="submit" className="chat-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
