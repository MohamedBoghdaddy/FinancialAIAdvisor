import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFacebookF,
  faLinkedin,
  faInstagram,
} from "@fortawesome/free-brands-svg-icons";

import "../styles/footer.css";

function Footer() {
  return (
    <section className="footer">
      <div className="footer-container">
        <div className="footer-col">
          <h4>AI Personal Financial Advisor</h4>
          <p>
            Manage your finances like never before. Our AI-powered platform
            provides personalized budgeting, investment, and savings advice.
            Take control of your financial future with data-driven insights.
          </p>
          <div className="icons">
            <a href="https://www.facebook.com/yourcompany">
              <FontAwesomeIcon icon={faFacebookF} />
            </a>{" "}
            <a href="https://www.instagram.com/yourcompany">
              <FontAwesomeIcon icon={faInstagram} />
            </a>
            <a href="https://www.linkedin.com/company/yourcompany">
              <FontAwesomeIcon icon={faLinkedin} />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Subscribe for Financial Tips</h4>
          <form className="newsletter-form">
            <input type="email" placeholder="Enter your email" />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Footer;
