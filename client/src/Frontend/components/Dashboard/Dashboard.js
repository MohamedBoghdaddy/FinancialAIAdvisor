import {
  BsCurrencyDollar,
  BsHouse,
  BsBarChart,
  BsPieChart,
} from "react-icons/bs";
import useDashboard from "../../../hooks/useDashboard";
import "../styles/dashboard.css";
import Chart from "react-apexcharts";

const Dashboard = () => {
  const { state } = useDashboard(); // Get dashboard data from context

  // Extract financial analytics from context state
  const stats = state.analytics || {
    totalInvestment: 0,
    realEstateInvestment: 0,
    stockInvestment: 0,
    goldInvestment: 0,
    investmentTrends: [],
    investmentMonths: [],
  };

  // Chart Data for Investment Trends
  const chartData = {
    series: [{ name: "Investments", data: stats.investmentTrends || [] }],
    options: {
      chart: { type: "area" },
      xaxis: { categories: stats.investmentMonths || [] },
      colors: ["#4CAF50"],
    },
  };

  return (
    <div className="dashboard-container">
      <h2>Financial Investment Overview</h2>

      <div className="stats-container">
        <div className="stat-card">
          <BsCurrencyDollar className="stat-icon" />
          <h3>${stats.totalInvestment}</h3>
          <p>Total Investment</p>
        </div>
        <div className="stat-card">
          <BsHouse className="stat-icon" />
          <h3>${stats.realEstateInvestment}</h3>
          <p>Real Estate Investment</p>
        </div>
        <div className="stat-card">
          <BsBarChart className="stat-icon" />
          <h3>${stats.stockInvestment}</h3>
          <p>Stocks Investment</p>
        </div>
        <div className="stat-card">
          <BsPieChart className="stat-icon" />
          <h3>${stats.goldInvestment}</h3>
          <p>Gold Investment</p>
        </div>
      </div>

      <div className="chart-container">
        <h3>Investment Trends</h3>
        <Chart
          options={chartData.options}
          series={chartData.series}
          type="area"
          height={300}
        />
      </div>
    </div>
  );
};

export default Dashboard;
