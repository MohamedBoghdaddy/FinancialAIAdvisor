import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../../../context/AuthContext";
import { useLogout } from "../../../hooks/useLogout.js";
import "../styles/navbar.css";
import Logo from "../../../assets/latest_logo.png";

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAuthContext();
  const { user, isAuthenticated } = state;
  const { logout } = useLogout();

  // Handle navbar background on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Close mobile menu when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const navMenu = document.querySelector(".nav-menu");
      const menuIcon = document.querySelector(".menu-icon");

      if (
        isOpen &&
        navMenu &&
        !navMenu.contains(event.target) &&
        menuIcon &&
        !menuIcon.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false); // Close mobile menu if open
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Auth Buttons Component
  const AuthButtons = () => (
    <div className="auth-container">
      {isAuthenticated && user ? (
        <>
          <span className="user-name">{user.username || user.email}</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="login-btn">
            Login
          </Link>
          <Link to="/signup" className="signup-btn">
            Sign Up
          </Link>
        </>
      )}
    </div>
  );

  return (
    <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img src={Logo} alt="Financial AI Advisor" />
        </Link>

        <div
          className="menu-icon"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <div className={`hamburger ${isOpen ? "active" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <ul className={`nav-menu ${isOpen ? "active" : ""}`}>
          <li className="nav-item">
            <Link
              to="/"
              className={
                location.pathname === "/" ? "nav-link active" : "nav-link"
              }
            >
              Home
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/about"
              className={
                location.pathname === "/about" ? "nav-link active" : "nav-link"
              }
            >
              About
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/lifemanagement"
              className={
                location.pathname === "/life-management"
                  ? "nav-link active"
                  : "nav-link"
              }
            >
              Life Management
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/contact"
              className={
                location.pathname === "/contact"
                  ? "nav-link active"
                  : "nav-link"
              }
            >
              Contact
            </Link>
          </li>

          {isAuthenticated && user && (
            <li className="nav-item">
              <Link
                to="/dashboard"
                className={
                  location.pathname === "/dashboard"
                    ? "nav-link active"
                    : "nav-link"
                }
              >
                Dashboard
              </Link>
            </li>
          )}

          {/* Mobile Auth Buttons */}
          <div className="mobile-auth">
            <AuthButtons />
          </div>
        </ul>

        {/* Desktop Auth Buttons */}
        <div className="desktop-auth">
          <AuthButtons />
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
