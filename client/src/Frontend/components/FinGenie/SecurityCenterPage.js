import React, { useEffect, useState } from "react";
import axios from "axios";
import { NODE_API_URL } from "../../../config/api";
import { useAuthContext } from "../../../context/AuthContext";

const SecurityCenterPage = () => {
  const { isAdmin } = useAuthContext();
  const [accountScore, setAccountScore] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [scoreRes, logRes] = await Promise.all([
          axios.get(`${NODE_API_URL}/api/security/account-score`, {
            withCredentials: true,
          }),
          axios.get(`${NODE_API_URL}/api/security/audit-log?limit=10`, {
            withCredentials: true,
          }),
        ]);
        setAccountScore(scoreRes.data.data);
        setAuditLog(logRes.data.data);

        if (isAdmin) {
          const adminRes = await axios.get(
            `${NODE_API_URL}/api/security/admin/security-center`,
            { withCredentials: true }
          );
          setAdminStats(adminRes.data.data);
        }
      } catch (err) {
        setError("Unable to load security information right now.");
      }
    };
    load();
  }, [isAdmin]);

  return (
    <div style={{ maxWidth: "700px", margin: "2rem auto", padding: "0 1rem" }}>
      <h2>Security Center</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {accountScore && (
        <section style={{ marginBottom: "2rem" }}>
          <h3>
            Account Security Score: {accountScore.score} / 100 ({accountScore.rating})
          </h3>
          <p>{accountScore.explanation}</p>
          <ul>
            {accountScore.factors.map((f) => (
              <li key={f.factor}>
                {f.detail} {f.impact !== 0 && `(${f.impact})`}
              </li>
            ))}
          </ul>
          <ul style={{ color: "#777" }}>
            {accountScore.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginBottom: "2rem" }}>
        <h3>Recent Account Activity</h3>
        {auditLog.length === 0 ? (
          <p>No recent activity.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>When</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Action</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry) => (
                <tr key={entry._id}>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>{entry.action}</td>
                  <td>{entry.riskLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {isAdmin && adminStats && (
        <section>
          <h3>Admin: Platform Security Overview</h3>
          <ul>
            <li>Total users: {adminStats.totalUsers}</li>
            <li>Blocked users: {adminStats.blockedUsers}</li>
            <li>
              Failed logins (last {adminStats.windowDays} days): {adminStats.recentFailedLogins}
            </li>
            <li>
              High-risk events (last {adminStats.windowDays} days):{" "}
              {adminStats.recentHighRiskEvents.length}
            </li>
          </ul>
        </section>
      )}
    </div>
  );
};

export default SecurityCenterPage;
