import React, { useEffect, useState, useRef } from "react";
import Chart from "react-apexcharts";
import axios from "axios";
import "../styles/statistics.css";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 30000, // Increased timeout to 30 seconds
  headers: { "Content-Type": "application/json" },
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout: The server took too long to respond");
    } else if (error.code === "ERR_NETWORK") {
      console.error("Network Error: Please check your internet connection");
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
  const abortControllerRef = useRef(new AbortController());

  const fetchData = async () => {
    // Cancel any pending requests
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      let response;
      const signal = abortControllerRef.current.signal;

      if (type === "stock") {
        if (range === "predict") {
          response = await api.get("/predict", {
            params: { symbol: selectedSymbol },
            signal,
          });
          const { dates, predicted } = response.data;
          setCategories(dates);
          setData(predicted);
        } else {
          response = await api.get("/historical", {
            params: { symbol: selectedSymbol, period: range },
            signal,
          });
          const grouped = {};
          response.data.data.forEach(
            ({ date, timestamp, Date: dt, close, Close }) => {
              const rawDate = date || timestamp || dt;
              const val = close || Close;
              if (!rawDate || val === undefined) return;
              const d = new Date(rawDate);
              const label =
                range === "1d"
                  ? d.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : d.toLocaleDateString("en-US");
              grouped[label] = val;
            }
          );
          setCategories(Object.keys(grouped));
          setData(Object.values(grouped));
        }
      } else if (type === "gold") {
        if (range === "predict") {
          response = await api.get("/gold/predict", {
            params: { days: 15 },
            signal,
          });
          setCategories([...Array(15).keys()].map((d) => `Day ${d + 1}`));
          setData(response.data.predictions);
        } else {
          response = await api.get("/gold/history", {
            params: { period: range },
            signal,
          });
          setCategories(response.data.dates);
          setData(response.data.prices);
        }
      } else if (type === "realestate") {
        if (range === "predict") {
          response = await api.get("/realestate/predict", {
            params: { days: 15 },
            signal,
          });
          setCategories([...Array(15).keys()].map((d) => `Day ${d + 1}`));
          setData(response.data.predictions);
        } else {
          response = await api.get("/realestate/history", {
            params: { period: range },
            signal,
          });
          setCategories(response.data.dates);
          setData(response.data.prices);
        }
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Request canceled:", err.message);
        return;
      }

      console.error("❌ Data fetch error:", err);
      let errorMessage = "Failed to fetch data";

      if (err.code === "ECONNABORTED") {
        errorMessage = "Request timed out. Please try again.";
      } else if (err.code === "ERR_NETWORK") {
        errorMessage = "Network error. Please check your connection.";
      } else if (err.response) {
        errorMessage = err.response.data?.detail || err.message;
      } else {
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
    return () => {
      // Cleanup: cancel any pending requests when component unmounts
      abortControllerRef.current.abort();
    };
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
    fill: { type: "gradient", gradient: { opacityFrom: 0.55, opacityTo: 0 } },
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
      categories,
      labels: { style: { fontSize: "11px", colors: ["#6B7280"] }, rotate: -45 },
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

      <div className="source-switcher">
        {assetTypes.map(({ key, label }) => (
          <button
            key={key}
            className={`range-button ${type === key ? "selected" : ""}`}
            onClick={() => setType(key)}
          >
            {label}
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
          {timeRanges.map((r) => (
            <button
              key={r}
              className={`range-button ${r === range ? "selected" : ""}`}
              onClick={() => setRange(r)}
            >
              {r.toUpperCase()}
            </button>
          ))}
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
          <div className="error-message">
            {error}
            <button onClick={fetchData} className="retry-button">
              Retry
            </button>
          </div>
        ) : (
          <div className="chart-inner">
            <Chart options={options} series={series} type="area" height={310} />
          </div>
        )}
      </div>
    </div>
  );
}
