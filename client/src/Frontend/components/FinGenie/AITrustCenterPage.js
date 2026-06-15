import React from "react";

const AITrustCenterPage = () => {
  return (
    <div style={{ maxWidth: "700px", margin: "2rem auto", padding: "0 1rem" }}>
      <h2>AI Trust Center</h2>
      <p style={{ color: "#555" }}>
        FinGenie uses AI to help you understand your finances. This page
        explains what that means, what FinGenie can and cannot do, and how
        your data is used.
      </p>

      <section style={{ marginBottom: "1.5rem" }}>
        <h3>What FinGenie Is</h3>
        <p>
          FinGenie is an educational financial planning assistant. It combines
          a local language model, statistical analysis, and rule-based
          heuristics to help you understand budgets, goals, and common scam
          patterns.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h3>What FinGenie Is Not</h3>
        <ul>
          <li>FinGenie is not a licensed financial advisor.</li>
          <li>FinGenie does not guarantee investment returns or outcomes.</li>
          <li>
            FinGenie cannot move money, place trades, or change account
            security settings - by voice or otherwise.
          </li>
          <li>
            Forecasting models are trained on historical data and may not
            reflect future market conditions.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h3>How Model Metrics Work</h3>
        <p>
          The <strong>Model Metrics</strong> page shows how each forecasting
          model performed on historical test data (MAE, RMSE, R2). These are
          backtest statistics, not predictions of future accuracy. Where a
          metric isn't available for a model, it is shown as "N/A" rather than
          a placeholder value.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h3>Scam & Phishing Checks</h3>
        <p>
          The Scam Checker uses pattern-based heuristics (urgency language,
          requests for credentials or money, suspicious links). It can miss
          new or sophisticated scams and can flag legitimate messages. Always
          use your own judgment, and never share passwords, PINs, or one-time
          codes with anyone.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h3>Voice Commands</h3>
        <p>
          Voice commands are tap-to-speak only - FinGenie never listens in the
          background. Commands are classified by risk level:
        </p>
        <ul>
          <li>
            <strong>Low risk</strong> (e.g. navigation, viewing information):
            performed immediately.
          </li>
          <li>
            <strong>Medium risk</strong> (e.g. changing a preference): requires
            your confirmation.
          </li>
          <li>
            <strong>High risk</strong> (e.g. transferring money, changing
            security settings): always blocked. These actions are never
            available by voice.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h3>Your Data</h3>
        <p>
          Security-related actions (logins, profile changes, voice commands)
          are recorded in your account's audit log, visible on the Security
          Center page. This helps you spot unfamiliar activity on your
          account.
        </p>
      </section>

      <p style={{ fontStyle: "italic", color: "#777" }}>
        This information is for educational and planning purposes only and is
        not financial advice. Consult a licensed financial advisor before
        making investment decisions.
      </p>
    </div>
  );
};

export default AITrustCenterPage;
