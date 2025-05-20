import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Container,
  Card,
  Form,
  Button,
  Spinner,
  Alert,
  Badge,
  Modal,
} from "react-bootstrap";
import { useAuthContext } from "../../../context/AuthContext";
import axios from "axios";
import Cookies from "js-cookie";
import { FaStopCircle, FaCopy, FaLanguage } from "react-icons/fa";
import Select from "react-select";
import ReactMarkdown from "react-markdown";
import { ErrorBoundary } from "react-error-boundary";
import "../styles/chat.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const languageOptions = [
  { label: "English", value: "en" },
  { label: "Arabic", value: "ar" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Hindi", value: "hi" },
];

const useSpeech = () => {
  const synth = useRef(
    typeof window !== "undefined" ? window.speechSynthesis : null
  );
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
    className={`message ${msg.role === "user" ? "user-message" : "ai-message"}`}
  >
    <ReactMarkdown className="message-content">{msg.text}</ReactMarkdown>
    <div className="message-footer">
      <small className="message-timestamp">{msg.time}</small>
      {msg.role === "ai" && (
        <div className="message-actions">
          <Button variant="link" onClick={() => onCopy(msg.text)}>
            <FaCopy size={14} />
          </Button>
          <Button variant="link" onClick={() => onTranslate(msg.text)}>
            <FaLanguage size={14} />
          </Button>
        </div>
      )}
    </div>
  </div>
);

const ErrorFallback = () => (
  <Alert variant="danger" className="m-3">
    Something went wrong. Please refresh the page.
  </Alert>
);

const AIChat = () => {
  const { state } = useAuthContext();
  const { user, isAuthenticated } = state;
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [context, setContext] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [analysis, setAnalysis] = useState({ summary: null, full: null });
  const [selectedLanguage, setSelectedLanguage] = useState(languageOptions[0]);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [dots, setDots] = useState("");
  const [usedProfile, setUsedProfile] = useState(false);

  const { speak, stop } = useSpeech();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const fetchData = useCallback(async () => {
    const token = Cookies.get("token") || localStorage.getItem("token");
    if (!isAuthenticated || !token) return;

    try {
      const [historyRes, contextRes, questionnaireRes] = await Promise.all([
        axios.get(`${API_URL}/api/chat/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/api/chat/context/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/api/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setMessages(historyRes.data);
      setContext(contextRes.data);
      setQuestionnaire(questionnaireRes.data);
    } catch (err) {
      console.error("Initialization error:", err);
      setError("Failed to load chat data");
    }
  }, [isAuthenticated, user]);

  const analyzeProfile = useCallback(async () => {
    const token = Cookies.get("token") || localStorage.getItem("token");
    try {
      const res = await axios.post(
        `${API_URL}/analyze_profile`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const full = res.data.response;
      const summary = full.split("\n").slice(0, 3).join(" ");
      setAnalysis({ summary, full });

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: `🧠 **Financial Analysis Summary:**\n${summary}\n\n💡 **Suggested Questions:**\n- How can I improve my savings?\n- What investments suit my profile?\n- How to optimize my budget?`,
          time: formatTime(),
        },
      ]);
      setUsedProfile(true);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Failed to analyze financial profile");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const savedChat = localStorage.getItem("chatHistory");
    if (savedChat) setMessages(JSON.parse(savedChat));
  }, [fetchData]);

  useEffect(() => {
    if (questionnaire && !usedProfile) {
      analyzeProfile();
    }
  }, [questionnaire, usedProfile, analyzeProfile]);

  useEffect(() => {
    scrollToBottom();
    localStorage.setItem("chatHistory", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (isTyping) {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      text: input,
      time: formatTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);
    setError(null);

    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/chat`,
        { message: input, userId: user._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMessage = {
        role: "ai",
        text: response.data?.response || "No response generated",
        time: formatTime(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      speak(aiMessage.text);
    } catch (err) {
      console.error("Chat error:", err);
      setError("Failed to process your message. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          text: "❌ Sorry, I'm having trouble responding. Please try again.",
          time: formatTime(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const translateMessage = async (text) => {
    try {
      const res = await axios.post(`${API_URL}/translate`, {
        text,
        targetLang: selectedLanguage.value,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: `🌍 **Translation (${selectedLanguage.label}):** ${res.data.translation}`,
          time: formatTime(),
        },
      ]);
    } catch (err) {
      console.error("Translation error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          text: "❌ Translation failed",
          time: formatTime(),
        },
      ]);
    }
  };

  const resetChat = () => {
    localStorage.removeItem("chatHistory");
    setMessages([]);
    setUsedProfile(false);
    setAnalysis({ summary: null, full: null });
    setShowFullAnalysis(false);
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Container className="chatbot-container">
        <Card className="chat-card">
          <Card.Header className="chat-header">
            <div className="chat-title">
              <div className="chat-avatar">
                <img src="/ai-avatar.png" alt="AI Assistant" />
              </div>
              <div>
                <h5>💬 AI Financial Advisor</h5>
                <p className="chat-status">
                  <span className="status-icon">●</span> Online
                </p>
                {user?.username && (
                  <Badge bg="primary" className="ms-2">
                    {user.username}
                  </Badge>
                )}
              </div>
            </div>
            {context?.summary && (
              <div className="context-summary">
                <small>{context.summary}</small>
              </div>
            )}
          </Card.Header>

          <Card.Body className="chat-body">
            {questionnaire && (
              <div className="financial-profile">
                <h5>📋 Your Financial Profile</h5>
                {Object.entries(questionnaire).map(([key, value]) => (
                  <div key={key} className="profile-item">
                    <strong>{key.replace(/_/g, " ")}:</strong> {value}
                  </div>
                ))}
                {analysis.summary && (
                  <div className="analysis-summary">
                    <h6>🧠 Financial Analysis</h6>
                    <p>{analysis.summary}</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                    >
                      {showFullAnalysis ? "Hide Details" : "Show Full Analysis"}
                    </Button>
                    {showFullAnalysis && (
                      <div className="full-analysis">
                        <ReactMarkdown>{analysis.full}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="chat-messages-container">
              {messages.map((msg, index) => (
                <div
                  key={`${msg.time}-${index}`}
                  className={`message-row ${
                    msg.role === "user" ? "user-row" : "bot-row"
                  }`}
                >
                  <div className="message-avatar">
                    {msg.role === "user" ? "👤" : "🤖"}
                  </div>
                  <MessageBubble
                    msg={msg}
                    onCopy={copyToClipboard}
                    onTranslate={translateMessage}
                  />
                </div>
              ))}
              {isTyping && (
                <div className="typing-indicator">
                  <span>Generating response{dots}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </Card.Body>

          <Card.Footer className="chat-footer">
            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit} className="chat-form">
              <div className="chat-input-container">
                <Form.Control
                  as="textarea"
                  className="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about investments, savings, or financial planning..."
                  disabled={isLoading}
                  rows={1}
                />

                <div className="controls-wrapper">
                  <Select
                    className="language-select"
                    options={languageOptions}
                    value={selectedLanguage}
                    onChange={(option) => setSelectedLanguage(option)}
                    isSearchable={false}
                  />

                  <Button
                    variant="primary"
                    type="submit"
                    className="chat-send-btn"
                    disabled={isLoading || !input.trim()}
                  >
                    {isLoading ? <Spinner size="sm" /> : "↑"}
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={stop}
                    title="Stop speech"
                    className="stop-btn"
                  >
                    <FaStopCircle />
                  </Button>
                </div>
              </div>
            </Form>

            <Button
              variant="outline-danger"
              onClick={resetChat}
              className="mt-3"
              size="sm"
            >
              🗑️ Clear Chat History
            </Button>
          </Card.Footer>
        </Card>
      </Container>
    </ErrorBoundary>
  );
};

export default AIChat;
