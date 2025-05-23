import React from "react";
import { Row, Col, Card } from "react-bootstrap";
import InvestmentCard from "../components/InvestmentCard";

const InvestmentsTab = ({ investments }) => (
  <>
    <h2 className="tab-title">Investment Portfolio</h2>
    <Row>
      {investments.map((investment) => (
        <Col lg={4} md={6} className="mb-4" key={investment.id}>
          <InvestmentCard investment={investment} />
        </Col>
      ))}
    </Row>
  </>
);

export default InvestmentsTab;
