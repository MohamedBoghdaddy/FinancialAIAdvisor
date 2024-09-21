import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";
import { Container, Row, Col, Button } from "react-bootstrap";

const CallToActionSection = () => {
  const navigate = useNavigate();

  const handleRegisterClick = () => {
    navigate("/signup");
  };

  return (
    <div className="Register-section">
      <Container>
        <Row>
          <Col>
            <h2>Take Control of Your Finances</h2>
            <p>
              Register now to receive personalized financial advice, powered by
              AI. Achieve your financial goals with tailored recommendations and
              insights.
            </p>
            <Button onClick={handleRegisterClick}>Get Started Today</Button>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CallToActionSection;
