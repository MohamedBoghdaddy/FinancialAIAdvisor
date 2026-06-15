import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../../../context/AuthContext";

// Admin access is determined ONLY by the role returned from the backend
// (via AuthContext/checkAuth), never from client-editable localStorage values.
const AdminRoute = ({ children }) => {
  const { state, isAdmin } = useAuthContext();
  const { isAuthenticated, loading } = state;
  const location = useLocation();

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

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
