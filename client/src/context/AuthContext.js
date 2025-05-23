// src/context/AuthContext.js
import React, {
  createContext,
  useReducer,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from "react";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL =
  process.env.REACT_APP_API_URL ??
  (window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "https://financial-ai-backend-kr2s.onrender.com");

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN_SUCCESS":
    case "USER_LOADED":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };
    case "LOGOUT_SUCCESS":
    case "AUTH_ERROR":
      return { ...state, user: null, isAuthenticated: false, loading: false };
    default:
      return state;
  }
};

const getToken = () => {
  return (
    Cookies.get("token") ||
    localStorage.getItem("token") ||
    JSON.parse(localStorage.getItem("user") || "null")?.token
  );
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const setAuthHeaders = (token) => {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  const clearAuthStorage = () => {
    Cookies.remove("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
  };

  const checkAuth = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        dispatch({ type: "AUTH_ERROR" });
        return;
      }

      setAuthHeaders(token);

      const response = await axios.get(`${API_URL}/api/users/checkAuth`, {
        withCredentials: true,
      });

      if (response.data?.user) {
        const userData = { user: response.data.user, token };
        localStorage.setItem("user", JSON.stringify(userData));
        Cookies.set("token", token, { expires: 7, secure: true });

        dispatch({ type: "USER_LOADED", payload: response.data.user });
      }
    } catch (error) {
      console.error("Auth check failed:", error.message);
      clearAuthStorage();
      dispatch({ type: "AUTH_ERROR" });
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const token = getToken();

      if (storedUser && token) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setAuthHeaders(token);
          dispatch({ type: "LOGIN_SUCCESS", payload: parsedUser.user });
        } catch (error) {
          console.error("Error parsing stored user:", error);
          clearAuthStorage();
        }
      }

      await checkAuth();
    };

    initializeAuth();
  }, [checkAuth]);

  const logout = useCallback(() => {
    clearAuthStorage();
    dispatch({ type: "LOGOUT_SUCCESS" });
  }, []);

  const contextValue = useMemo(
    () => ({ state, dispatch, logout, setAuthHeaders, checkAuth }),
    [state, logout, checkAuth]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
