import React from "react";
import { Nav } from "react-bootstrap";
import { Row, Col, Card, Button } from "react-bootstrap";

const DashboardSidebar = ({ setActiveTab }) => (
  <Col lg={3} md={4} className="dashboard-sidebar">
    <Nav variant="pills" className="flex-column">
      <Nav.Item>
        <Nav.Link eventKey="overview" className="nav-link-custom">
          Overview
        </Nav.Link>
      </Nav.Item>
      {/* Other nav items... */}
    </Nav>
  </Col>
);

export default DashboardSidebar;
