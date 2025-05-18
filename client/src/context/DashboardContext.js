import React, {
  createContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export const DashboardContext = createContext();

// Initial state factory to avoid shared reference issues on reset
const createInitialState = () => ({
  profile: null,
  survey: null,
  analytics: {
    riskTolerance: [],
    lifestyle: [],
  },
  marketData: {
    stockHistory: null,
    goldHistory: null,
    realEstateHistory: null,
    stockPredictions: null,
    goldPredictions: null,
    realEstatePredictions: null,
  },
  loading: {
    profile: false,
    marketData: false,
    predictions: false,
    aiAdvice: false,
    goalPlan: false,
  },
  error: null,
  aiAdvice: null,
  goalPlan: null,
  lastUpdated: null,
});

const initialState = createInitialState();

const dashboardReducer = (state, action) => {
  switch (action.type) {
    case "FETCH_START":
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload]: true,
        },
        error: null,
      };
    case "FETCH_PROFILE_SUCCESS":
      return {
        ...state,
        profile: action.payload,
        lastUpdated: new Date().toISOString(),
        loading: { ...state.loading, profile: false },
        error: null,
      };
    case "FETCH_MARKET_DATA_SUCCESS":
      return {
        ...state,
        marketData: {
          ...state.marketData,
          ...action.payload,
        },
        loading: { ...state.loading, marketData: false },
        error: null,
      };
    case "FETCH_MARKET_PREDICTIONS_SUCCESS":
      return {
        ...state,
        marketData: {
          ...state.marketData,
          ...action.payload,
        },
        loading: { ...state.loading, predictions: false },
        error: null,
      };
    case "FETCH_AI_ADVICE_SUCCESS":
      return {
        ...state,
        aiAdvice: action.payload,
        loading: { ...state.loading, aiAdvice: false },
        error: null,
      };
    case "FETCH_GOAL_PLAN_SUCCESS":
      return {
        ...state,
        goalPlan: action.payload,
        loading: { ...state.loading, goalPlan: false },
        error: null,
      };
    case "UPDATE_PROFILE":
      return {
        ...state,
        profile: action.payload,
        lastUpdated: new Date().toISOString(),
        loading: { ...state.loading, profile: false },
        error: null,
      };
    case "FETCH_ERROR":
      return {
        ...state,
        loading: Object.keys(state.loading).reduce(
          (acc, key) => ({ ...acc, [key]: false }),
          {}
        ),
        error: action.payload,
      };
    case "RESET_STATE":
      return createInitialState();
    default:
      return state;
  }
};

// Custom hook to manage token with sync from localStorage
const useAuthToken = () => {
  const [token, setToken] = useState(() => {
    const localToken = localStorage.getItem("token");
    if (localToken) return localToken;
    const userString = localStorage.getItem("user");
    if (userString) {
      try {
        const user = JSON.parse(userString);
        return user.token || null;
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "token" || event.key === "user") {
        const localToken = localStorage.getItem("token");
        setToken(localToken);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return token;
};



export const DashboardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const token = useAuthToken();
  const user = useAuthToken();
  const handleError = useCallback((error, defaultMessage) => {
    const message = error.response?.data?.message || defaultMessage;
    toast.error(`❌ ${message}`);
    console.error("Error:", error);
    return message;
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!token) {
      dispatch({ type: "FETCH_ERROR", payload: "Authentication required" });
      return;
    }
    dispatch({ type: "FETCH_START", payload: "profile" });

    const controller = new AbortController();
    try {
      const res = await axios.get(`${API_URL}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
        withCredentials: true,
        signal: controller.signal,
      });
      dispatch({ type: "FETCH_PROFILE_SUCCESS", payload: res.data.data });
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Fetch profile request canceled");
        return;
      }

      let errorMessage = "Failed to load profile";
      if (err.code === "ERR_NETWORK") {
        errorMessage = "Network error. Please check your connection.";
      } else {
        errorMessage = handleError(err, errorMessage);
      }
      dispatch({ type: "FETCH_ERROR", payload: errorMessage });
    }
    return () => controller.abort();
  }, [token,user, handleError]);

  const submitProfile = useCallback(
    async (profileData) => {
      if (!token) {
        toast.error("❌ User not authenticated. Please login again.");
        window.location.href = "/login";
        return;
      }

      dispatch({ type: "FETCH_START", payload: "profile" });

      try {
        const res = await axios.post(`${API_URL}/api/profile`, profileData, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
          withCredentials: true,
        });

        dispatch({ type: "UPDATE_PROFILE", payload: res.data.data });
        toast.success("✅ Profile saved successfully!");
        return res.data;
      } catch (err) {
        console.error("Profile submission error:", err);


        let errorMessage = "Profile submission failed";
        if (err.code === "ERR_NETWORK") {
          errorMessage = "Network error. Please check your connection.";
        } else if (err.response?.status === 400) {
          errorMessage = err.response.data.message || "Invalid request data";
        }

        toast.error(`❌ ${errorMessage}`);
        dispatch({ type: "FETCH_ERROR", payload: errorMessage });
        throw err;
      }
    },
    [token, user]
  );

  const fetchMarketData = useCallback(
    async (type, options = {}) => {
      if (!token) return;

      dispatch({ type: "FETCH_START", payload: "marketData" });

      try {
        let endpoint;
        const { symbol = "AAPL", period = "1y" } = options;

        switch (type) {
          case "stock":
            endpoint = `/market/stock/historical?symbol=${symbol}&period=${period}`;
            break;
          case "gold":
            endpoint = `/market/gold/history?period=${period}`;
            break;
          case "realEstate":
            endpoint = `/market/real-estate/history?period=${period}`;
            break;
          default:
            throw new Error("Invalid market type");
        }

        const res = await axios.get(`${API_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        dispatch({
          type: "FETCH_MARKET_DATA_SUCCESS",
          payload: { [`${type}History`]: res.data.data },
        });
      } catch (err) {
        const errorMessage = handleError(err, `Failed to fetch ${type} data`);
        dispatch({ type: "FETCH_ERROR", payload: errorMessage });
      }
    },
    [token, handleError]
  );

  const fetchPredictions = useCallback(
    async (type, options = {}) => {
      if (!token) return;

      dispatch({ type: "FETCH_START", payload: "predictions" });

      try {
        let endpoint;
        const { symbol = "AAPL", days = 15 } = options;

        switch (type) {
          case "stock":
            endpoint = `/market/stock/predict?symbol=${symbol}`;
            break;
          case "gold":
            endpoint = `/market/gold/predict?days=${days}`;
            break;
          case "realEstate":
            endpoint = `/market/real-estate/predict?days=${days}`;
            break;
          default:
            throw new Error("Invalid prediction type");
        }

        const res = await axios.get(`${API_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        dispatch({
          type: "FETCH_MARKET_PREDICTIONS_SUCCESS",
          payload: { [`${type}Predictions`]: res.data.data },
        });
      } catch (err) {
        const errorMessage = handleError(
          err,
          `Failed to fetch ${type} predictions`
        );
        dispatch({ type: "FETCH_ERROR", payload: errorMessage });
      }
    },
    [token, handleError]
  );

  const fetchAIAdvice = useCallback(
    async (profileData) => {
      if (!token) return;

      dispatch({ type: "FETCH_START", payload: "aiAdvice" });

      try {
        const res = await axios.post(`${API_URL}/api/ai/advice`, profileData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        });

        dispatch({ type: "FETCH_AI_ADVICE_SUCCESS", payload: res.data.data });
        return res.data;
      } catch (err) {

        const errorMessage = handleError(err, "Failed to get AI advice");
        dispatch({ type: "FETCH_ERROR", payload: errorMessage });
        throw err;
      }
    },
    [token, handleError]
  );

  const fetchGoalPlan = useCallback(
    async (profileData, advice) => {
      if (!token) return;

      dispatch({ type: "FETCH_START", payload: "goalPlan" });

      try {
        const res = await axios.post(
          `${API_URL}/api/ai/goals`,
          { profile: profileData, advice },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            withCredentials: true,
          }
        );

        dispatch({ type: "FETCH_GOAL_PLAN_SUCCESS", payload: res.data.data });
        return res.data;
      } catch (err) {

        const errorMessage = handleError(err, "Failed to generate goal plan");
        dispatch({ type: "FETCH_ERROR", payload: errorMessage });
        throw err;
      }
    },
    [token, handleError]
  );

  const resetDashboard = useCallback(() => {
    dispatch({ type: "RESET_STATE" });
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const contextValue = useMemo(
    () => ({
      ...state,
      actions: {
        fetchProfile,
        submitProfile,
        fetchMarketData,
        fetchPredictions,
        fetchAIAdvice,
        fetchGoalPlan,
        resetDashboard,
      },
    }),
    [
      state,
      fetchProfile,
      submitProfile,
      fetchMarketData,
      fetchPredictions,
      fetchAIAdvice,
      fetchGoalPlan,
      resetDashboard,
    ]
  );

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

DashboardProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DashboardProvider;
