import React from "react";
import { Row, Col, Card, Button } from "react-bootstrap";
import SavingsProgress from "../SavingsProgress";
import TransactionList from "../TransactionList";

const OverviewTab = ({ dashboardData }) => {
  const savingsProgress =
    (dashboardData.currentSavings / dashboardData.savingsGoal) * 100;

  return (
    <>
      <h2 className="tab-title">Financial Overview</h2>
      <Row className="mb-4">{/* Account balance cards... */}</Row>
      <Row>
        <Col lg={6} className="mb-4">
          <SavingsProgress
            progress={savingsProgress}
            current={dashboardData.currentSavings}
            goal={dashboardData.savingsGoal}
          />
        </Col>
        {/* Financial tips... */}
      </Row>
      <Row>
        <Col>
          <TransactionList
            transactions={dashboardData.recentTransactions.slice(0, 3)}
          />
        </Col>
      </Row>
    </>
  );
};

export default OverviewTab;
