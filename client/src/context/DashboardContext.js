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

const API_URL =
  process.env.REACT_APP_API_URL ??
  (window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "https://hedj.onrender.com");

export const DashboardContext = createContext();

const initialState = {
  analytics: null,
  profile: null,
  loading: true,
  error: null,
};

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

export const DashboardProvider = ({ children }) => {
  const { state: authState } = useAuthContext();
  const { user, isAuthenticated } = authState;
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await axios.get(`${API_URL}/api/analytics/${user._id}`, {
        withCredentials: true,
      });

      dispatch({
        type: "FETCH_SUCCESS",
        payload: {
          analytics: response.data,
        },
      });
    } catch (error) {
      dispatch({
        type: "FETCH_ERROR",
        payload: error.response?.data?.message || "Failed to load analytics",
      });
      toast.error("Failed to fetch analytics data.");
    }
  }, [isAuthenticated, user]);

  const fetchProfile = useCallback(async () => {
    if (!user?._id) return;

    try {
      const response = await axios.get(`${API_URL}/api/users/${user._id}`, {
        withCredentials: true,
      });

      dispatch({ type: "UPDATE_PROFILE", payload: response.data });
    } catch (error) {
      toast.error("Failed to fetch profile.");
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
    fetchProfile();
  }, [fetchDashboardData, fetchProfile]);

  const contextValue = useMemo(
    () => ({
      state,
      fetchDashboardData,
      fetchProfile,
    }),
    [state, fetchDashboardData, fetchProfile]
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
