import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Spinner, Table } from "react-bootstrap";
import { BsFileEarmarkText, BsDownload } from "react-icons/bs";
import axios from "axios";
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

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:4000/api/analytics";

const AnalyticsReport = () => {
  const { state, fetchProfile, handleDownload } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [riskToleranceData, setRiskToleranceData] = useState([]);
  const [lifestyleData, setLifestyleData] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [riskRes, lifestyleRes] = await Promise.all([
          axios.get(`${API_URL}/risk-tolerance`),
          axios.get(`${API_URL}/lifestyle`),
        ]);

        setRiskToleranceData(Array.isArray(riskRes.data) ? riskRes.data : []);
        setLifestyleData(
          Array.isArray(lifestyleRes.data) ? lifestyleRes.data : []
        );
      } catch (error) {
        console.error("❌ Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    fetchAnalytics();
  }, [fetchProfile]);

  // ✅ Chart Data Configuration
  const analyticsChartData = {
    labels: riskToleranceData.map((item) => item._id || "Unknown"),
    datasets: [
      {
        label: "Users per Risk Tolerance",
        data: riskToleranceData.map((item) => item.totalUsers || 0),
        backgroundColor: ["#f1c40f", "#27ae60", "#2980b9"],
      },
    ],
  };

  const chartOptions = {
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  return (
    <div className="analytic-container">
      <div className="main">
        <div className="main-top">
          <h1>Financial & Investment Analytics</h1>
        </div>

        {/* ✅ Risk Tolerance Chart */}
        <h2>Risk Tolerance Distribution</h2>
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

        {/* ✅ Profile Section */}
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

        {/* ✅ Financial Preferences Section */}
        <h2>Lifestyle Preferences</h2>
        {lifestyleData.length > 0 ? (
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Lifestyle Type</th>
                <th>Users</th>
              </tr>
            </thead>
            <tbody>
              {lifestyleData.map((item) => (
                <tr key={item._id}>
                  <td>{item._id || "Unknown"}</td>
                  <td>{item.totalUsers || 0}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p>No lifestyle data available.</p>
        )}

        {/* ✅ Reports Section */}
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
