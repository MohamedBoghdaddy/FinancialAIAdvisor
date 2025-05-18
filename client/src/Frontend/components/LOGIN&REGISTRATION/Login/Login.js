import React from "react";
import { Link } from "react-router-dom";
import { useLogin } from "../../../../hooks/useLogin"; // Adjust path as needed
import ShowPass from "../../../../assets/eye.svg";
import ShowPassOff from "../../../../assets/eye-off.svg";
import "../../styles/login.css";

const Login = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    errorMessage,
    successMessage,
    isLoading,
    handleLogin,
  } = useLogin();

  return (
    <div className="main-container">
      <div className="login-container">
        {/* Left Side - Login Form */}
        <div className="left-login">
          <h2>Login</h2>
          <form style={{ width: "90%", margin: "auto" }} onSubmit={handleLogin}>
            {/* Email Field */}
            <div className="field">
              <div className="field-wrapper">
                <label className="custom_label" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div className="field password-container">
              <div className="field-wrapper">
                <label className="custom_label" htmlFor="password">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    placeholder="Enter your password"
                    className="password_field"
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="show-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <img
                      src={showPassword ? ShowPassOff : ShowPass}
                      alt={
                        showPassword
                          ? "Hide password icon"
                          : "Show password icon"
                      }
                      draggable="false"
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Error and Success Messages */}
            {errorMessage && <div className="error">{errorMessage}</div>}
            {successMessage && <div className="success">{successMessage}</div>}

            {/* Submit Button */}
            <button className="left_btn" type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>

        {/* Right Side - Signup Prompt */}
        <div className="right-login">
          <h4 className="reg_cta">Don't have an account?</h4>
          <Link to="/signup" className="reg_link">
            <button className="right_btn" type="button" disabled={isLoading}>
              Signup
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
