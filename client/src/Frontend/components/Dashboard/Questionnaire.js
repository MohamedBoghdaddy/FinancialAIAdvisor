import { useState, useEffect } from "react";
import axios from "axios";
import { useAuthContext } from "../../../context/AuthContext";
import { toast } from "react-toastify";
import "../styles/survey.css";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:4000/api/questionnaire";

const questions = [
  { id: "age", text: "What's your age?", type: "number" },
  {
    id: "employmentStatus",
    text: "What's your employment status?",
    type: "select",
    options: ["Employed", "Self-employed", "Unemployed", "Student", "Retired"],
  },
  { id: "salary", text: "Your Salary?", type: "number" },
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
  },
  {
    id: "investmentApproach",
    text: "How do you usually handle a surplus of money?",
    type: "slider",
  },
  {
    id: "emergencyPreparedness",
    text: "If a major unexpected expense arises, how prepared do you feel?",
    type: "slider",
  },
  {
    id: "financialTracking",
    text: "How often do you research financial trends?",
    type: "slider",
  },
  {
    id: "futureSecurity",
    text: "How much do you prioritize future financial security over present comfort?",
    type: "slider",
  },
  {
    id: "spendingDiscipline",
    text: "How easily do you say 'no' to unplanned purchases?",
    type: "slider",
  },
  {
    id: "assetAllocation",
    text: "If given a large sum of money today, how much would you allocate toward long-term assets?",
    type: "slider",
  },
  {
    id: "riskTaking",
    text: "When it comes to financial risks, where do you stand?",
    type: "slider",
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
  },
];

const Questionnaire = () => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [submittedData, setSubmittedData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const { state } = useAuthContext();
  const { user } = state || {};

  useEffect(() => {
    if (!user || !user.token) return;

    const fetchResponses = async () => {
      try {
        const response = await axios.get(`${API_URL}/latest`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (response.data) {
          setFormData(response.data);
          setSubmittedData(response.data);
        }
      } catch (error) {
        console.error("❌ Error fetching responses:", error);
      }
    };

    fetchResponses();
  }, [user]); // ✅ fixed dependency

  const handleChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    if (step < questions.length - 1) setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user || !user.token) return toast.error("❌ User not authenticated.");

    try {
      await axios.post(`${API_URL}/submit`, formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      toast.success("✅ Survey submitted successfully!");
      setSubmittedData(formData);
      setEditMode(false);
    } catch (error) {
      console.error(
        "❌ Error submitting:",
        error.response?.data || error.message
      );
      toast.error("❌ Error submitting survey.");
    }
  };

  const handleEditSpecific = (index) => {
    setStep(index);
    setEditMode(true);
  };

  const handleEditAll = () => {
    setFormData({});
    setStep(0);
    setEditMode(true);
  };

  return (
    <div className="survey-container">
      <h2>📊 Personal Finance & Lifestyle Questionnaire</h2>
      <p className="description">
        Adjust the sliders and answer based on your financial habits.
      </p>

      {submittedData && !editMode ? (
        <div className="submitted-results">
          <h3>📌 Your Responses</h3>
          {questions.map((q, index) => (
            <p key={q.id}>
              <strong>{q.text}:</strong> {submittedData[q.id] || "Not answered"}{" "}
              <button
                onClick={() => handleEditSpecific(index)}
                className="edit-btn"
              >
                ✏️ Edit
              </button>
            </p>
          ))}
          <button onClick={handleEditAll} className="edit-all-btn">
            📝 Edit All
          </button>
        </div>
      ) : (
        <div className="question-block">
          <label>{questions[step].text}</label>

          {questions[step].type === "number" && (
            <input
              type="number"
              name={questions[step].id}
              value={formData[questions[step].id] || ""}
              onChange={(e) => handleChange(questions[step].id, e.target.value)}
              className="input-field"
            />
          )}

          {questions[step].type === "select" && (
            <select
              name={questions[step].id}
              value={formData[questions[step].id] || ""}
              onChange={(e) => handleChange(questions[step].id, e.target.value)}
              className="input-field"
            >
              <option value="">Select</option>
              {questions[step].options.map((option) => (
                <option
                  key={option.value || option}
                  value={option.value || option}
                >
                  {option.label || option}
                </option>
              ))}
            </select>
          )}

          {questions[step].type === "slider" && (
            <>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={formData[questions[step].id] || 5}
                onChange={(e) =>
                  handleChange(questions[step].id, e.target.value)
                }
                className="slider"
              />
              <span className="slider-value">
                {formData[questions[step].id] || 5}
              </span>
            </>
          )}

          {questions[step].type === "textarea" && (
            <textarea
              name={questions[step].id}
              value={formData[questions[step].id] || ""}
              onChange={(e) => handleChange(questions[step].id, e.target.value)}
              className="input-field"
              placeholder="Write here..."
            />
          )}

          <div className="button-group">
            {step > 0 && (
              <button onClick={handleBack} className="nav-btn back">
                ⬅️ Back
              </button>
            )}
            {step < questions.length - 1 ? (
              <button onClick={handleNext} className="nav-btn next">
                Next ➡️
              </button>
            ) : (
              <button onClick={handleSubmit} className="submit-btn">
                Submit ✅
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Questionnaire;
