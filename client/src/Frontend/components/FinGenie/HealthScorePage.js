import React, { useState } from "react";
import axios from "axios";
import { FASTAPI_URL } from "../../../config/api";

const initialForm = {
  income: "",
  rent: "",
  utilities: "",
  transportCost: "",
  otherRecurring: "",
  savingAmount: "",
};

const FinancialHealthScorePage = () => {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, Number(value) || 0])
      );
      const res = await axios.post(
        `${FASTAPI_URL}/api/ds/financial-health-score`,
        payload
      );
      setResult(res.data);
    } catch (err) {
      setError("Unable to calculate your financial health score. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "0 1rem" }}>
      <h2>Financial Health Score</h2>
      <p style={{ color: "#555" }}>
        Enter your monthly figures to get an educational estimate of your
        financial health.
      </p>

      <form onSubmit={handleSubmit}>
        {Object.keys(initialForm).map((field) => (
          <div key={field} style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>
              {field.replace(/([A-Z])/g, " $1")}
            </label>
            <input
              type="number"
              name={field}
              min="0"
              value={form[field]}
              onChange={handleChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          {loading ? "Calculating..." : "Calculate Score"}
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>
            Score: {result.score} / 100 ({result.rating})
          </h3>
          <p>{result.explanation}</p>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Metric</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Value</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {result.breakdown.map((b) => (
                <tr key={b.metric}>
                  <td>{b.metric.replace(/_/g, " ")}</td>
                  <td style={{ textAlign: "right" }}>{b.value}</td>
                  <td style={{ textAlign: "right" }}>{b.score}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul style={{ marginTop: "1rem" }}>
            {result.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>

          <p style={{ fontStyle: "italic", color: "#777" }}>{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
};

export default FinancialHealthScorePage;
