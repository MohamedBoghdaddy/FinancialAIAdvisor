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
    state: dashState = { profile: null },
    actions: { submitProfile, fetchProfile, requestPhi2Advice, deleteProfile },
    loading: { profile: profileLoading } = {},
    aiAdvice,
    goalPlan,
    marketData,
  } = useContext(DashboardContext);

  const [formData, setFormData] = useState({});
  const [step, setStep] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [bulkEdit, setBulkEdit] = useState(false);
  const [singleEditIndex, setSingleEditIndex] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [localLoading, setLocalLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completionPercent, setCompletionPercent] = useState(0);

  // Custom expenses management
  const addCustomExpense = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      customExpenses: [
        ...(prev.customExpenses || []),
        { name: "", amount: "" },
      ],
    }));
  }, []);

  const removeCustomExpense = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      customExpenses: (prev.customExpenses || []).filter((_, i) => i !== index),
    }));
  }, []);

  const updateCustomExpense = useCallback((index, key, value) => {
    setFormData((prev) => {
      const updated = [...(prev.customExpenses || [])];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, customExpenses: updated };
    });
  }, []);

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
    if (id === "customExpenses") {
      const invalidExpenses = value.filter((e) => !e.name || !e.amount);
      if (invalidExpenses.length > 0) return "Please fill all expense fields";
    }
    return "";
  }, []);

  const calculateCompletion = useCallback(() => {
    const filled = Object.keys(formData).filter(
      (k) =>
        formData[k] !== "" &&
        formData[k] !== undefined &&
        !Array.isArray(formData[k])
    );
    const expenseCount = (formData.customExpenses || []).filter(
      (e) => e.name && e.amount
    ).length;
    const totalFields = questions.length + expenseCount;
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
                className="select-field"
              >
                <option value="">Select an option</option>
                {question.options.map((option, index) => (
                  <option key={index} value={option.value || option}>
                    {option.label || option}
                  </option>
                ))}
              </select>
              {error && <span className="error-text">{error}</span>}
            </div>
          );
        case "slider":
          return (
            <div className="input-group slider-group">
              <div className="slider-labels">
                <span>{question.labels[0]}</span>
                <span>{question.labels[1]}</span>
              </div>
              <input
                type="range"
                min={question.min}
                max={question.max}
                value={value || question.min}
                onChange={(e) => handleChange(question.id, e.target.value)}
                className="slider-field"
              />
              <div className="slider-value">
                Selected: {value || question.min}
              </div>
              {error && <span className="error-text">{error}</span>}
            </div>
          );
        case "textarea":
          return (
            <div className="input-group">
              <textarea
                value={value}
                onChange={(e) => handleChange(question.id, e.target.value)}
                placeholder={question.placeholder}
                className="textarea-field"
                rows="4"
              />
              {error && <span className="error-text">{error}</span>}
            </div>
          );
        default:
          return (
            <div className="input-group">
              <input
                type="text"
                value={value}
                onChange={(e) => handleChange(question.id, e.target.value)}
                className="input-field"
              />
              {error && <span className="error-text">{error}</span>}
            </div>
          );
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

  const handleDeleteProfile = async () => {
    if (window.confirm("Are you sure you want to delete your profile?")) {
      try {
        await deleteProfile();
        setFormData({});
        toast.success("Profile deleted successfully");
      } catch (error) {
        toast.error("Error deleting profile");
      }
    }
  };

  const handleSubmit = async () => {
    const errors = {};

    if (bulkEdit) {
      questions.forEach((q) => {
        const error = validateField(q.id, formData[q.id]);
        if (error) errors[q.id] = error;
      });
    } else if (singleEditIndex !== null) {
      const question = questions[singleEditIndex];
      const error = validateField(question.id, formData[question.id]);
      if (error) errors[question.id] = error;
    } else {
      const currentQuestion = questions[step];
      const error = validateField(
        currentQuestion.id,
        formData[currentQuestion.id]
      );
      if (error) errors[currentQuestion.id] = error;
    }

    // Validate custom expenses
    const expenseError = validateField(
      "customExpenses",
      formData.customExpenses || []
    );
    if (expenseError) errors.customExpenses = expenseError;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fix errors before saving.");
      return;
    }

    setSubmitting(true);
    try {
      await submitProfile({
        ...formData,
        customExpenses:
          formData.customExpenses?.filter((e) => e.name && e.amount) || [],
      });
      toast.success("Profile saved successfully");
      setEditMode(false);
      setBulkEdit(false);
      setSingleEditIndex(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving profile");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    // Initial fetch and token changes only
    const controller = new AbortController();
    const loadInitialProfile = async () => {
      if (!user?.token) return;
      try {
        await fetchProfile(controller.signal);
      } finally {
        setLocalLoading(false);
      }
    };
    loadInitialProfile();
    return () => controller.abort();
  }, [user, fetchProfile]); // Remove dashState.profile from dependencies

  // Separate effect for syncing form data
  useEffect(() => {
    if (dashState.profile) {
      setFormData({ ...dashState.profile });
      setEditMode(false);
    }
  }, [dashState.profile]); // Only sync form data without fetching
  useEffect(() => {
    calculateCompletion();
  }, [formData, calculateCompletion]);

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
            marketData={marketData}
            onEditAll={() => {
              setEditMode(true);
              setBulkEdit(true);
            }}
            onEditSpecific={(index) => {
              setEditMode(true);
              setBulkEdit(false);
              setSingleEditIndex(index);
            }}
            handleExportPDF={handleExportPDF}
            handleRequestAI={handleRequestAI}
            handleDelete={handleDeleteProfile}
          />
        ) : singleEditIndex !== null ? (
          <SingleEditMode
            questionIndex={singleEditIndex}
            handleSubmit={handleSubmit}
            submitting={submitting}
            onCancel={() => {
              setEditMode(false);
              setSingleEditIndex(null);
            }}
            renderQuestionInput={renderQuestionInput}
            validationErrors={validationErrors}
          />
        ) : bulkEdit ? (
          <BulkEditMode
            questions={questions}
            renderQuestionInput={renderQuestionInput}
            validationErrors={validationErrors}
            handleSubmit={handleSubmit}
            submitting={submitting}
            onCancel={() => setEditMode(false)}
          />
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
            addCustomExpense={addCustomExpense}
            removeCustomExpense={removeCustomExpense}
            updateCustomExpense={updateCustomExpense}
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
  marketData,
  onEditAll,
  onEditSpecific,
  handleExportPDF,
  handleRequestAI,
  handleDelete,
}) => (
  <div className="submitted-results">
    <div className="profile-actions">
      <button onClick={onEditAll} className="edit-all-btn">
        📝 Edit All
      </button>
      <button onClick={handleExportPDF}>📄 Export PDF</button>
      <button onClick={handleRequestAI}>🤖 AI Insights</button>
      <button onClick={handleDelete} className="delete-btn">
        🗑️ Delete Profile
      </button>
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
      {formData.customExpenses?.length > 0 && (
        <div className="expenses-summary">
          <h4>Custom Expenses</h4>
          {formData.customExpenses.map((expense, index) => (
            <div key={index} className="expense-item">
              <p>
                {expense.name}: ${expense.amount}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>

    {aiAdvice && (
      <div className="ai-advice-section">
        <h3>💡 AI Recommendations</h3>
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
        <h3>🎯 Goal Plan</h3>
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

    {marketData?.stockPredictions && (
      <div className="forecast">
        <h3>📈 Market Forecast</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={marketData.stockPredictions}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              name="Stock Prediction"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const BulkEditMode = ({
  questions,
  renderQuestionInput,
  validationErrors,
  handleSubmit,
  submitting,
  onCancel,
}) => (
  <div className="bulk-edit-mode">
    {questions.map((q) => (
      <div key={q.id} className="question-item">
        <label>{q.text}</label>
        {renderQuestionInput(q)}
        {validationErrors[q.id] && (
          <span className="error-text">{validationErrors[q.id]}</span>
        )}
      </div>
    ))}
    <div className="profile-actions">
      <button onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Saving..." : "💾 Save Profile"}
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  </div>
);

const SingleEditMode = ({
  questionIndex,
  handleSubmit,
  submitting,
  onCancel,
  renderQuestionInput,
  validationErrors,
}) => {
  const question = questions[questionIndex];

  return (
    <div className="single-edit-mode">
      <div className="question-item">
        <label>{question.text}</label>
        {renderQuestionInput(question)}
        {validationErrors[question.id] && (
          <span className="error-text">{validationErrors[question.id]}</span>
        )}
      </div>
      <div className="profile-actions">
        <button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : "💾 Save Changes"}
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

const QuestionFlow = ({
  step,
  questions,
  formData,
  validationErrors,
  handleBack,
  handleNext,
  handleSubmit,
  submitting,
  addCustomExpense,
  removeCustomExpense,
  updateCustomExpense,
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

      {step === questions.length - 1 && (
        <div className="custom-expense-section">
          <h4>➕ Additional Monthly Expenses</h4>
          {(formData.customExpenses || []).map((item, index) => (
            <div key={`expense-${index}`} className="expense-row">
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
          <button onClick={addCustomExpense} className="add-expense-btn">
            ➕ Add Another Expense
          </button>
          {validationErrors.customExpenses && (
            <span className="error-text">
              {validationErrors.customExpenses}
            </span>
          )}
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
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save Profile ✅"}
        </button>
      )}
    </div>
  </div>
);

// Prop type validations
ProfileView.propTypes = {
  formData: PropTypes.object.isRequired,
  questions: PropTypes.array.isRequired,
  aiAdvice: PropTypes.object,
  goalPlan: PropTypes.array,
  marketData: PropTypes.object,
  onEditAll: PropTypes.func.isRequired,
  onEditSpecific: PropTypes.func.isRequired,
  handleExportPDF: PropTypes.func.isRequired,
  handleRequestAI: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
};

BulkEditMode.propTypes = {
  questions: PropTypes.array.isRequired,
  renderQuestionInput: PropTypes.func.isRequired,
  validationErrors: PropTypes.object.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
};

SingleEditMode.propTypes = {
  questionIndex: PropTypes.number.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  renderQuestionInput: PropTypes.func.isRequired,
  validationErrors: PropTypes.object.isRequired,
};

QuestionFlow.propTypes = {
  step: PropTypes.number.isRequired,
  questions: PropTypes.array.isRequired,
  formData: PropTypes.object.isRequired,
  validationErrors: PropTypes.object.isRequired,
  handleBack: PropTypes.func.isRequired,
  handleNext: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  addCustomExpense: PropTypes.func.isRequired,
  removeCustomExpense: PropTypes.func.isRequired,
  updateCustomExpense: PropTypes.func.isRequired,
  renderQuestionInput: PropTypes.func.isRequired,
};

export default Profile;
