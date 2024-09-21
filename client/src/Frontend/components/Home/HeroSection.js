import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import "../styles/Home.css";
// import logoblack from "../assets/images/logo-black.png";

const HeroSection = () => (
  <div className="hero-section">
    <Container>
      <Row>
        <Col md={6}>
          <img
            // src={logoblack}
            alt="Financial Advisor AI logo"
            style={{ width: "500px", height: "auto" }}
          />
        </Col>
        <Col md={6}>
          <h1>Welcome to Your AI Financial Advisor</h1>
          <p>
            Your personal AI-driven financial expert: Budgeting, investment
            strategies, savings advice, and more—all tailored to your needs.
          </p>
          <Button variant="dark" as={Link} to="/signup">
            Start Your Free Trial
          </Button>
        </Col>
      </Row>
    </Container>
  </div>
);

export default HeroSection;
