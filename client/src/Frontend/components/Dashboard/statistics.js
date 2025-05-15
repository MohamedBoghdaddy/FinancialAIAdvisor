import React, { useEffect, useState, useRef } from "react";
import Chart from "react-apexcharts";
import axios from "axios";
import "../styles/statistics.css"; // make sure this path is correct

// Create axios instance with base configuration
const api = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 10000, // 10 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to handle auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
  "NFLX",
  "GOOGL",
  "MSFT",
  "TSLA",
  "NVDA",
  "BRK-B",
  "JPM",
  "V",
  "JNJ",
  "WMT",
  "UNH",
  "PG",
];

const timeRanges = ["5y", "3y", "1y", "6mo", "3mo", "1mo", "7d", "1d"];
const allButtons = [...timeRanges, "predict"];

export default function StatisticsChart() {
  const [range, setRange] = useState("1y");
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const fetchData = async (period, symbol) => {
    setLoading(true);
    setError(null);
    try {
      if (period === "predict") {
        const res = await api.get("/predict", {
          params: { symbol },
        });
        const predData = res.data;
        if (
          !Array.isArray(predData.dates) ||
          !Array.isArray(predData.predicted)
        ) {
          throw new Error("Invalid prediction data format");
        }
        setCategories(predData.dates);
        setData(predData.predicted);
      } else {
        const res = await api.get("/historical", {
          params: { symbol, period },
        });
        const histData = res.data.data;
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
            period === "1d"
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
    fetchData(range, selectedSymbol);
  }, [range, selectedSymbol]);

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

  const series = [{ name: "Close Price", data }];

  const scrollLeft = () =>
    scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" });
  const scrollRight = () =>
    scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" });

  return (
    <div className="statistics-container">
      <h2 className="statistics-title">Stock Statistics ({selectedSymbol})</h2>
      <p className="statistics-subtext">
        View historical data or forecasted 15-day predictions
      </p>

      {error && <div className="error-message">{error}</div>}

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

      <div className="custom-scrollbar">
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

      <div className="chart-container">
        {loading ? (
          <div className="loading-text">Loading data...</div>
        ) : error ? (
          <div className="error-message">Failed to load chart data</div>
        ) : (
          <div className="chart-inner">
            <Chart options={options} series={series} type="area" height={310} />
          </div>
        )}
      </div>
    </div>
  );
}
