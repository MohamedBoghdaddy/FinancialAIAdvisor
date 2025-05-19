import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";

const DashboardHeader = ({ user, isLoading, handleGetAiAdvice }) => (
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
);

export default DashboardHeader;
