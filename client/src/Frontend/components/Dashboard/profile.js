import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuthContext } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { BsPersonCircle } from "react-icons/bs";
import "../styles/Profile.css";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:4000/api/profile";

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

const Profile = () => {
  const { state } = useAuthContext();
  const { user } = state || {};
  const navigate = useNavigate();

  const [formData, setFormData] = useState({});
  const [step, setStep] = useState(0);
  const [submittedData, setSubmittedData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.token) return;
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/latest`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.data) setFormData(res.data);
      } catch (err) {
        console.error("❌ Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    if (step < questions.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    console.log("🔁 Submitting form...", formData); // ✅ Checkpoint

    if (!user?.token) return toast.error("❌ User not authenticated.");
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/submit`, formData, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      toast.success("✅ Profile submitted successfully!");
      setSubmittedData(formData);
      setEditMode(false);
      navigate("/financial-report", { state: { output: res.data.output } });
    } catch (err) {
      console.error("❌ Submission error:", err);
      toast.error("❌ Failed to submit profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAll = () => {
    setFormData({});
    setStep(0);
    setEditMode(true);
  };

  const handleEditSpecific = (index) => {
    setStep(index);
    setEditMode(true);
  };

  return (
    <div className="profile-container">
      <h2>📋 My Financial Profile</h2>
      <div className="profile-card">
        <BsPersonCircle className="profile-icon" />

        {loading ? (
          <div className="loader-container">
            <div className="loader"></div>
            <p>Loading...</p>
          </div>
        ) : submittedData && !editMode ? (
          <div className="submitted-results">
            <h3>📌 Your Responses</h3>
            {questions.map((q, index) => (
              <p key={q.id}>
                <strong>{q.text}:</strong>{" "}
                {submittedData[q.id] || "Not answered"}{" "}
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
        ) : questions[step] ? (
          <div className="question-block">
            <div className="step-tracker">
              Step {step + 1} of {questions.length}
            </div>

            <label>{questions[step].text}</label>

            {questions[step].type === "number" && (
              <input
                type="number"
                value={formData[questions[step].id] || ""}
                onChange={(e) =>
                  handleChange(questions[step].id, e.target.value)
                }
                className="input-field"
              />
            )}

            {questions[step].type === "select" && (
              <select
                value={formData[questions[step].id] || ""}
                onChange={(e) =>
                  handleChange(questions[step].id, e.target.value)
                }
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
                value={formData[questions[step].id] || ""}
                onChange={(e) =>
                  handleChange(questions[step].id, e.target.value)
                }
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
                  {loading ? "Submitting..." : "Submit ✅"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="error-message">❌ Invalid question index.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
