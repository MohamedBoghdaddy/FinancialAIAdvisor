import React, { useState } from "react";
import { Container, Row, Col, Tab, Card, Button } from "react-bootstrap";
import { useAuthContext } from "../../../context/AuthContext";
import LoanCalculator from './LoanCalculator';
import adviceList from './adviceList';

import Chat from "../Features/Chat";
import Questionnaire from "../Features/Questionnaire";
import CurrencyConverter from "./CurrencyConverter";

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
  const [aiAdvice, setAiAdvice] = useState(""); // ✅ Always initialized as empty string
  const [isLoading, setIsLoading] = useState(false);

  const handleGetAiAdvice = () => {
    setIsLoading(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * adviceList.length);
      setAiAdvice(adviceList[randomIndex] || "No advice available."); // ✅ Safe fallback
      setShowAiAdvice(true);
      setIsLoading(false);
    }, 1000);
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
        aiAdvice={aiAdvice || ""} // ✅ Always pass a string
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

                <Tab.Pane eventKey="transactions">
                  <h2 className="tab-title">Transaction History</h2>
                  <Card className="dashboard-card">
                    <Card.Body>
                      <div className="transaction-list">
                        {dashboardData.recentTransactions.map((transaction) => (
                          <div key={transaction.id} className="transaction-item">
                            <div className="transaction-info">
                              <div className="transaction-date">{transaction.date}</div>
                              <div className="transaction-description">
                                {transaction.description}
                                <span className="transaction-category">
                                  {transaction.category}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`transaction-amount ${transaction.amount > 0 ? "positive" : "negative"}`}
                            >
                              {transaction.amount > 0 ? "+" : ""}
                              {transaction.amount.toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card.Body>
                  </Card>
                </Tab.Pane>

                <Tab.Pane eventKey="goals">
                  <h2 className="tab-title">Financial Goals</h2>
                  <p>This section will display your financial goals and progress.</p>
                </Tab.Pane>

                <Tab.Pane eventKey="advice">
                  <h2 className="tab-title">AI Financial Advice</h2>
                  <Row>
                    <Col lg={6} className="mb-4">
                      <Card className="dashboard-card">
                        <Card.Body>
                          <h5>Get Personalized Financial Advice</h5>
                          <p className="mb-4">
                            Our AI analyzes your financial data and provides personalized
                            recommendations to help you achieve your financial goals.
                          </p>
                          <Button
                            variant="primary"
                            onClick={handleGetAiAdvice}
                            disabled={isLoading}
                          >
                            {isLoading ? "Generating Advice..." : "Get AI Advice"}
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col lg={6} className="mb-4">
                      <Card className="dashboard-card">
                        <Card.Body>
                          <h5>Financial Questionnaire</h5>
                          <p className="mb-4">
                            Complete our questionnaire to help us better understand your
                            financial situation and goals.
                          </p>
                          <Button
                            variant="outline-primary"
                            onClick={() => setActiveTab("questionnaire")}
                          >
                            Take Questionnaire
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab.Pane>

                <Tab.Pane eventKey="chat">
                  <h2 className="tab-title">AI Financial Advisor Chat</h2>
                  <Chat />
                </Tab.Pane>

                <Tab.Pane eventKey="questionnaire">
                  <h2 className="tab-title">Financial Questionnaire</h2>
                  <Questionnaire />
                </Tab.Pane>

                <Tab.Pane eventKey="settings">
                  <h2 className="tab-title">Account Settings</h2>
                  <p>This section will allow you to manage your account settings.</p>
                </Tab.Pane>
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      </Container>
    </div>
  );
};

export default Dashboard;
