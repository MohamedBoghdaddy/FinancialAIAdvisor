import React, { useState, useEffect, useContext } from "react";
import { useAuthContext } from "../../../context/AuthContext";
import { DashboardContext } from "../../../context/DashboardContext";
import { BsPersonCircle } from "react-icons/bs";
import { toast } from "react-toastify";
import "../styles/Profile.css";

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
    actions: { submitProfile } = {},
    loading = false,
    aiAdvice = null,
    goalPlan = null,
  } = useContext(DashboardContext);

  const [formData, setFormData] = useState({});
  const [step, setStep] = useState(0);
  const [editMode, setEditMode] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (user?.token && dashState?.profile) {
      setFormData(dashState.profile.answers || {});
      setEditMode(false);
    }
  }, [user, dashState.profile]);

  const validateField = (id, value) => {
    const question = questions.find((q) => q.id === id);
    if (!question) return true;

    if (question.type === "number") {
      if (value === "") return "This field is required";
      if (question.min !== undefined && Number(value) < question.min)
        return `Minimum value is ${question.min}`;
      if (question.max !== undefined && Number(value) > question.max)
        return `Maximum value is ${question.max}`;
    }

    if (question.type === "select" && !value) {
      return "Please select an option";
    }

    return "";
  };

  const handleChange = (id, value) => {
    const error = validateField(id, value);
    setValidationErrors((prev) => ({ ...prev, [id]: error }));
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    const currentQuestion = questions[step];
    const error = validateField(
      currentQuestion.id,
      formData[currentQuestion.id]
    );

    if (error) {
      setValidationErrors((prev) => ({ ...prev, [currentQuestion.id]: error }));
      toast.error(`Please complete the current question: ${error}`);
      return;
    }

    if (step < questions.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user?.token) {
      toast.error("❌ Please log in to save your profile");
      return;
    }

    const currentQuestion = questions[step];
    const error = validateField(
      currentQuestion.id,
      formData[currentQuestion.id]
    );

    if (error) {
      setValidationErrors((prev) => ({ ...prev, [currentQuestion.id]: error }));
      toast.error(`Please complete the current question: ${error}`);
      return;
    }

    try {
      await submitProfile(formData);
      setEditMode(false);
    } catch (error) {
      // Error is already handled in DashboardContext
      console.error("Profile submission error:", error);
    }
  };

  const handleEditAll = () => {
    setEditMode(true);
    setStep(0);
  };

  const handleEditSpecific = (index) => {
    setEditMode(true);
    setStep(index);
  };

  const addCustomExpense = () => {
    setFormData((prev) => ({
      ...prev,
      customExpenses: [
        ...(prev.customExpenses || []),
        { name: "", amount: "" },
      ],
    }));
  };

  const removeCustomExpense = (index) => {
    const updated = [...(formData.customExpenses || [])];
    updated.splice(index, 1);
    setFormData((prev) => ({ ...prev, customExpenses: updated }));
  };

  const updateCustomExpense = (index, key, value) => {
    const updated = [...(formData.customExpenses || [])];
    updated[index][key] = value;
    setFormData((prev) => ({ ...prev, customExpenses: updated }));
  };

  const renderQuestionInput = (question) => {
    const value = formData[question.id] ?? "";
    const error = validationErrors[question.id];

    switch (question.type) {
      case "number":
        return (
          <>
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(question.id, e.target.value)}
              min={question.min}
              max={question.max}
              className="input-field"
            />
            {error && <span className="error-text">{error}</span>}
          </>
        );

      case "select":
        return (
          <>
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
          </>
        );

      case "slider":
        return (
          <div className="slider-container">
            <input
              type="range"
              min={question.min || 1}
              max={question.max || 10}
              value={value || 5}
              onChange={(e) => handleChange(question.id, e.target.value)}
              className="slider"
            />
            <div className="slider-labels">
              <span>{question.labels?.[0] || "Low"}</span>
              <span className="slider-value">{value || 5}</span>
              <span>{question.labels?.[1] || "High"}</span>
            </div>
          </div>
        );

      case "textarea":
        return (
          <>
            <textarea
              value={value}
              onChange={(e) => handleChange(question.id, e.target.value)}
              className="input-field"
              placeholder={question.placeholder || "Write here..."}
              rows={4}
            />
            {error && <span className="error-text">{error}</span>}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="profile-container">
      <h2>📋 My Financial Profile</h2>
      <div className="profile-card">
        <BsPersonCircle className="profile-icon" />

        {loading ? (
          <div className="loader-container">
            <div className="loader"></div>
            <p>Loading your profile...</p>
          </div>
        ) : dashState.profile?.answers && !editMode ? (
          <div className="submitted-results">
            <h3>📌 Your Responses</h3>
            <div className="profile-summary">
              {questions.map((q, index) => (
                <div key={q.id} className="profile-item">
                  <p>
                    <strong>{q.text}:</strong>{" "}
                    {formData[q.id]?.toString() || "Not answered"}
                  </p>
                  <button
                    onClick={() => handleEditSpecific(index)}
                    className="edit-btn"
                  >
                    ✏️ Edit
                  </button>
                </div>
              ))}
            </div>

            <button onClick={handleEditAll} className="edit-all-btn">
              📝 Edit All Responses
            </button>

            {aiAdvice && (
              <div className="ai-advice-section">
                <h3>💡 AI Financial Recommendations</h3>
                <div className="advice-summary">
                  <p>{aiAdvice.summary}</p>
                  <ul>
                    {aiAdvice.advice?.map((tip, i) => (
                      <li key={i}>✅ {tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {goalPlan && (
              <div className="goal-plan-section">
                <h3>🎯 Your Personalized Goal Plan</h3>
                {goalPlan.map((g, i) => (
                  <div key={i} className="goal-item">
                    <h4>🏁 {g.goal}</h4>
                    <ul>
                      {g.milestones?.map((m, j) => (
                        <li key={j}>
                          📅 {m.task} by <strong>{m.target_date}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : questions[step] ? (
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

              {step === questions.length - 1 && (
                <div className="custom-expense-section">
                  <h4>➕ Additional Monthly Expenses</h4>
                  {(formData.customExpenses || []).map((item, index) => (
                    <div key={index} className="expense-row">
                      <input
                        type="text"
                        placeholder="Expense name"
                        value={item.name}
                        onChange={(e) =>
                          updateCustomExpense(index, "name", e.target.value)
                        }
                      />
                      <input
                        type="number"
                        placeholder="Amount ($)"
                        value={item.amount}
                        onChange={(e) =>
                          updateCustomExpense(index, "amount", e.target.value)
                        }
                      />
                      <button
                        onClick={() => removeCustomExpense(index)}
                        className="remove-btn"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addCustomExpense}
                    className="add-expense-btn"
                  >
                    ➕ Add Another Expense
                  </button>
                </div>
              )}
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
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Profile ✅"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="error-message">❌ Error loading questions</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
