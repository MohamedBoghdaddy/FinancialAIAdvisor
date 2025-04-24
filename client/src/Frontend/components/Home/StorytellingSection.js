import React from "react";
import { Container, Row, Col } from "react-bootstrap";

import "../styles/Home.css";

const StorytellingSection = () => (
  <Container className="storytelling-section" id="About us">
    <Row>
    <Col md={6} className="text-center">
    <img
      src="ai-financial-advisor_0.png"
      alt="AI Financial Advisor"
      style={{ width: "100%", maxWidth: "650px", height: "450px", borderRadius: "10px" }}
    />
  </Col>
      <Col md={6}>
        <h2>Our Mission</h2>
        <p>
          We believe that everyone should have access to expert financial
          advice, no matter their background or financial status. That’s why we
          built an AI-powered platform to provide personalized, data-driven
          insights to help you manage your finances smarter and more
          efficiently.
        </p>
        <p>
          Our team of data scientists and financial experts combined their
          knowledge to create a tool that understands your financial goals and
          delivers actionable advice—from budgeting to investment strategies.
        </p>
        <p>
          This journey is about more than just technology; it's about empowering
          you to take charge of your financial future with confidence.
        </p>
        <p>
          Join us today, and start your path to financial freedom with AI on
          your side.
        </p>
      </Col>
    </Row>
  </Container>
);

export default StorytellingSection;
