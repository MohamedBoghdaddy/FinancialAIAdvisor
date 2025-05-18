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

// Helper to get token from cookie, localStorage token, or user object
const getToken = () => {
  // 1. Check cookie
  let token = Cookies.get("token");
  if (token) return token;

  // 2. Check localStorage token
  token = localStorage.getItem("token");
  if (token) return token;

  // 3. Try parsing user object for token
  const userString = localStorage.getItem("user");
  if (userString) {
    try {
      const user = JSON.parse(userString);
      if (user?.token) return user.token;
    } catch (e) {
      console.error("Failed to parse user from localStorage for token:", e);
    }
  }

  return null;
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * ✅ Fetch Authenticated User
   * - Reads token from cookies/local storage/user object.
   * - Sends request to backend to validate session.
   */
  const checkAuth = useCallback(async () => {
    try {
      const token = getToken();

      if (!token) {
        console.warn("🚫 No token found. User is not authenticated.");
        dispatch({ type: "AUTH_ERROR" });
        return;
      }

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const response = await axios.get(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:4000"
        }/api/users/checkAuth`,
        { withCredentials: true }
      );

      if (response.data?.user) {
        dispatch({ type: "USER_LOADED", payload: response.data.user });
      } else {
        throw new Error("User data not found.");
      }
    } catch (error) {
      console.error(
        "❌ Authentication check failed:",
        error.response?.data?.message || error.message
      );
      dispatch({ type: "AUTH_ERROR" });
      Cookies.remove("token");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete axios.defaults.headers.common["Authorization"];
    }
  }, []);

  /**
   * ✅ Ensure User is Persisted on Page Reload
   * - Loads from local storage first.
   * - Verifies token with backend.
   */
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const { user, token } = JSON.parse(storedUser);
        dispatch({ type: "LOGIN_SUCCESS", payload: user });

        // Use unified getToken to always pick the right token
        const authToken = getToken();
        if (authToken) {
          axios.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${authToken}`;
        }
      } catch (error) {
        console.error("❌ Failed to parse user from localStorage:", error);
        dispatch({ type: "AUTH_ERROR" });
      }
    } else {
      checkAuth(); // Fetch user session if no user in localStorage
    }
  }, [checkAuth]);

  /**
   * ✅ Logout Function
   * - Clears user session from cookies & local storage.
   */
  const logout = () => {
    Cookies.remove("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    dispatch({ type: "LOGOUT_SUCCESS" });
  };

  // Memoize context to avoid unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch, logout }), [state]);

  useEffect(() => {
    console.log("🔍 AuthProvider state updated:", state);
  }, [state]);

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
