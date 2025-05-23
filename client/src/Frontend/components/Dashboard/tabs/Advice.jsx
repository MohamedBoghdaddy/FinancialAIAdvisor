import React from "react";
import { Row, Col, Card, Button } from "react-bootstrap";

const AdviceTab = ({ handleGetAiAdvice, isLoading, setActiveTab }) => (
  <>
    <h2 className="tab-title">AI Financial Advice</h2>
    <Row>
      <Col lg={6} className="mb-4">
        <Card className="dashboard-card">{/* AI Advice Card Content */}</Card>
      </Col>
      {/* Questionnaire Card */}
    </Row>
  </>
);

export default AdviceTab;
