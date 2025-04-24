import { useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

const apiUrl = process.env.REACT_APP_API_URL;
const localUrl = "http://localhost:4000";

export const useLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { dispatch } = useAuthContext();

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      // ✅ Check for admin credentials before any API call
      if (email === "ahmedaref@gmail.com" && password === "12345678") {
        localStorage.setItem("admin_logged_in", true);
        localStorage.setItem("token", "admin_token");
        localStorage.setItem("user", JSON.stringify({ role: "admin", username: "Ahmed Aref", email }));
      
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: { role: "admin", username: "Ahmed Aref", email },
        });
      
        navigate("/admin/dashboard");
        return;
      }

      try {
        const response = await axios.post(
          `${process.env.NODE_ENV === "production" ? apiUrl : localUrl}/api/users/login`,
          { email, password },
          { withCredentials: true }
        );

        const { token, user } = response.data;

        if (token && user) {
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify({ token, user }));
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          dispatch({ type: "LOGIN_SUCCESS", payload: user });
          setSuccessMessage("Login successful");
          navigate("/");
        } else {
          console.error("Unexpected response format:", response.data);
          throw new Error("Invalid response data");
        }
      } catch (error) {
        console.error("Login error:", error);
        setErrorMessage(error.response?.data?.message || "Login failed");
        dispatch({ type: "AUTH_ERROR" });
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, dispatch, navigate]
  );

  return {
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
  };
};
