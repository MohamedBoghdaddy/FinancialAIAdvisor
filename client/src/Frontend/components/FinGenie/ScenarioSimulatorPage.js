import React, { useState } from "react";
import axios from "axios";
import { FASTAPI_URL } from "../../../config/api";

const initialForm = {
  monthly_income: "",
  monthly_expenses: "",
  current_savings: "",
  months: "12",
  income_change_pct: "0",
  expense_change_pct: "0",
  annual_return_pct: "0",
};

const ScenarioSimulatorPage = () => {
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
      const res = await axios.post(`${FASTAPI_URL}/api/ds/scenario-simulation`, payload);
      setResult(res.data);
    } catch (err) {
      setError("Unable to run this simulation right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "2rem auto", padding: "0 1rem" }}>
      <h2>Scenario Simulator</h2>
      <p style={{ color: "#555" }}>
        Project your savings balance over time under different income,
        expense, and return assumptions. All results are educational
        estimates based on a simple straight-line projection.
      </p>

      <form onSubmit={handleSubmit}>
        {Object.keys(initialForm).map((field) => (
          <div key={field} style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>
              {field.replace(/_/g, " ")}
            </label>
            <input
              type="number"
              name={field}
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
          {loading ? "Simulating..." : "Run Simulation"}
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Ending balance: {result.ending_balance.toLocaleString()}</h3>
          <p>{result.explanation}</p>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Month</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>
                  Net savings
                </th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>
                  Projected balance
                </th>
              </tr>
            </thead>
            <tbody>
              {result.timeline.map((m) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td style={{ textAlign: "right" }}>{m.net_savings.toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>
                    {m.projected_balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul style={{ marginTop: "1rem", color: "#777" }}>
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

export default ScenarioSimulatorPage;
