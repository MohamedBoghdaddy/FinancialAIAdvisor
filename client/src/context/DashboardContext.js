import {
  createContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export const DashboardContext = createContext();

const initialState = {
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
  loading: true,
  error: null,
  aiAdvice: null,
  goalPlan: null,
  lastUpdated: null,
};

const dashboardReducer = (state, action) => {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_PROFILE_SUCCESS":
      return {
        ...state,
        profile: action.payload,
        lastUpdated: new Date().toISOString(),
        loading: false,
      };
    case "FETCH_MARKET_DATA_SUCCESS":
      return {
        ...state,
        marketData: {
          ...state.marketData,
          ...action.payload,
        },
        loading: false,
      };
    case "FETCH_AI_ADVICE_SUCCESS":
      return {
        ...state,
        aiAdvice: action.payload,
        loading: false,
      };
    case "FETCH_GOAL_PLAN_SUCCESS":
      return {
        ...state,
        goalPlan: action.payload,
        loading: false,
      };
    case "UPDATE_PROFILE":
      return {
        ...state,
        profile: action.payload,
        lastUpdated: new Date().toISOString(),
      };
    case "FETCH_ERROR":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case "RESET_STATE":
      return initialState;
    default:
      return state;
  }
};

export const DashboardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  const getAuthToken = useCallback(() => {
    return localStorage.getItem("token");
  }, []);

  const handleError = useCallback((error, defaultMessage) => {
    const message = error.response?.data?.message || defaultMessage;
    toast.error(`❌ ${message}`);
    console.error("Error:", error);
    return message;
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      dispatch({
        type: "FETCH_ERROR",
        payload: "No authentication token found",
      });
      return;
    }

    dispatch({ type: "FETCH_START" });
    try {
      const res = await axios.get(`${API_URL}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch({ type: "FETCH_PROFILE_SUCCESS", payload: res.data.data });
    } catch (err) {
      const errorMessage = handleError(err, "Failed to fetch profile");
      dispatch({ type: "FETCH_ERROR", payload: errorMessage });
    }
  }, [getAuthToken, handleError]);

  const submitProfile = useCallback(
    async (profileData) => {
      const token = getAuthToken();
      if (!token) {
        toast.error("❌ User not authenticated.");
        return;
      }

      dispatch({ type: "FETCH_START" });
      try {
        const res = await axios.post(`${API_URL}/api/profile`, profileData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        dispatch({ type: "UPDATE_PROFILE", payload: res.data.data });
        toast.success("✅ Profile saved successfully!");
        return res.data;
      } catch (err) {
        const errorMessage = handleError(err, "Profile submission failed");
        dispatch({ type: "FETCH_ERROR", payload: errorMessage });
        throw err;
      }
    },
    [getAuthToken, handleError]
  );

  const fetchMarketData = useCallback(
    async (type, options = {}) => {
      const token = getAuthToken();
      if (!token) return;

      dispatch({ type: "FETCH_START" });
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
    [getAuthToken, handleError]
  );

  const fetchPredictions = useCallback(
    async (type, options = {}) => {
      const token = getAuthToken();
      if (!token) return;

      dispatch({ type: "FETCH_START" });
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
        });

        dispatch({
          type: "FETCH_MARKET_DATA_SUCCESS",
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
    [getAuthToken, handleError]
  );

  const fetchAIAdvice = useCallback(
    async (profileData) => {
      const token = getAuthToken();
      if (!token) return;

      dispatch({ type: "FETCH_START" });
      try {
        const res = await axios.post(`${API_URL}/api/ai/advice`, profileData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        dispatch({ type: "FETCH_AI_ADVICE_SUCCESS", payload: res.data.data });
        return res.data;
      } catch (err) {
        const errorMessage = handleError(err, "Failed to get AI advice");
        dispatch({ type: "FETCH_ERROR", payload: errorMessage });
        throw err;
      }
    },
    [getAuthToken, handleError]
  );

  const fetchGoalPlan = useCallback(
    async (profileData, advice) => {
      const token = getAuthToken();
      if (!token) return;

      dispatch({ type: "FETCH_START" });
      try {
        const res = await axios.post(
          `${API_URL}/api/ai/goals`,
          {
            profile: profileData,
            advice,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
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
    [getAuthToken, handleError]
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
