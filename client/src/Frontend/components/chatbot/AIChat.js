import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  FormEvent,
} from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { FaStopCircle, FaCopy, FaLanguage } from "react-icons/fa";
import Select from "react-select";
import  ReactMarkdown  from "react-markdown";
import { useAuthContext } from "../../../context/AuthContext";
import { ErrorBoundary } from "react-error-boundary";
import "../styles/AIChat.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const languageOptions = [
  { label: "Arabic", value: "ar" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Hindi", value: "hi" },
];

const useSpeech = () => {
  const synth = useRef(window.speechSynthesis);
  useEffect(() => () => synth.current?.cancel(), []);
  const speak = useCallback((text) => {
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 200));
    utterance.lang = "en-US";
    synth.current?.speak(utterance);
  }, []);
  const stop = useCallback(() => synth.current?.cancel(), []);
  return { speak, stop };
};

const MessageBubble = ({ msg, onCopy, onTranslate }) => (
  <div
    className={`p-2 rounded-lg ${
      msg.role === "user"
        ? "bg-blue-100 text-blue-900 self-end"
        : "bg-gray-100 text-gray-800"
    }`}
  >
    <ReactMarkdown>{msg.text}</ReactMarkdown>
    <div className="flex justify-between items-center mt-1">
      <span className="text-[10px] text-gray-400">{msg.time}</span>
      {msg.role === "ai" && (
        <div className="flex space-x-2">
          <button onClick={() => onCopy(msg.text)}>
            <FaCopy size={12} />
          </button>
          <button onClick={() => onTranslate(msg.text)}>
            <FaLanguage size={12} />
          </button>
        </div>
      )}
    </div>
  </div>
);

const ErrorFallback = () => (
  <div className="p-4 bg-red-100 text-red-800 rounded-lg">
    Something went wrong. Please refresh the page.
  </div>
);

const AIChat = () => {
  const { state } = useAuthContext();
  const { user, isAuthenticated } = state;
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(languageOptions[0]);
  const [isTyping, setIsTyping] = useState(false);
  const [dots, setDots] = useState("");
  const [questionnaire, setQuestionnaire] = useState(null);
  const [financialAnalysis, setFinancialAnalysis] = useState(null);
  const chatEndRef = useRef(null);
  const { speak, stop } = useSpeech();

  const formatTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const fetchQuestionnaire = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    const token = Cookies.get("token") || localStorage.getItem("token");
    try {
      const res = await axios.get(
        "http://localhost:4000/api/questionnaire/latest",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setQuestionnaire(res.data);
    } catch (err) {
      console.error("❌ Questionnaire Error:", err);
    }
  }, [isAuthenticated, user]);

  const fetchFinancialAnalysis = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    const token = Cookies.get("token") || localStorage.getItem("token");
    try {
      const res = await axios.post(
        `${API_URL}/chat`,
        { userId: user._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFinancialAnalysis(res.data);
    } catch (err) {
      console.error("❌ Financial Analysis Error:", err);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchQuestionnaire();
    fetchFinancialAnalysis();
    const savedChat = localStorage.getItem("aiChatHistory");
    if (savedChat) setChat(JSON.parse(savedChat));
  }, [fetchQuestionnaire, fetchFinancialAnalysis]);

  useEffect(() => {
    if (chat.length)
      localStorage.setItem("aiChatHistory", JSON.stringify(chat));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  useEffect(() => {
    if (isTyping) {
      let count = 0;
      const interval = setInterval(() => {
        setDots(".".repeat((count % 3) + 1));
        count++;
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isTyping]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const translateMessage = async (text) => {
    try {
      const res = await axios.post(
        `${API_URL}/api/translate`,
        { text, langCode: selectedLanguage.value },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text: `🌍 ${selectedLanguage.label}: ${res.data.translatedText}`,
          time: formatTime(),
        },
      ]);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "❌ Translation failed", time: formatTime() },
      ]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setChat((prev) => [
      ...prev,
      { role: "user", text: input, time: formatTime() },
    ]);
    setInput("");
    setLoading(true);
    setIsTyping(true);
    try {
      await axios.get(`${API_URL}/api/health`);
      const res = await axios.post(
        `${API_URL}/api/chat`,
        { message: input, userId: user?._id },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      const reply = res.data?.reply || "No response";
      setChat((prev) => [
        ...prev,
        { role: "ai", text: `🤖 ${reply}`, time: formatTime() },
      ]);
      speak(reply);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "❌ Server error", time: formatTime() },
      ]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="ai-chat-container">
        <h2>💬 Financial AI Advisor</h2>

        {questionnaire ? (
          <div className="questionnaire-box">
            <h3>📋 Your Financial Profile</h3>
            {Object.entries(questionnaire).map(([k, v]) => (
              <p key={k}>
                <strong>{k.replace(/_/g, " ").toUpperCase()}:</strong>{" "}
                {v || "N/A"}
              </p>
            ))}
          </div>
        ) : (
          <p>❌ No questionnaire found.</p>
        )}

        {financialAnalysis ? (
          <div className="financial-analysis-box">
            <h3>📊 Financial Insights</h3>
            <p>
              <strong>Investment:</strong>{" "}
              {financialAnalysis.investment_recommendation || "N/A"}
            </p>
            <p>
              <strong>Behavior:</strong>{" "}
              {financialAnalysis.survey_analysis?.financial_behavior.join(
                ", "
              ) || "N/A"}
            </p>
          </div>
        ) : (
          <p>❌ No analysis found.</p>
        )}

        <div className="chat-box">
          {chat.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              onCopy={copyToClipboard}
              onTranslate={translateMessage}
            />
          ))}
          {isTyping && <div className="typing">Bot is typing{dots}</div>}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={sendMessage} className="chat-form">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="chat-input"
            placeholder="Ask about investments..."
            disabled={loading}
          />
          <button type="submit" className="chat-button" disabled={loading}>
            {loading ? "⏳" : "Send"}
          </button>
        </form>

        <div className="language-select">
          <Select
            options={languageOptions}
            value={selectedLanguage}
            onChange={(o) => o && setSelectedLanguage(o)}
            className="w-40"
            isSearchable={false}
          />
        </div>
        <button onClick={stop} className="stop-button">
          <FaStopCircle />
        </button>
      </div>
    </ErrorBoundary>
  );
};

export default AIChat;
