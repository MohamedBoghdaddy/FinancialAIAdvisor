import React, { useState } from "react";
import { Container, Row, Col, Tab } from "react-bootstrap";
import { useAuthContext } from "../../../context/AuthContext";
import "../styles/dashboard.css";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import OverviewTab from "./tabs/OverviewTab";
import InvestmentsTab from "./tabs/InvestmentsTab";
import AIAdviceModal from "./AIAdviceModal";
import { dashboardData } from "./dashboardData";

const Dashboard = () => {
  const { state } = useAuthContext();
  const { user } = state;
  const [activeTab, setActiveTab] = useState("overview");
  const [showAiAdvice, setShowAiAdvice] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGetAiAdvice = async () => {
    setIsLoading(true);
    try {
      // Simulated API call
      const response = await new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              advice:
                "Based on your current financial situation:\n\n" +
                "1. Increase emergency fund to 6 months of expenses\n" +
                "2. Diversify your investment portfolio\n" +
                "3. Review tax-advantaged retirement accounts\n" +
                "4. Audit monthly subscriptions",
            }),
          1500
        )
      );
      setAiAdvice(response.advice);
      setShowAiAdvice(true);
    } catch (error) {
      console.error("Error getting AI advice:", error);
      setAiAdvice("Failed to generate advice. Please try again.");
      setShowAiAdvice(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <DashboardHeader
        user={user}
        isLoading={isLoading}
        handleGetAiAdvice={handleGetAiAdvice}
      />

      <AIAdviceModal
        show={showAiAdvice}
        onHide={() => setShowAiAdvice(false)}
        aiAdvice={aiAdvice}
      />

      <Container className="dashboard-content">
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Row>
            <DashboardSidebar setActiveTab={setActiveTab} />

            <Col lg={9} md={8}>
              <Tab.Content>
                <Tab.Pane eventKey="overview">
                  <OverviewTab dashboardData={dashboardData} />
                </Tab.Pane>

                <Tab.Pane eventKey="investments">
                  <InvestmentsTab investments={dashboardData.investments} />
                </Tab.Pane>

                {/* Add other tabs as needed */}
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      </Container>
    </div>
  );
};

export default Dashboard;
