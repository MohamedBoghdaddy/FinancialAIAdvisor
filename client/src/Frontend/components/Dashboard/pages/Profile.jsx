import React, { useState, useEffect, useContext, useCallback } from "react";
import PropTypes from "prop-types";
import { useAuthContext } from "../../../../context/AuthContext";
import { DashboardContext } from "../../../../context/DashboardContext";
import { BsPersonCircle } from "react-icons/bs";
import { toast } from "react-toastify";
import html2pdf from "html2pdf.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "../../styles/Profile.css";

const questions = [
  { id: "age", text: "What's your age?", type: "number", min: 18, max: 120 },
  {
    id: "employmentStatus",
    text: "What's your employment status?",
    type: "select",
    options: ["Employed", "Self-employed", "Unemployed", "Student", "Retired"],
  },
  { id: "salary", text: "Your Salary?", type: "number", min: 0 },
  {
    id: "homeOwnership",
    text: "Do you own or rent your home?",
    type: "select",
    options: ["Own", "Rent", "Other"],
  },
  {
    id: "hasDebt",
    text: "Do you currently have any debts?",
    type: "select",
    options: ["Yes", "No"],
  },
  {
    id: "lifestyle",
    text: "What type of lifestyle best describes you?",
    type: "select",
    options: [
      { label: "Minimalist (low spending, high saving)", value: "Minimalist" },
      { label: "Balanced (moderate spending & saving)", value: "Balanced" },
      { label: "Spender (high spending, lower saving)", value: "Spender" },
    ],
  },
  {
    id: "riskTolerance",
    text: "How comfortable are you with unpredictable situations?",
    type: "slider",
    min: 1,
    max: 10,
    labels: ["Very Uncomfortable", "Very Comfortable"],
  },
  {
    id: "investmentApproach",
    text: "How do you usually handle a surplus of money?",
    type: "slider",
    min: 1,
    max: 10,
    labels: ["Spend It", "Invest It"],
  },
  {
    id: "emergencyPreparedness",
    text: "If a major unexpected expense arises, how prepared do you feel?",
    type: "slider",
    min: 1,
    max: 10,
    labels: ["Not Prepared", "Very Prepared"],
  },
  {
    id: "financialTracking",
    text: "How often do you research financial trends?",
    type: "slider",
    min: 1,
    max: 10,
    labels: ["Never", "Daily"],
  },
  {
    id: "futureSecurity",
    text: "How much do you prioritize future financial security over present comfort?",
    type: "slider",
    min: 1,
    max: 10,
    labels: ["Present Comfort", "Future Security"],
  },
  {
    id: "spendingDiscipline",
    text: "How easily do you say 'no' to unplanned purchases?",
    type: "slider",
    min: 1,
    max: 10,
    labels: ["Very Difficult", "Very Easy"],
  },
  {
    id: "assetAllocation",
    text: "If given a large sum of money today, how much would you allocate toward long-term assets?",
    type: "slider",
    min: 1,
    max: 10,
    labels: ["None", "All"],
  },
  {
    id: "riskTaking",
    text: "When it comes to financial risks, where do you stand?",
    type: "slider",
    min: 1,
    max: 10,
    labels: ["Risk Averse", "Risk Seeking"],
  },
  {
    id: "dependents",
    text: "Do you have dependents (children, elderly, etc.)?",
    type: "select",
    options: ["Yes", "No"],
  },
  {
    id: "financialGoals",
    text: "Briefly describe your primary financial goals:",
    type: "textarea",
    placeholder: "E.g., Save for retirement, buy a home, pay off debt...",
  },
];

const Profile = () => {
  const { state: authState } = useAuthContext();
  const { user } = authState || {};
  const {
    state: dashState = {},
    actions: { submitProfile, fetchProfile, requestPhi2Advice },
    loading: { profile: profileLoading } = {},
    aiAdvice = null,
    goalPlan = null,
    forecast = null,
  } = useContext(DashboardContext);

  const [formData, setFormData] = useState({});
  const [step, setStep] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [bulkEdit, setBulkEdit] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [localLoading, setLocalLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completionPercent, setCompletionPercent] = useState(0);

  const validateField = useCallback((id, value) => {
    const question = questions.find((q) => q.id === id);
    if (!question) return "";

    if (question.type === "number") {
      const numValue = Number(value);
      if (value === "") return "This field is required";
      if (question.min !== undefined && numValue < question.min)
        return `Minimum value is ${question.min}`;
      if (question.max !== undefined && numValue > question.max)
        return `Maximum value is ${question.max}`;
    }
    if (question.type === "select" && !value) return "Please select an option";
    return "";
  }, []);

  const calculateCompletion = useCallback(() => {
    const filled = Object.keys(formData).filter(
      (k) => formData[k] !== "" && formData[k] !== undefined
    );
    setCompletionPercent(Math.round((filled.length / questions.length) * 100));
  }, [formData]);

  const handleChange = useCallback(
    (id, value) => {
      const error = validateField(id, value);
      setValidationErrors((prev) => ({ ...prev, [id]: error }));
      setFormData((prev) => ({ ...prev, [id]: value }));
    },
    [validateField]
  );

  const renderQuestionInput = useCallback(
    (question) => {
      const value = formData[question.id] ?? "";
      const error = validationErrors[question.id];

      switch (question.type) {
        case "number":
          return (
            <div className="input-group">
              <input
                type="number"
                value={value}
                onChange={(e) => handleChange(question.id, e.target.value)}
                min={question.min}
                max={question.max}
                className="input-field"
              />
              {error && <span className="error-text">{error}</span>}
            </div>
          );
        case "select":
          return (
            <div className="input-group">
              <select
                value={value}
                onChange={(e) => handleChange(question.id, e.target.value)}
                className="input-field"
              >
                <option value="">Select an option</option>
                {question.options.map((opt) => (
                  <option key={opt.value || opt} value={opt.value || opt}>
                    {opt.label || opt}
                  </option>
                ))}
              </select>
              {error && <span className="error-text">{error}</span>}
            </div>
          );
        case "slider":
          return (
            <div className="input-group slider-container">
              <div className="slider-wrapper">
                <input
                  type="range"
                  min={question.min}
                  max={question.max}
                  value={value || 5}
                  onChange={(e) => handleChange(question.id, e.target.value)}
                  className="slider"
                />
                <div className="slider-labels">
                  <span>{question.labels[0]}</span>
                  <span className="slider-value">{value || 5}</span>
                  <span>{question.labels[1]}</span>
                </div>
              </div>
            </div>
          );
        case "textarea":
          return (
            <div className="input-group">
              <textarea
                value={value}
                onChange={(e) => handleChange(question.id, e.target.value)}
                className="input-field"
                placeholder={question.placeholder}
                rows={4}
              />
              {error && <span className="error-text">{error}</span>}
            </div>
          );
        default:
          return null;
      }
    },
    [formData, validationErrors, handleChange]
  );

  const handleExportPDF = () => {
    const content = document.querySelector(".profile-card");
    html2pdf().from(content).save("Financial_Profile.pdf");
  };

  const handleRequestAI = async () => {
    try {
      await requestPhi2Advice(formData);
      toast.success("AI Advice Loaded");
    } catch (error) {
      toast.error("Failed to fetch AI insights");
    }
  };

  const handleSubmit = async () => {
    if (bulkEdit) {
      const errors = {};
      questions.forEach((q) => {
        const error = validateField(q.id, formData[q.id]);
        if (error) errors[q.id] = error;
      });
      setValidationErrors(errors);
      if (Object.keys(errors).length > 0) {
        toast.error("Please fix all errors before saving.");
        return;
      }
    } else {
      const currentQuestion = questions[step];
      const error = validateField(
        currentQuestion.id,
        formData[currentQuestion.id]
      );
      if (error) {
        setValidationErrors((prev) => ({
          ...prev,
          [currentQuestion.id]: error,
        }));
        toast.error(`Please complete the current question: ${error}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await submitProfile(formData);
      toast.success("Profile saved successfully");
      setEditMode(false);
      setBulkEdit(false);
    } catch (error) {
      toast.error("Error saving profile");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (dashState.profile) setFormData(dashState.profile);
  }, [dashState.profile]);

  useEffect(() => {
    calculateCompletion();
  }, [formData, calculateCompletion]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.token) return setLocalLoading(false);
      try {
        await fetchProfile();
      } catch (error) {
        toast.error("Failed to load profile data");
      } finally {
        setLocalLoading(false);
      }
    };
    loadProfile();
  }, [user, fetchProfile]);

  if (localLoading || profileLoading) {
    return (
      <div className="profile-container">
        <div className="loader-container">
          <div className="loader"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h2>📋 My Financial Profile</h2>

      <div className="profile-progress">
        <div
          className="progress-bar"
          style={{ width: `${completionPercent}%` }}
        ></div>
        <span>{completionPercent}% Complete</span>
      </div>

      <div className="profile-card">
        {!editMode ? (
          <ProfileView
            formData={formData}
            questions={questions}
            aiAdvice={aiAdvice}
            goalPlan={goalPlan}
            forecast={forecast}
            onEditAll={() => {
              setEditMode(true);
              setBulkEdit(true);
            }}
            onEditSpecific={(index) => {
              setEditMode(true);
              setBulkEdit(false);
              setStep(index);
            }}
            handleExportPDF={handleExportPDF}
            handleRequestAI={handleRequestAI}
          />
        ) : bulkEdit ? (
          <div className="bulk-edit-mode">
            {questions.map((q) => (
              <div key={q.id} className="question-item">
                <label>{q.text}</label>
                {renderQuestionInput(q)}
              </div>
            ))}
            <div className="profile-actions">
              <button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving..." : "💾 Save Profile"}
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setBulkEdit(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <QuestionFlow
            step={step}
            questions={questions}
            formData={formData}
            validationErrors={validationErrors}
            handleBack={() => setStep((prev) => Math.max(prev - 1, 0))}
            handleNext={() =>
              setStep((prev) => Math.min(prev + 1, questions.length - 1))
            }
            handleSubmit={handleSubmit}
            submitting={submitting}
            renderQuestionInput={renderQuestionInput}
          />
        )}
      </div>
    </div>
  );
};

const ProfileView = ({
  formData,
  questions,
  aiAdvice,
  goalPlan,
  forecast,
  onEditAll,
  onEditSpecific,
  handleExportPDF,
  handleRequestAI,
}) => (
  <div className="submitted-results">
    <div className="profile-actions">
      <button onClick={onEditAll} className="edit-all-btn">
        📝 Edit All Responses
      </button>
      <button onClick={handleExportPDF}>📄 Export PDF</button>
      <button onClick={handleRequestAI}>🤖 Get AI Insights</button>
    </div>

    <div className="profile-summary">
      {questions.map((q, index) => (
        <div key={q.id} className="profile-item">
          <p>
            <strong>{q.text}:</strong>{" "}
            {formData[q.id]?.toString() || "Not answered"}
          </p>
          <button onClick={() => onEditSpecific(index)} className="edit-btn">
            ✏️ Edit
          </button>
        </div>
      ))}
    </div>

    {aiAdvice && (
      <div className="ai-advice-section">
        <h3>💡 AI Financial Recommendations</h3>
        <p>{aiAdvice.summary}</p>
        <ul>
          {aiAdvice.advice?.map((tip, i) => (
            <li key={i}>✅ {tip}</li>
          ))}
        </ul>
      </div>
    )}

    {goalPlan && (
      <div className="goal-plan-section">
        <h3>🎯 Your Personalized Goal Plan</h3>
        {goalPlan.map((goal, i) => (
          <div key={i}>
            <h4>🏁 {goal.goal}</h4>
            <ul>
              {goal.milestones?.map((m, j) => (
                <li key={j}>
                  📅 {m.task} by <strong>{m.target_date}</strong>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )}

    {forecast && (
      <div className="forecast">
        <h3>📈 Financial Forecast</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={forecast}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="savings" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const QuestionFlow = ({
  step,
  questions,
  formData,
  validationErrors,
  handleBack,
  handleNext,
  handleSubmit,
  submitting,
  renderQuestionInput,
}) => (
  <div className="question-block">
    <div className="progress-tracker">
      <div
        className="progress-bar"
        style={{ width: `${(step / (questions.length - 1)) * 100}%` }}
      ></div>
      <span>
        Question {step + 1} of {questions.length}
      </span>
    </div>

    <div className="question-content">
      <h3>{questions[step].text}</h3>
      {renderQuestionInput(questions[step])}
    </div>

    <div className="navigation-buttons">
      {step > 0 && (
        <button onClick={handleBack} className="nav-btn back">
          ⬅️ Previous
        </button>
      )}
      {step < questions.length - 1 ? (
        <button onClick={handleNext} className="nav-btn next">
          Next Question ➡️
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          className="submit-btn"
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save Profile ✅"}
        </button>
      )}
    </div>
  </div>
);

export default Profile;
