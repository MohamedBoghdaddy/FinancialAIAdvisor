import React, { useEffect, useState, useRef } from "react";
import Chart from "react-apexcharts";
import axios from "axios";
import "../styles/statistics.css";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Add request interceptor to handle auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ERR_NETWORK") {
      console.error(
        "Network Error: Please check if the backend server is running"
      );
    }
    return Promise.reject(error);
  }
);

const stockSymbols = [
  "AAPL",
  "META",
  "AMZN",
  "MSFT",
  "GOOGL",
  "TSLA",
  "NVDA",
  "NFLX",
];
const timeRanges = ["5y", "3y", "1y", "6mo", "3mo", "1mo", "7d", "1d"];
const allButtons = [...timeRanges, "predict"];
const assetTypes = [
  { key: "stock", label: "Stock" },
  { key: "gold", label: "Gold" },
  { key: "realestate", label: "Real Estate" },
];

export default function StatisticsChartWithSwitcher() {
  const [type, setType] = useState("stock");
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [range, setRange] = useState("1y");
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (type === "stock") {
        if (range === "predict") {
          response = await api.get("/predict", {
            params: { symbol: selectedSymbol },
          });
          const predData = response.data;
          if (
            !Array.isArray(predData.dates) ||
            !Array.isArray(predData.predicted)
          ) {
            throw new Error("Invalid prediction data format");
          }
          setCategories(predData.dates);
          setData(predData.predicted);
        } else {
          response = await api.get("/historical", {
            params: { symbol: selectedSymbol, period: range },
          });
          const histData = response.data.data;
          if (!Array.isArray(histData)) {
            throw new Error("Invalid historical data format");
          }

          const grouped = {};
          for (const entry of histData) {
            const rawDate = entry.date || entry.timestamp || entry.Date;
            const close = entry.close || entry.Close;
            if (!rawDate || close === undefined) continue;

            const date = new Date(rawDate);
            if (isNaN(date.getTime())) continue;

            const label =
              range === "1d"
                ? date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : date.toLocaleDateString("en-US");

            grouped[label] = close;
          }

          if (Object.keys(grouped).length === 0) {
            throw new Error("No valid data points found");
          }

          setCategories(Object.keys(grouped));
          setData(Object.values(grouped));
        }
      } else if (type === "gold") {
        if (range === "predict") {
          response = await api.get("/gold/predict", { params: { days: 15 } });
          setCategories([...Array(15).keys()].map((d) => `Day ${d + 1}`));
          setData(response.data.predictions);
        } else {
          const goldHist = await api.get("/gold/forecast");
          const arima = goldHist.data.find((m) => m.model === "ARIMA");
          setCategories(
            arima.actual.map((_, i) => `T-${arima.actual.length - i}`)
          );
          setData(arima.actual);
        }
      } else if (type === "realestate") {
        if (range === "predict") {
          response = await api.get("/realestate/predict", {
            params: { days: 15 },
          });
          setCategories([...Array(15).keys()].map((d) => `Day ${d + 1}`));
          setData(response.data.predictions);
        } else {
          const realHist = await api.get("/realestate/forecast");
          const best = realHist.data.find((m) => m.model === "LSTM");
          setCategories(
            best.forecast.map((_, i) => `T-${best.forecast.length - i}`)
          );
          setData(best.forecast);
        }
      }
    } catch (err) {
      console.error("❌ Data fetch error:", err);
      let errorMessage = "Failed to fetch data";

      if (err.code === "ERR_NETWORK") {
        errorMessage =
          "Cannot connect to the server. Please check if the backend is running.";
      } else if (err.response) {
        errorMessage = err.response.data?.detail || err.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setCategories([]);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [type, range, selectedSymbol]);

  const scrollLeft = () =>
    scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" });
  const scrollRight = () =>
    scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" });

  const options = {
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 310,
      toolbar: { show: false },
    },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.55, opacityTo: 0 },
    },
    markers: { size: 0, hover: { size: 5 } },
    grid: {
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      x: { format: "d M yy H:m" },
      y: { formatter: (val) => val.toFixed(2) },
    },
    xaxis: {
      type: "category",
      categories: categories,
      labels: {
        style: { fontSize: "11px", colors: ["#6B7280"] },
        rotate: -45,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { fontSize: "12px", colors: ["#6B7280"] } },
      title: { text: "" },
    },
  };

  const series = [{ name: `${type.toUpperCase()} Price`, data }];

  return (
    <div className="statistics-container">
      <h2 className="statistics-title">Market Data Viewer</h2>
      <p className="statistics-subtext">
        View historical data or forecasted predictions
      </p>

      {/* Source Type Switcher */}
      <div className="source-switcher">
        {assetTypes.map((src) => (
          <button
            key={src.key}
            className={`range-button ${type === src.key ? "selected" : ""}`}
            onClick={() => setType(src.key)}
          >
            {src.label}
          </button>
        ))}
      </div>

      {type === "stock" && (
        <>
          <div className="custom-scrollbar" ref={scrollRef}>
            <button onClick={scrollLeft} className="symbol-button">
              ←
            </button>
            {stockSymbols.map((sym) => (
              <button
                key={sym}
                onClick={() => setSelectedSymbol(sym)}
                className={`symbol-button ${
                  sym === selectedSymbol ? "selected" : ""
                }`}
              >
                {sym}
              </button>
            ))}
            <button onClick={scrollRight} className="symbol-button">
              →
            </button>
          </div>

          <div className="range-selector">
            {allButtons.map((r) => (
              <button
                key={r}
                className={`range-button ${r === range ? "selected" : ""}`}
                onClick={() => setRange(r)}
              >
                {r === "predict" ? "PREDICTIONS" : r.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}

      {(type === "gold" || type === "realestate") && (
        <div className="range-selector">
          <button
            className={`range-button ${range === "1y" ? "selected" : ""}`}
            onClick={() => setRange("1y")}
          >
            HISTORY
          </button>
          <button
            className={`range-button ${range === "predict" ? "selected" : ""}`}
            onClick={() => setRange("predict")}
          >
            PREDICTIONS
          </button>
        </div>
      )}

      <div className="chart-container">
        {loading ? (
          <div className="loading-text">Loading data...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="chart-inner">
            <Chart options={options} series={series} type="area" height={310} />
          </div>
        )}
      </div>
    </div>
  );
}
