import React, { useState } from "react";
import { Navbar, Nav, Container, Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { NavLink, useNavigate } from "react-router-dom";
import { Link as ScrollLink } from "react-scroll";
import Login from "../LOGIN&REGISTRATION/Login/Login";
import { useAuthContext } from "../../../context/AuthContext";
import { useLogout } from "../../../hooks/useLogout.js";
import "../styles/navbar.css";
import "bootstrap/dist/css/bootstrap.min.css";

const NavBar = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const { state } = useAuthContext();
  const { user, isAuthenticated } = state;
  const { logout } = useLogout();

  const handleLoginModalOpen = () => {
    setShowLoginModal(true);
  };

  const handleLoginModalClose = () => {
    setShowLoginModal(false);
  };

  const handleNavCollapse = () => setExpanded(false);

  const handleLogout = async () => {
    logout();
    navigate("/");
  };

  return (
    <Navbar expand="lg" className="navbar" variant="dark" expanded={expanded}>
      <Container fluid>
        <Navbar.Brand as={NavLink} to="/" className="navbar-brand">
          <img
            // src={logo} // Uncomment and add your logo source
            alt="Company Logo"
            style={{ width: "80px", height: "57px", top: 0 }}
          />
        </Navbar.Brand>
        <Navbar.Toggle
          aria-controls="basic-navbar-nav"
          className="navbar-toggler"
          onClick={() => setExpanded(!expanded)}
        />
        <Navbar.Collapse id="navbarScroll" className="navbar-collapse">
          <Nav className="navbar-nav ms-auto" navbarScroll>
            <Nav.Link
              as={NavLink}
              to="/Home"
              className="nav-link"
              onClick={handleNavCollapse}
            >
              HOME
            </Nav.Link>

            <Nav.Link
              as={ScrollLink}
              to="WhoWeAre"
              smooth
              className="nav-link"
              onClick={handleNavCollapse}
            >
              WHO WE ARE
            </Nav.Link>

            <Nav.Link
              as={NavLink}
              to="/contact"
              className="nav-link"
              onClick={handleNavCollapse}
            >
              Contact Us
            </Nav.Link>

            {isAuthenticated && user && (
              <Nav.Link
                as={NavLink}
                to="/Dashboard"
                className="nav-link"
                onClick={handleNavCollapse}
              >
                Dashboard
              </Nav.Link>
            )}

            {isAuthenticated && user ? (
              <Nav.Link
                className="nav-link"
                role="button"
                onClick={handleLogout}
              >
                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
              </Nav.Link>
            ) : (
              <Nav.Link
                className="nav-link"
                role="button"
                onClick={handleLoginModalOpen}
              >
                <FontAwesomeIcon icon={faUser} />
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>

      <Modal show={showLoginModal} onHide={handleLoginModalClose} centered>
        <Modal.Header closeButton></Modal.Header>
        <Modal.Body>
          <Login onLoginSuccess={handleLoginModalClose} />
        </Modal.Body>
      </Modal>
    </Navbar>
  );
};

export default NavBar;