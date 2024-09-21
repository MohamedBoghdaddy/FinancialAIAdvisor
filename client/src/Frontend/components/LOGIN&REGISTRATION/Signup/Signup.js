import React from "react";
import { Link } from "react-router-dom";
import "../../styles/signup.css"; // Shared CSS
import { useSignup } from "../../../../hooks/useSignup";

const Signup = () => {
  const {
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    gender,
    setGender,
    nid,
    setNid,
    income,
    setIncome,
    financialGoals,
    setFinancialGoals,
    firstName,
    setFirstName,
    middleName,
    setMiddleName,
    lastName,
    setLastName,
    errorMessage,
    successMessage,
    isLoading,
    handleSignup,
  } = useSignup();

  return (
    <div className="main-Container">
      <div className="frame-Container">
        <div className="left-sign">
          <h2>Sign Up for Personalized Financial Advice</h2>
          <form onSubmit={handleSignup}>
            <div className="field">
              <div className="field-wrapper">
                <label htmlFor="username">Username:</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                />
              </div>
            </div>
            <div className="field">
              <div className="field-wrapper">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={70}
                />
              </div>
            </div>
            <div className="field">
              <div className="field-wrapper">
                <label htmlFor="nid">National ID (NID):</label>
                <input
                  type="text"
                  id="nid"
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                  maxLength={14}
                />
              </div>
            </div>
            <div className="field">
              <div className="field-wrapper">
                <label htmlFor="income">Monthly Income:</label>
                <input
                  type="number"
                  id="income"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="Enter your income"
                />
              </div>
            </div>
            <div className="field">
              <div className="field-wrapper">
                <label htmlFor="financialGoals">Financial Goals:</label>
                <input
                  type="text"
                  id="financialGoals"
                  value={financialGoals}
                  onChange={(e) => setFinancialGoals(e.target.value)}
                  placeholder="e.g., Save for a house, Retirement"
                />
              </div>
            </div>
            <div className="field">
              <div className="field-wrapper">
                <label htmlFor="firstName">First Name:</label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <div className="field-wrapper">
                <label htmlFor="middleName">Middle Name:</label>
                <input
                  type="text"
                  id="middleName"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <div className="field-wrapper">
                <label htmlFor="lastName">Last Name:</label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="field password-container">
              <div className="field-wrapper">
                <label htmlFor="password">Password:</label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="show-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i
                    className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}
                  ></i>
                </button>
              </div>
            </div>
            <div className="field password-container">
              <div className="field-wrapper">
                <label htmlFor="confirmPassword">Confirm Password:</label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="show-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <i
                    className={
                      showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"
                    }
                  ></i>
                </button>
              </div>
            </div>
            <div className="field">
              <label>Gender:</label>
              <div className="gender-container">
                <label>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === "male"}
                    onChange={(e) => setGender(e.target.value)}
                  />
                  Male
                </label>
                <label>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === "female"}
                    onChange={(e) => setGender(e.target.value)}
                  />
                  Female
                </label>
              </div>
            </div>
            {errorMessage && <div className="error">{errorMessage}</div>}
            {successMessage && <div className="success">{successMessage}</div>}
            <button className="left_btn" type="submit" disabled={isLoading}>
              {isLoading ? "Signing up..." : "Signup"}
            </button>
          </form>
        </div>
        <div className="right-sign">
          <h1>Already have an account?</h1>
          <Link to="/login">
            <button className="right_btn" type="button">
              Login
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
