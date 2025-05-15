import React, { useState, useEffect, useRef, useCallback } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { FaStopCircle, FaCopy, FaLanguage } from "react-icons/fa";
import Select from "react-select";
import ReactMarkdown from "react-markdown";
import { useAuthContext } from "../../../context/AuthContext";
import { ErrorBoundary } from "react-error-boundary";
import "../styles/AIChat.css";

const API_URL = "http://localhost:8000/phi-model";
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
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 250));
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
  const [isTyping, setIsTyping] = useState(false);
  const [dots, setDots] = useState("");
  const [questionnaire, setQuestionnaire] = useState(null);
  const [analysisSummary, setAnalysisSummary] = useState(null);
  const [analysisFull, setAnalysisFull] = useState(null);
  const [usedProfile, setUsedProfile] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(languageOptions[0]);

  const chatEndRef = useRef(null);
  const { speak, stop } = useSpeech();

  const formatTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const fetchQuestionnaire = useCallback(async () => {
    const token = Cookies.get("token") || localStorage.getItem("token");
    if (!isAuthenticated || !token) return;
    try {
      const res = await axios.get(
        "http://localhost:4000/api/questionnaire/latest",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQuestionnaire(res.data);
    } catch (err) {
      console.error("❌ Questionnaire Error:", err);
    }
  }, [isAuthenticated]);

  const runProfileAnalysis = useCallback(async () => {
    const token = Cookies.get("token") || localStorage.getItem("token");
    try {
      const res = await axios.post(
        `${API_URL}/analyze_profile`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const full = res.data.response;
      const short = full.split("\n").slice(0, 3).join(" ");
      setAnalysisSummary(short);
      setAnalysisFull(full);
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text: `🧠 Summary Analysis:\n${short}\n\n💡 Try asking:\n• How to save more?\n• Where should I invest?\n• How to budget better?`,
          time: formatTime(),
        },
      ]);
      setUsedProfile(true);
    } catch (err) {
      console.error("❌ Failed to analyze profile:", err);
    }
  }, []);

  useEffect(() => {
    fetchQuestionnaire();
    const savedChat = localStorage.getItem("aiChatHistory");
    if (savedChat) setChat(JSON.parse(savedChat));
  }, [fetchQuestionnaire]);

  useEffect(() => {
    if (questionnaire && !usedProfile) {
      runProfileAnalysis();
    }
  }, [questionnaire, usedProfile, runProfileAnalysis]);

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
      const res = await axios.post(`${API_URL}/infer`, {
        instruction: `Translate this to ${selectedLanguage.label}:\n\n${text}`,
      });
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text: `🌍 ${selectedLanguage.label}: ${res.data.response}`,
          time: formatTime(),
        },
      ]);
    } catch (err) {
      console.error("Translation failed", err);
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "❌ Translation failed", time: formatTime() },
      ]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const token = Cookies.get("token") || localStorage.getItem("token");

    setChat((prev) => [
      ...prev,
      { role: "user", text: input, time: formatTime() },
    ]);
    setInput("");
    setLoading(true);
    setIsTyping(true);

    try {
      const res = await axios.post(
        `${API_URL}/chat`,
        { instruction: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const reply = res.data?.response || "No reply generated.";
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
        <h2>
          💬 Financial AI Advisor{" "}
          {user?.user?.username && `- Welcome, ${user.user.username}`}
        </h2>

        {questionnaire && (
          <div className="questionnaire-box">
            <h3>📋 Your Financial Profile</h3>
            {Object.entries(questionnaire).map(([k, v]) => (
              <p key={k}>
                <strong>{k.replace(/_/g, " ").toUpperCase()}:</strong> {v}
              </p>
            ))}
            {analysisSummary && (
              <div className="summary-box">
                <p>
                  <strong>🧠 Summary Advice:</strong> {analysisSummary}
                </p>
                <button onClick={() => setShowFull(!showFull)}>
                  {showFull ? "Hide Full Advice" : "Show Full Advice"}
                </button>
                {showFull && (
                  <pre className="full-analysis">{analysisFull}</pre>
                )}
              </div>
            )}
          </div>
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
            placeholder="Ask about savings, investing, or goals..."
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
        <button
          onClick={() => {
            localStorage.clear();
            setChat([]);
            setUsedProfile(false);
            setAnalysisFull(null);
            setAnalysisSummary(null);
          }}
          className="reset-btn"
        >
          🗑️ Clear Chat & Advice
        </button>
      </div>
    </ErrorBoundary>
  );
};

export default AIChat;
