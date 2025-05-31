import React, { useEffect, useState, useContext } from "react";
import { DashboardContext } from "../../../../context/DashboardContext";
import { BsPersonCircle } from "react-icons/bs";
import "../../styles/viewprofile.css";
import { toast } from "react-toastify";
const ProfileCardPage = () => {
  const dashboardContext = useContext(DashboardContext);
  const dashState = dashboardContext || {};
  const fetchProfile = dashboardContext?.actions?.fetchProfile;
  const profileLoading = dashboardContext?.loading?.profile || false;

  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (fetchProfile) {
          await fetchProfile();
        } else {
          toast.error("Profile fetch function is missing");
        }
      } catch (err) {
        toast.error(err.message || "Error loading profile.");
      } finally {
        setLocalLoading(false);
      }
    };
    load();
  }, [fetchProfile]);

  const profileData = dashState.profile;

  console.log("💾 Loaded profile data:", profileData);

  if (localLoading || profileLoading) {
    return (
      <div className="profile-container">
        <div className="loader-container">
          <div className="loader"></div>
          <p>Loading profile card...</p>
        </div>
      </div>
    );
  }

  if (!profileData || Object.keys(profileData).length === 0) {
    return (
      <div className="profile-container">
        <p>No profile data available. Please complete your survey first.</p>
      </div>
    );
  }

  // Only display fields that came from the survey
  const displayableKeys = [
    "age",
    "employmentStatus",
    "salary",
    "homeOwnership",
    "hasDebt",
    "lifestyle",
    "riskTolerance",
    "investmentApproach",
    "emergencyPreparedness",
    "financialTracking",
    "futureSecurity",
    "spendingDiscipline",
    "assetAllocation",
    "riskTaking",
    "dependents",
    "financialGoals",
    "customExpenses",
    "totalMonthlyExpenses"
  ];

  return (
    <div className="profile-container">
      <h2>👤 User Profile Overview</h2>
      <div className="profile-card">
        <BsPersonCircle className="profile-icon" />
        <div className="profile-summary">
          {Object.entries(profileData)
            .filter(([key]) => displayableKeys.includes(key))
            .map(([key, value]) => (
              <div key={key} className="profile-item">
                <strong>{formatKey(key)}:</strong>{" "}
                {Array.isArray(value)
                  ? value.length > 0
                    ? JSON.stringify(value)
                    : "None"
                  : typeof value === "object" && value !== null
                  ? JSON.stringify(value)
                  : String(value)}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const formatKey = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/_/g, " ");

export default ProfileCardPage;
