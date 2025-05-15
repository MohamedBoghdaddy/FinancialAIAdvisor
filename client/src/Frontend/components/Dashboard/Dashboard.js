import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Tab,
  Nav,
  Modal,
} from "react-bootstrap";
import { useAuthContext } from "../../../context/AuthContext";
import "../styles/dashboard.css";
import Chat from "../Features/Chat";
import Questionnaire from "../Features/Questionnaire";
import LifeManagement from "../Features/LifeManagement";
import StatisticsChart from "./Statistics";

const Dashboard = () => {
  const { state } = useAuthContext();
  const { user } = state;

  const [activeTab, setActiveTab] = useState("overview");
  const [showAiAdvice, setShowAiAdvice] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for dashboard
  const dashboardData = {
    accountBalance: 25750.5,
    monthlyIncome: 5200.0,
    monthlyExpenses: 3450.75,
    savingsGoal: 50000,
    currentSavings: 18500,
    investments: [
      { id: 1, name: "Stock Portfolio", value: 15000, growth: 8.2 },
      { id: 2, name: "Retirement Fund", value: 42000, growth: 5.7 },
      { id: 3, name: "Real Estate", value: 120000, growth: 3.1 },
    ],
    recentTransactions: [
      {
        id: 1,
        date: "2023-05-15",
        description: "Grocery Store",
        amount: -125.4,
        category: "Food",
      },
      {
        id: 2,
        date: "2023-05-14",
        description: "Salary Deposit",
        amount: 2600.0,
        category: "Income",
      },
      {
        id: 3,
        date: "2023-05-12",
        description: "Electric Bill",
        amount: -85.2,
        category: "Utilities",
      },
      {
        id: 4,
        date: "2023-05-10",
        description: "Restaurant",
        amount: -65.8,
        category: "Dining",
      },
      {
        id: 5,
        date: "2023-05-05",
        description: "Investment Deposit",
        amount: -500.0,
        category: "Savings",
      },
    ],
    financialTips: [
      "Consider increasing your retirement contributions by 2% to maximize employer matching.",
      "Your dining expenses are 15% higher than last month. Consider setting a budget for eating out.",
      "You have $1,200 in a low-interest savings account. Consider moving it to a high-yield savings account.",
    ],
  };

  // Calculate savings progress percentage
  const savingsProgress =
    (dashboardData.currentSavings / dashboardData.savingsGoal) * 100;

  const handleGetAiAdvice = async () => {
    setIsLoading(true);
    try {
      // Here you would typically make an API call to your backend
      // For now, we'll simulate a response
      const response = await new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              advice:
                "Based on your current financial situation, I recommend:\n\n" +
                "1. Increase your emergency fund to cover 6 months of expenses\n" +
                "2. Consider diversifying your investment portfolio\n" +
                "3. Look into tax-advantaged retirement accounts\n" +
                "4. Review your monthly subscriptions to reduce unnecessary expenses",
            }),
          1500
        )
      );

      setAiAdvice(response.advice);
      setShowAiAdvice(true);
    } catch (error) {
      console.error("Error getting AI advice:", error);
      setAiAdvice(
        "Sorry, I couldn't generate advice at this time. Please try again later."
      );
      setShowAiAdvice(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <Container>
          <Row className="align-items-center">
            <Col>
              <h1>Welcome back, {user?.name || "User"}</h1>
              <p className="text-muted">Here's an overview of your finances</p>
            </Col>
            <Col xs="auto">
              <Button
                variant="primary"
                onClick={handleGetAiAdvice}
                disabled={isLoading}
              >
                {isLoading ? "Generating Advice..." : "Get AI Advice"}
              </Button>
            </Col>
          </Row>
        </Container>
      </div>

      {/* AI Advice Modal */}
      <Modal
        show={showAiAdvice}
        onHide={() => setShowAiAdvice(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>AI Financial Advice</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="ai-advice-content">
            {aiAdvice.split("\n").map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAiAdvice(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Container className="dashboard-content">
        <Tab.Container
          id="dashboard-tabs"
          activeKey={activeTab}
          onSelect={setActiveTab}
        >
          <Row>
            <Col lg={3} md={4} className="dashboard-sidebar">
              <Nav variant="pills" className="flex-column">
                <Nav.Item>
                  <Nav.Link eventKey="overview" className="nav-link-custom">
                    Overview
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="investments" className="nav-link-custom">
                    Investments
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="statistics" className="nav-link-custom">
                    Stock Statistics
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="transactions" className="nav-link-custom">
                    Transactions
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="goals" className="nav-link-custom">
                    Goals
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="advice" className="nav-link-custom">
                    AI Advice
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="chat" className="nav-link-custom">
                    AI Chat
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    eventKey="questionnaire"
                    className="nav-link-custom"
                  >
                    Questionnaire
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="life-goals" className="nav-link-custom">
                    Life Goals
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="settings" className="nav-link-custom">
                    Settings
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>

            <Col lg={9} md={8}>
              <Tab.Content>
                <Tab.Pane eventKey="overview">
                  <h2 className="tab-title">Financial Overview</h2>

                  <Row className="mb-4">
                    <Col md={4} className="mb-3 mb-md-0">
                      <Card className="dashboard-card">
                        <Card.Body>
                          <h6 className="card-subtitle">Account Balance</h6>
                          <h3 className="card-value">
                            ${dashboardData.accountBalance.toLocaleString()}
                          </h3>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={4} className="mb-3 mb-md-0">
                      <Card className="dashboard-card">
                        <Card.Body>
                          <h6 className="card-subtitle">Monthly Income</h6>
                          <h3 className="card-value">
                            ${dashboardData.monthlyIncome.toLocaleString()}
                          </h3>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={4}>
                      <Card className="dashboard-card">
                        <Card.Body>
                          <h6 className="card-subtitle">Monthly Expenses</h6>
                          <h3 className="card-value">
                            ${dashboardData.monthlyExpenses.toLocaleString()}
                          </h3>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <Row>
                    <Col lg={6} className="mb-4">
                      <Card className="dashboard-card h-100">
                        <Card.Body>
                          <h5 className="card-title">Savings Goal Progress</h5>
                          <div className="savings-goal">
                            <div className="progress mb-3">
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{ width: `${savingsProgress}%` }}
                                aria-valuenow={savingsProgress}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              >
                                {savingsProgress.toFixed(0)}%
                              </div>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">
                                Current: $
                                {dashboardData.currentSavings.toLocaleString()}
                              </span>
                              <span className="text-muted">
                                Goal: $
                                {dashboardData.savingsGoal.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col lg={6} className="mb-4">
                      <Card className="dashboard-card h-100">
                        <Card.Body>
                          <h5 className="card-title">AI Financial Tips</h5>
                          <ul className="financial-tips">
                            {dashboardData.financialTips.map((tip, index) => (
                              <li key={index}>{tip}</li>
                            ))}
                          </ul>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <Card className="dashboard-card">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="card-title mb-0">
                              Recent Transactions
                            </h5>
                            <Button
                              variant="link"
                              onClick={() => setActiveTab("transactions")}
                            >
                              View All
                            </Button>
                          </div>

                          <div className="transaction-list">
                            {dashboardData.recentTransactions
                              .slice(0, 3)
                              .map((transaction) => (
                                <div
                                  key={transaction.id}
                                  className="transaction-item"
                                >
                                  <div className="transaction-info">
                                    <div className="transaction-date">
                                      {transaction.date}
                                    </div>
                                    <div className="transaction-description">
                                      {transaction.description}
                                    </div>
                                  </div>
                                  <div
                                    className={`transaction-amount ${
                                      transaction.amount > 0
                                        ? "positive"
                                        : "negative"
                                    }`}
                                  >
                                    {transaction.amount > 0 ? "+" : ""}
                                    {transaction.amount.toLocaleString(
                                      "en-US",
                                      {
                                        style: "currency",
                                        currency: "USD",
                                      }
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab.Pane>

                <Tab.Pane eventKey="investments">
                  <h2 className="tab-title">Investment Portfolio</h2>
                  <Row>
                    {dashboardData.investments.map((investment) => (
                      <Col lg={4} md={6} className="mb-4" key={investment.id}>
                        <Card className="dashboard-card h-100">
                          <Card.Body>
                            <h5 className="card-title">{investment.name}</h5>
                            <h3 className="card-value">
                              ${investment.value.toLocaleString()}
                            </h3>
                            <div
                              className={`growth-indicator ${
                                investment.growth > 0 ? "positive" : "negative"
                              }`}
                            >
                              {investment.growth > 0 ? "↑" : "↓"}{" "}
                              {Math.abs(investment.growth)}%
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Tab.Pane>

                <Tab.Pane eventKey="statistics">
                  <StatisticsChart />
                </Tab.Pane>

                <Tab.Pane eventKey="transactions">
                  <h2 className="tab-title">Transaction History</h2>
                  <Card className="dashboard-card">
                    <Card.Body>
                      <div className="transaction-list">
                        {dashboardData.recentTransactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="transaction-item"
                          >
                            <div className="transaction-info">
                              <div className="transaction-date">
                                {transaction.date}
                              </div>
                              <div className="transaction-description">
                                {transaction.description}
                                <span className="transaction-category">
                                  {transaction.category}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`transaction-amount ${
                                transaction.amount > 0 ? "positive" : "negative"
                              }`}
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
                  <p>
                    This section will display your financial goals and progress.
                  </p>
                </Tab.Pane>

                <Tab.Pane eventKey="advice">
                  <h2 className="tab-title">AI Financial Advice</h2>
                  <Row>
                    <Col lg={6} className="mb-4">
                      <Card className="dashboard-card">
                        <Card.Body>
                          <h5>Get Personalized Financial Advice</h5>
                          <p className="mb-4">
                            Our AI analyzes your financial data and provides
                            personalized recommendations to help you achieve
                            your financial goals.
                          </p>
                          <Button
                            variant="primary"
                            onClick={handleGetAiAdvice}
                            disabled={isLoading}
                          >
                            {isLoading
                              ? "Generating Advice..."
                              : "Get AI Advice"}
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col lg={6} className="mb-4">
                      <Card className="dashboard-card">
                        <Card.Body>
                          <h5>Financial Questionnaire</h5>
                          <p className="mb-4">
                            Complete our questionnaire to help us better
                            understand your financial situation and goals.
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

                <Tab.Pane eventKey="life-goals">
                  <h2 className="tab-title">Life Goals Management</h2>
                  <LifeManagement />
                </Tab.Pane>

                <Tab.Pane eventKey="settings">
                  <h2 className="tab-title">Account Settings</h2>
                  <p>
                    This section will allow you to manage your account settings.
                  </p>
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
