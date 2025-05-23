// 📁 context/DashboardContext.js
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
import Joi from "joi";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
const AI_API_URL = process.env.REACT_APP_AI_URL || "http://localhost:8000";
export const DashboardContext = createContext();


export const validateProfileSchema = (data) => {
  const { error, value } = profileSchema.validate(data, { abortEarly: false });
  return {
    isValid: !error,
    errors: error ? error.details.map((e) => e.message) : [],
    value,
  };
};

const profileSchema = Joi.object({
  age: Joi.number().min(18).max(120).required(),

  employmentStatus: Joi.string()
    .valid("Employed", "Self-employed", "Unemployed", "Student", "Retired")
    .required(),

  salary: Joi.number().min(0).required(),

  homeOwnership: Joi.string().valid("Own", "Rent", "Other").required(),

  hasDebt: Joi.string().valid("Yes", "No").required(),

  lifestyle: Joi.string().valid("Minimalist", "Balanced", "Spender").required(),

  riskTolerance: Joi.number().min(1).max(10).required(),

  investmentApproach: Joi.number().min(1).max(10).required(),

  emergencyPreparedness: Joi.number().min(1).max(10).required(),

  financialTracking: Joi.number().min(1).max(10).required(),

  futureSecurity: Joi.number().min(1).max(10).required(),

  spendingDiscipline: Joi.number().min(1).max(10).required(),

  assetAllocation: Joi.number().min(1).max(10).required(),

  riskTaking: Joi.number().min(1).max(10).required(),

  dependents: Joi.string().valid("Yes", "No").required(),

  financialGoals: Joi.string().max(1000).allow("").required(),

  customExpenses: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().required(),
        amount: Joi.number().min(0).required(),
      })
    )
    .optional(),
});

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
    case "UPDATE_PROFILE":
      return {
        ...state,
        profile: action.payload,
        lastUpdated: new Date().toISOString(),
        loading: { ...state.loading, profile: false },
      };

    case "FETCH_MARKET_DATA_SUCCESS":
      return {
        ...state,
        marketData: { ...state.marketData, ...action.payload.history },
        loading: { ...state.loading, marketData: false },
      };

    case "FETCH_MARKET_PREDICTIONS_SUCCESS":
      return {
        ...state,
        marketData: { ...state.marketData, ...action.payload.predictions },
        loading: { ...state.loading, predictions: false },
      };

    case "FETCH_AI_ADVICE_SUCCESS":
      return {
        ...state,
        aiAdvice: action.payload,
        loading: { ...state.loading, aiAdvice: false },
      };

    case "DELETE_PROFILE":
    case "RESET_STATE":
      return createInitialState();

    case "FETCH_ERROR":
      return {
        ...state,
        loading: Object.keys(state.loading).reduce(
          (acc, key) => ({ ...acc, [key]: false }),
          {}
        ),
        error: action.payload,
      };

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
    console.error("API Error:", error);
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
        const response = await axios.get(`${API_URL}/api/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const profileData = response.data?.data || response.data;

        // Only update state if backend data is newer
        if (
          profileData.updatedAt &&
          new Date(profileData.updatedAt) <= new Date(state.lastUpdated)
        ) {
          return;
        }

        dispatch({
          type: "FETCH_PROFILE_SUCCESS",
          payload: profileData,
        });
      } catch (err) {
        if (axios.isCancel(err)) return;

        handleError(
          err,
          err?.response?.data?.message || "Failed to load profile"
        );

        dispatch({
          type: "FETCH_ERROR",
          payload: err?.response?.data?.message || "Failed to load profile",
        });
      }
    };

    fetchData();
    return () => controller.abort();
  }, [token, handleError, state.lastUpdated]);

  const submitProfile = useCallback(
    async (profileData) => {
      if (!token) {
        toast.error("❌ Authentication required");
        return;
      }

      // Optional: Pre-submit client-side validation
      if (typeof validateProfileSchema === "function") {
        const isValid = validateProfileSchema(profileData);
        if (!isValid) {
          toast.error("❌ Invalid profile data format");
          return;
        }
      }

      dispatch({ type: "FETCH_START", payload: "profile" });

      try {
        const response = await axios.put(
          `${API_URL}/api/profile`,
          profileData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            timeout: 15000,
          }
        );

        const updatedProfile = response.data?.data || response.data;

        // Optional: Validate response structure
        if (typeof validateProfileSchema === "function") {
          const isValidResponse = validateProfileSchema(updatedProfile);
          if (!isValidResponse) {
            throw new Error("Invalid profile data received from server");
          }
        }

        dispatch({ type: "UPDATE_PROFILE", payload: updatedProfile });
        toast.success("✅ Profile updated successfully!");
        return updatedProfile;
      } catch (err) {
        handleError(err, "Profile update failed");
        throw err;
      }
    },
    [token, handleError]
  );

  const deleteProfile = useCallback(async () => {
    if (!token) {
      toast.error("❌ Authentication required");
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch({ type: "DELETE_PROFILE" });
      toast.success("✅ Profile deleted successfully");
    } catch (err) {
      handleError(err, "Failed to delete profile");
    }
  }, [token, handleError]);

  const requestPhi2Advice = useCallback(
    async (formData) => {
      dispatch({ type: "FETCH_START", payload: "aiAdvice" });

      try {
        const res = await axios.post(
          `${AI_API_URL}/api/phi2-advice`,
          formData,
          {
            headers: { "Content-Type": "application/json" },
            timeout: 30000,
          }
        );
        dispatch({ type: "FETCH_AI_ADVICE_SUCCESS", payload: res.data });
        return res.data;
      } catch (err) {
        handleError(err, "Failed to get AI insights");
        throw err;
      }
    },
    [handleError]
  );

  const fetchMarketData = useCallback(async () => {
    dispatch({ type: "FETCH_START", payload: "marketData" });

    try {
      const [historyRes, predictionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/market/history`),
        axios.get(`${AI_API_URL}/predict`),
      ]);

      dispatch({
        type: "FETCH_MARKET_DATA_SUCCESS",
        payload: {
          history: {
            stockHistory: historyRes.data.stocks,
            goldHistory: historyRes.data.gold,
            realEstateHistory: historyRes.data.real_estate,
          },
        },
      });

      dispatch({
        type: "FETCH_MARKET_PREDICTIONS_SUCCESS",
        payload: {
          predictions: {
            stockPredictions: predictionsRes.data.stocks,
            goldPredictions: predictionsRes.data.gold,
            realEstatePredictions: predictionsRes.data.real_estate,
          },
        },
      });
    } catch (err) {
      handleError(err, "Failed to fetch market data");
    }
  }, [handleError]);

  const contextValue = useMemo(
    () => ({
      ...state,
      actions: {
        fetchProfile,
        submitProfile,
        deleteProfile,
        requestPhi2Advice,
        fetchMarketData,
      },
    }),
    [
      state,
      fetchProfile,
      submitProfile,
      deleteProfile,
      requestPhi2Advice,
      fetchMarketData,
    ]
  );

  useEffect(() => {
    const initializeData = async () => {
      try {
        if (token) {
          await fetchProfile();
          await fetchMarketData();
        }
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };
    initializeData();
  }, [token, fetchProfile, fetchMarketData]);

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
