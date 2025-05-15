import React from "react";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale);

const ExpenseChart = ({ data }) => {
  const pieData = {
    labels: data.labels,
    datasets: [
      {
        label: "Expenses",
        data: data.values,
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#8DD3C7",
          "#FDB462",
        ],
      },
    ],
  };

  const barData = {
    labels: ["Income", "Savings", "Total Expenses"],
    datasets: [
      {
        label: "EGP",
        data: [data.income, data.savings, data.totalExpenses],
        backgroundColor: "#42a5f5",
      },
    ],
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h4>📊 Expense Breakdown</h4>
      <Pie data={pieData} />
      <h4 style={{ marginTop: "2rem" }}>📉 Income vs Savings vs Expenses</h4>
      <Bar data={barData} />
    </div>
  );
};

export default ExpenseChart;
