import { useState, useEffect } from "react";
import { BsPersonCircle, BsPencilSquare } from "react-icons/bs";
import useDashboard from "../../../hooks/useDashboard";
import { toast } from "react-toastify";
import "../styles/Profile.css";

const Profile = () => {
  const { state, fetchProfile, updateProfile } = useDashboard();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    income: "",
    financialGoals: "",
  });

  // Load profile data when the component mounts
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Set form data when profile is available
  useEffect(() => {
    if (state.profile) {
      setFormData({
        name: state.profile.name || "",
        email: state.profile.email || "",
        income: state.profile.income || "",
        financialGoals: state.profile.financialGoals || "",
      });
    }
  }, [state.profile]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      toast.success("Profile updated successfully.");
      setIsEditing(false);
    } catch (error) {
      toast.error("Error updating profile.");
      console.error("Error updating profile:", error);
    }
  };

  return (
    <div className="profile-container">
      <h2>My Financial Profile</h2>
      {state.profile ? (
        <div className="profile-card">
          <BsPersonCircle className="profile-icon" />
          {isEditing ? (
            <div className="profile-edit">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
              />
              <input
                type="number"
                name="income"
                value={formData.income}
                onChange={handleChange}
                placeholder="Enter your monthly income"
              />
              <textarea
                name="financialGoals"
                value={formData.financialGoals}
                onChange={handleChange}
                placeholder="Enter your financial goals (e.g., Save for retirement, Invest in stocks)"
              />
              <button onClick={handleSave}>Save</button>
            </div>
          ) : (
            <div className="profile-info">
              <h3>{state.profile.name}</h3>
              <p>Email: {state.profile.email}</p>
              <p>💰 Monthly Income: ${state.profile.income || "Not set"}</p>
              <p>
                🎯 Financial Goals: {state.profile.financialGoals || "Not set"}
              </p>
              <button onClick={handleEditToggle} className="edit-button">
                <BsPencilSquare /> Edit
              </button>
            </div>
          )}
        </div>
      ) : (
        <p>Loading profile...</p>
      )}
    </div>
  );
};

export default Profile;
