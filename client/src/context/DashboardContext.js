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

// Initial state factory with improved structure
const createInitialState = () => ({
  profile: null,
  survey: null,
  analytics: { riskTolerance: [], lifestyle: [] },
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
        loading: { ...state.loading, [action.payload]: true },
        error: null,
      };
    case "FETCH_PROFILE_SUCCESS":
      return {
        ...state,
        profile: action.payload,
        lastUpdated: new Date().toISOString(),
        loading: { ...state.loading, profile: false },
      };
    case "FETCH_MARKET_DATA_SUCCESS":
      return {
        ...state,
        marketData: { ...state.marketData, ...action.payload },
        loading: { ...state.loading, marketData: false },
      };
    case "FETCH_MARKET_PREDICTIONS_SUCCESS":
      return {
        ...state,
        marketData: { ...state.marketData, ...action.payload },
        loading: { ...state.loading, predictions: false },
      };
    case "FETCH_AI_ADVICE_SUCCESS":
      return {
        ...state,
        aiAdvice: action.payload,
        loading: { ...state.loading, aiAdvice: false },
      };
    case "FETCH_GOAL_PLAN_SUCCESS":
      return {
        ...state,
        goalPlan: action.payload,
        loading: { ...state.loading, goalPlan: false },
      };
    case "UPDATE_PROFILE":
      return {
        ...state,
        profile: action.payload,
        lastUpdated: new Date().toISOString(),
        loading: { ...state.loading, profile: false },
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

const useAuthToken = () => {
  const [token, setToken] = useState(() => {
    const validateToken = (t) => t && t.split(".").length === 3;

    const localToken = localStorage.getItem("token");
    if (localToken && validateToken(localToken)) return localToken;

    const userString = localStorage.getItem("user");
    if (userString) {
      try {
        const user = JSON.parse(userString);
        if (user?.token && validateToken(user.token)) return user.token;
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const handler = () => {
      const newToken =
        localStorage.getItem("token") ||
        JSON.parse(localStorage.getItem("user") || "{}")?.token;
      setToken(newToken);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return token;
};

export const DashboardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const token = useAuthToken();

  const handleError = useCallback((error, defaultMessage) => {
    const message = error.response?.data?.message || defaultMessage;
    console.error("API Error:", {
      message: error.message,
      code: error.code,
      config: error.config,
      response: error.response?.data,
    });
    toast.error(`❌ ${message}`);
    return message;
  }, []);

  const fetchProfile = useCallback(() => {
    if (!token) {
      dispatch({ type: "FETCH_ERROR", payload: "Authentication required" });
      return Promise.resolve();
    }

    dispatch({ type: "FETCH_START", payload: "profile" });
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
          signal: controller.signal,
        });

        dispatch({ type: "FETCH_PROFILE_SUCCESS", payload: res.data.data });
      } catch (err) {
        if (axios.isCancel(err)) return;

        let errorMessage = "Failed to load profile";
        if (err.code === "ERR_NETWORK") {
          errorMessage = "Network error. Please check your connection.";
        } else if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          errorMessage = "Session expired. Please login again.";
        }
        dispatch({ type: "FETCH_ERROR", payload: errorMessage });
      }
    };

    fetchData();
    return () => controller.abort();
  }, [token]);

  const submitProfile = useCallback(
    async (profileData) => {
      if (!token) {
        toast.error("❌ Authentication required");
        window.location.href = "/login";
        return;
      }

      dispatch({ type: "FETCH_START", payload: "profile" });

      try {
        const res = await axios.post(`${API_URL}/api/profile`, profileData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });

        dispatch({ type: "UPDATE_PROFILE", payload: res.data.data });
        toast.success("✅ Profile saved successfully!");
        return res.data;
      } catch (err) {
        let errorMessage = "Profile submission failed";
        if (err.code === "ERR_NETWORK") {
          errorMessage = "Network error. Check your connection";
        } else if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          errorMessage = "Session expired. Please login again.";
          window.location.reload();
        } else if (err.response?.status === 400) {
          errorMessage = err.response.data.message || "Invalid data format";
        }

        toast.error(`❌ ${errorMessage}`);
        dispatch({ type: "FETCH_ERROR", payload: errorMessage });
        throw err;
      }
    },
    [token]
  );

  // Unified data fetcher for market endpoints
  const fetchMarketData = useCallback(
    async (type, options = {}) => {
      if (!token) return;

      dispatch({ type: "FETCH_START", payload: "marketData" });

      try {
        const endpoints = {
          stock: `/market/stock/historical?symbol=${
            options.symbol || "AAPL"
          }&period=${options.period || "1y"}`,
          gold: `/market/gold/history?period=${options.period || "1y"}`,
          realEstate: `/market/real-estate/history?period=${
            options.period || "1y"
          }`,
        };

        const res = await axios.get(`${API_URL}${endpoints[type]}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });

        dispatch({
          type: "FETCH_MARKET_DATA_SUCCESS",
          payload: { [`${type}History`]: res.data.data },
        });
      } catch (err) {
        handleError(err, `Failed to fetch ${type} data`);
        dispatch({
          type: "FETCH_ERROR",
          payload: `Failed to load ${type} data`,
        });
      }
    },
    [token, handleError]
  );

  // Unified prediction fetcher
  const fetchPredictions = useCallback(
    async (type, options = {}) => {
      if (!token) return;

      dispatch({ type: "FETCH_START", payload: "predictions" });

      try {
        const endpoints = {
          stock: `/market/stock/predict?symbol=${options.symbol || "AAPL"}`,
          gold: `/market/gold/predict?days=${options.days || 15}`,
          realEstate: `/market/real-estate/predict?days=${options.days || 15}`,
        };

        const res = await axios.get(`${API_URL}${endpoints[type]}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });

        dispatch({
          type: "FETCH_MARKET_PREDICTIONS_SUCCESS",
          payload: { [`${type}Predictions`]: res.data.data },
        });
      } catch (err) {
        handleError(err, `Failed to fetch ${type} predictions`);
        dispatch({
          type: "FETCH_ERROR",
          payload: `Failed to load ${type} predictions`,
        });
      }
    },
    [token, handleError]
  );

  // AI advice and goal plan handlers
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
          timeout: 20000,
        });

        dispatch({ type: "FETCH_AI_ADVICE_SUCCESS", payload: res.data.data });
        return res.data;
      } catch (err) {
        handleError(err, "Failed to get AI advice");
        dispatch({ type: "FETCH_ERROR", payload: "Failed to generate advice" });
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
            timeout: 20000,
          }
        );

        dispatch({ type: "FETCH_GOAL_PLAN_SUCCESS", payload: res.data.data });
        return res.data;
      } catch (err) {
        handleError(err, "Failed to generate goal plan");
        dispatch({ type: "FETCH_ERROR", payload: "Failed to create plan" });
        throw err;
      }
    },
    [token, handleError]
  );

  const resetDashboard = useCallback(() => {
    dispatch({ type: "RESET_STATE" });
  }, []);

  // Initial data loading
  useEffect(() => {
    console.log("Initializing dashboard with API:", API_URL);
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
