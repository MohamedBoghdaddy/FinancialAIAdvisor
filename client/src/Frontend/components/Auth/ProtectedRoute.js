import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../../../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { state } = useAuthContext();
  const { isAuthenticated, loading } = state;
  const location = useLocation();

  // Show loading state while the session is being verified with the backend
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
