import React, { useEffect, useState } from "react";
import axios from "axios";
import { FASTAPI_URL } from "../../../config/api";

const ASSETS = [
  { key: "stock", label: "Stocks", endpoint: "/api/stock/metrics" },
  { key: "gold", label: "Gold", endpoint: "/api/gold/metrics" },
  { key: "real_estate", label: "Real Estate", endpoint: "/api/realestate/metrics" },
];

const formatMetric = (value) => (value === null || value === undefined ? "N/A" : value.toFixed
  ? value.toFixed(3)
  : value);

const ModelMetricsPage = () => {
  const [data, setData] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      const results = {};
      for (const asset of ASSETS) {
        try {
          const res = await axios.get(`${FASTAPI_URL}${asset.endpoint}`);
          results[asset.key] = res.data;
        } catch (err) {
          results[asset.key] = { error: true };
        }
      }
      setData(results);
    };
    load().catch(() => setError("Unable to load model metrics."));
  }, []);

  return (
    <div style={{ maxWidth: "750px", margin: "2rem auto", padding: "0 1rem" }}>
      <h2>Model Metrics</h2>
      <p style={{ color: "#555" }}>
        Forecasting model performance on historical test data. Lower MAE/RMSE
        and higher R2 indicate a better fit on past data - this is not a
        guarantee of future performance.
      </p>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {ASSETS.map((asset) => {
        const assetData = data[asset.key];
        return (
          <section key={asset.key} style={{ marginBottom: "2rem" }}>
            <h3>{asset.label}</h3>
            {!assetData && <p>Loading...</p>}
            {assetData?.error && <p style={{ color: "red" }}>Metrics unavailable.</p>}
            {assetData?.models && (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Model</th>
                      <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>MAE</th>
                      <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>RMSE</th>
                      <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>R2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetData.models.map((m) => (
                      <tr key={m.model}>
                        <td>
                          {m.model}
                          {m.model === assetData.best_model ? " (best)" : ""}
                        </td>
                        <td style={{ textAlign: "right" }}>{formatMetric(m.MAE)}</td>
                        <td style={{ textAlign: "right" }}>{formatMetric(m.RMSE)}</td>
                        <td style={{ textAlign: "right" }}>{formatMetric(m.R2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontStyle: "italic", color: "#777" }}>{assetData.disclaimer}</p>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default ModelMetricsPage;
