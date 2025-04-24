import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "../../../../hooks/useLogin";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // ✅ React Icons (no Font Awesome)
import "../../styles/login.css";

const Login = () => {
  const navigate = useNavigate();

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
  } = useLogin(navigate);

  return (
    <div className="main-container">
      <div className="login-container">
        <div className="left-login">
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <div className="field">
              <div className="field-wrapper">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field password-container">
              <div className="field-wrapper">
                <label htmlFor="password">Password:</label>
                <div className="password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {password && (
                    <span
                      className="toggle-visibility"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {errorMessage && <div className="error">{errorMessage}</div>}
            {successMessage && <div className="success">{successMessage}</div>}

            <button className="left_btn" type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>

        <div className="right-login">
          <h1>Don't have an account?</h1>
          <Link to="/signup">
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
