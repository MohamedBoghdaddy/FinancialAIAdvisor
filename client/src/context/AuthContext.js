// ✅ AuthContext.js — single source of truth for auth/admin state.
// Admin status (`isAdmin`) is derived from the user object returned by the
// backend's /api/users/checkAuth endpoint, NEVER from raw localStorage values
// edited by the client. Treat localStorage only as a cache for the JWT.
import React, {
  createContext, useReducer, useEffect,
  useCallback, useContext, useMemo
} from "react";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
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
      return { ...state, user: action.payload, isAuthenticated: true, loading: false };
    case "LOGOUT_SUCCESS":
    case "AUTH_ERROR":
      return { ...state, user: null, isAuthenticated: false, loading: false };
    default:
      return state;
  }
};

const getToken = () => Cookies.get("token") || localStorage.getItem("token");

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

  // Re-validates the session against the backend. This is the ONLY source
  // of truth for `user` (and therefore `isAdmin`) — never trust a
  // client-edited localStorage "user" object for authorization decisions.
  const checkAuth = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return dispatch({ type: "AUTH_ERROR" });
      setAuthHeaders(token);

      const res = await axios.get(`${API_URL}/api/users/checkAuth`, {
        withCredentials: true,
      });

      if (res.data?.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("token", token);
        Cookies.set("token", token, { expires: 7 });
        dispatch({ type: "USER_LOADED", payload: res.data.user });
      } else {
        clearAuthStorage();
        dispatch({ type: "AUTH_ERROR" });
      }
    } catch (err) {
      clearAuthStorage();
      dispatch({ type: "AUTH_ERROR" });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_URL}/api/users/logout`, {}, { withCredentials: true });
    } catch (err) {
      // Ignore network errors on logout — clear local session regardless.
    } finally {
      clearAuthStorage();
      dispatch({ type: "LOGOUT_SUCCESS" });
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      setAuthHeaders(token);
    }
    // Always re-validate with the backend on load — localStorage is only a cache.
    checkAuth();
  }, [checkAuth]);

  const isAdmin = state.user?.role === "admin";

  const value = useMemo(
    () => ({ state, dispatch, checkAuth, logout, isAdmin }),
    [state, checkAuth, logout, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
