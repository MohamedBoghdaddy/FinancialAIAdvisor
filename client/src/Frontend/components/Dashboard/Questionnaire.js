import { useState } from "react";
import axios from "axios";
import { useAuthContext } from "../../../context/AuthContext";
import { toast } from "react-toastify";
import "../styles/survey.css";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:4000/api/questionnaire";

const Questionnaire = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const { state } = useAuthContext();
  const { user } = state;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNext = () => {
    setStep((prevStep) => prevStep + 1);
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/submit`,
        { ...formData, userId: user._id },
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Questionnaire submitted successfully"
      );
      setStep(1);
      setFormData({});
    } catch (error) {
      toast.error(
        error.response?.data.message ||
          "An error occurred while submitting the questionnaire"
      );
    }
  };

  return (
    <div className="container">
      <h2>Personal Finance & Lifestyle Questionnaire</h2>

      {step === 1 && (
        <div>
          <label>
            What's your age?
            <input
              type="number"
              name="age"
              onChange={handleChange}
              className="block w-full p-2 border rounded"
            />
          </label>
          <button
            onClick={handleNext}
            className="mt-2 bg-blue-500 text-white p-2 rounded-lg"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <label>
            What's your employment status?
            <select
              name="employmentStatus"
              onChange={handleChange}
              className="block w-full p-2 border rounded"
            >
              <option value="">Select</option>
              <option value="employed">Employed</option>
              <option value="self-employed">Self-employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="student">Student</option>
              <option value="retired">Retired</option>
            </select>
          </label>
          <button
            onClick={handleNext}
            className="mt-2 bg-blue-500 text-white p-2 rounded-lg"
          >
            Next
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <label>
            Do you own or rent your home?
            <select
              name="homeOwnership"
              onChange={handleChange}
              className="block w-full p-2 border rounded"
            >
              <option value="">Select</option>
              <option value="own">Own</option>
              <option value="rent">Rent</option>
              <option value="other">Other</option>
            </select>
          </label>
          <button
            onClick={handleNext}
            className="mt-2 bg-blue-500 text-white p-2 rounded-lg"
          >
            Next
          </button>
        </div>
      )}

      {step === 4 && (
        <div>
          <label>
            Do you currently have any debts?
            <select
              name="hasDebt"
              onChange={handleChange}
              className="block w-full p-2 border rounded"
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <button
            onClick={handleNext}
            className="mt-2 bg-blue-500 text-white p-2 rounded-lg"
          >
            Next
          </button>
        </div>
      )}

      {step === 5 && (
        <div>
          <label>
            What type of lifestyle best describes you?
            <select
              name="lifestyle"
              onChange={handleChange}
              className="block w-full p-2 border rounded"
            >
              <option value="">Select</option>
              <option value="minimalist">
                Minimalist (low spending, high saving)
              </option>
              <option value="balanced">
                Balanced (moderate spending & saving)
              </option>
              <option value="spender">
                Spender (high spending, lower saving)
              </option>
            </select>
          </label>
          <button
            onClick={handleNext}
            className="mt-2 bg-blue-500 text-white p-2 rounded-lg"
          >
            Next
          </button>
        </div>
      )}

      {step === 6 && (
        <div>
          <label>
            How would you describe your risk tolerance for investments?
            <select
              name="riskTolerance"
              onChange={handleChange}
              className="block w-full p-2 border rounded"
            >
              <option value="">Select</option>
              <option value="low">Low (prefer stability)</option>
              <option value="medium">Medium (balanced risk/reward)</option>
              <option value="high">High (open to risk)</option>
            </select>
          </label>
          <button
            onClick={handleNext}
            className="mt-2 bg-green-500 text-white p-2 rounded-lg"
          >
            Next
          </button>
        </div>
      )}

      {step === 7 && (
        <div>
          <label>
            Do you have dependents (children, elderly, etc.)?
            <select
              name="dependents"
              onChange={handleChange}
              className="block w-full p-2 border rounded"
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <button
            onClick={handleNext}
            className="mt-2 bg-blue-500 text-white p-2 rounded-lg"
          >
            Next
          </button>
        </div>
      )}

      {step === 8 && (
        <div>
          <label>
            Briefly describe your primary financial goals:
            <textarea
              name="financialGoals"
              onChange={handleChange}
              className="block w-full p-2 border rounded"
              placeholder="E.g., retirement, education, buying a house, etc."
            />
          </label>
          <button
            onClick={handleSubmit}
            className="mt-2 bg-green-500 text-white p-2 rounded-lg"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
};

export default Questionnaire;
