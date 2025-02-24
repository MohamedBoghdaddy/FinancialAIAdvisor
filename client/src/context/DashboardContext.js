import {
  createContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import { useAuthContext } from "./AuthContext";
import { toast } from "react-toastify";
import axios from "axios";

// 🔹 API Base URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

// 🔹 Create Context
export const DashboardContext = createContext();

// 🔹 Initial State
const initialState = {
  analytics: {
    riskTolerance: [],
    lifestyle: [],
  },
  profile: null,
  survey: null,
  loading: true,
  error: null,
};

// 🔹 Reducer Function
const dashboardReducer = (state, action) => {
  switch (action.type) {
    case "FETCH_SUCCESS":
      return { ...state, ...action.payload, loading: false, error: null };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "UPDATE_PROFILE":
      return { ...state, profile: action.payload };
    default:
      return state;
  }
};

// 🔹 Dashboard Provider
export const DashboardProvider = ({ children }) => {
  const { state: authState } = useAuthContext();
  const { user, isAuthenticated } = authState;
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // ✅ Fetch User Profile
  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated || !user?._id) return;

    try {
      const response = await axios.get(`${API_URL}/api/users/${user._id}`, {
        withCredentials: true,
      });

      dispatch({
        type: "FETCH_SUCCESS",
        payload: { profile: response.data },
      });
    } catch (error) {
      dispatch({
        type: "FETCH_ERROR",
        payload: error.response?.data?.message || "Failed to fetch profile",
      });
      toast.error("⚠️ Failed to fetch profile.");
    }
  }, [isAuthenticated, user]);

  // ✅ Fetch Analytics Data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      const [riskRes, lifestyleRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/risk-tolerance`),
        axios.get(`${API_URL}/api/analytics/lifestyle`),
      ]);

      dispatch({
        type: "FETCH_SUCCESS",
        payload: {
          analytics: {
            riskTolerance: riskRes.data || [],
            lifestyle: lifestyleRes.data || [],
          },
        },
      });
    } catch (error) {
      dispatch({
        type: "FETCH_ERROR",
        payload: error.response?.data?.message || "Failed to fetch analytics",
      });
      toast.error("⚠️ Failed to fetch analytics data.");
    }
  }, []);

  // ✅ Fetch Survey Data
  const fetchSurveyData = useCallback(async () => {
    if (!isAuthenticated || !user?._id) return;

    try {
      const response = await axios.get(`${API_URL}/api/survey/${user._id}`, {
        withCredentials: true,
      });

      dispatch({
        type: "FETCH_SUCCESS",
        payload: { survey: response.data },
      });
    } catch (error) {
      dispatch({
        type: "FETCH_ERROR",
        payload: error.response?.data?.message || "Failed to fetch survey data",
      });
      toast.error("⚠️ Failed to fetch survey data.");
    }
  }, [isAuthenticated, user]);

  // ✅ Fetch All Dashboard Data (Profile, Survey, Analytics)
  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated || !user?._id) return;

    try {
      const [profileRes, surveyRes, riskRes, lifestyleRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/${user._id}`, {
          withCredentials: true,
        }),
        axios.get(`${API_URL}/api/survey/${user._id}`, {
          withCredentials: true,
        }),
        axios.get(`${API_URL}/api/analytics/risk-tolerance`),
        axios.get(`${API_URL}/api/analytics/lifestyle`),
      ]);

      dispatch({
        type: "FETCH_SUCCESS",
        payload: {
          profile: profileRes.data,
          survey: surveyRes.data,
          analytics: {
            riskTolerance: riskRes.data || [],
            lifestyle: lifestyleRes.data || [],
          },
        },
      });
    } catch (error) {
      dispatch({
        type: "FETCH_ERROR",
        payload:
          error.response?.data?.message || "Failed to load dashboard data",
      });
      toast.error("⚠️ Failed to fetch dashboard data.");
    }
  }, [isAuthenticated, user]);

  // ✅ Update Profile
  const handleUpdateProfile = useCallback(
    async (profileData) => {
      try {
        const response = await axios.put(
          `${API_URL}/api/users/${user._id}`,
          profileData,
          {
            withCredentials: true,
          }
        );

        dispatch({ type: "UPDATE_PROFILE", payload: response.data });
        toast.success("✅ Profile updated successfully.");
      } catch (error) {
        toast.error("⚠️ Failed to update profile.");
      }
    },
    [user]
  );

  // ✅ Auto-fetch Data on Component Mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ✅ Memoized Context Value
  const contextValue = useMemo(
    () => ({
      state,
      fetchDashboardData,
      fetchAnalyticsData,
      fetchProfile,
      fetchSurveyData,
      handleUpdateProfile,
    }),
    [
      state,
      fetchDashboardData,
      fetchAnalyticsData,
      fetchProfile,
      fetchSurveyData,
      handleUpdateProfile,
    ]
  );

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

// 🔹 Prop Types Validation
DashboardProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DashboardProvider;
