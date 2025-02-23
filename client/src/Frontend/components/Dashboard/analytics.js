import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Spinner, Table } from "react-bootstrap";
import { BsFileEarmarkText, BsDownload } from "react-icons/bs";
import useDashboard from "../../../hooks/useDashboard";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "../styles/Analytics.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AnalyticsReport = () => {
  const {
    state,
    fetchDashboardData,
    fetchProfile,
    fetchInvestmentReports,
    handleDownload,
  } = useDashboard();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchProfile();
    fetchInvestmentReports();
    setLoading(false);
  }, [fetchDashboardData, fetchProfile, fetchInvestmentReports]);

  const analyticsChartData = {
    labels: ["Gold", "Real Estate", "Stocks"],
    datasets: [
      {
        label: "Predicted Growth %",
        data: [
          state.forecasts?.gold?.predicted_growth || 0,
          state.forecasts?.real_estate?.predicted_growth || 0,
          state.forecasts?.stocks?.predicted_growth || 0,
        ],
        backgroundColor: ["#f1c40f", "#27ae60", "#2980b9"],
      },
    ],
  };

  const chartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
  };

  return (
    <div className="analytic-container">
      <div className="main">
        <div className="main-top">
          <h1>Investment Analytics & Reports</h1>
        </div>

        <h2>Investment Forecasts</h2>
        <div
          className="chart-container"
          style={{ width: "60%", margin: "auto" }}
        >
          {loading ? (
            <Spinner animation="border" role="status">
              <span className="sr-only">Loading...</span>
            </Spinner>
          ) : (
            <Bar data={analyticsChartData} options={chartOptions} />
          )}
        </div>

        {state.profile && (
          <>
            <h2>User Profile</h2>
            <Table striped bordered hover>
              <tbody>
                <tr>
                  <td>Name</td>
                  <td>{state.profile.name}</td>
                </tr>
                <tr>
                  <td>Email</td>
                  <td>{state.profile.email}</td>
                </tr>
              </tbody>
            </Table>
          </>
        )}

        <h2>Financial Preferences</h2>
        {state.preferences ? (
          <Table striped bordered hover>
            <tbody>
              <tr>
                <td>Lifestyle</td>
                <td>{state.preferences.lifestyle}</td>
              </tr>
              <tr>
                <td>Risk Tolerance</td>
                <td>{state.preferences.riskTolerance}</td>
              </tr>
            </tbody>
          </Table>
        ) : (
          <p>No preferences available.</p>
        )}

        <h2>Generated Reports</h2>
        <div className="report-container">
          <div className="report-list">
            {state.reports?.length > 0 ? (
              state.reports.map((report) => (
                <div key={report.id} className="report-card">
                  <BsFileEarmarkText className="report-icon" />
                  <div className="report-info">
                    <h4>{report.title}</h4>
                    <p>{new Date(report.date).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleDownload(report.id)}
                    className="download-btn"
                  >
                    <BsDownload /> Download
                  </button>
                </div>
              ))
            ) : (
              <p>No reports available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReport;
