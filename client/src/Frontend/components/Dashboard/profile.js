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
    age: "",
    occupation: "",
  });

  // Fetch profile data on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Sync state.profile to form
  useEffect(() => {
    if (state.profile) {
      setFormData({
        name: state.profile.name || "",
        email: state.profile.email || "",
        income: state.profile.income || "",
        financialGoals: state.profile.financialGoals || "",
        age: state.profile.age || "",
        occupation: state.profile.occupation || "",
      });
    }
  }, [state.profile]);

  const handleEditToggle = () => setIsEditing(!isEditing);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      toast.success("Profile updated successfully.");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.");
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
                placeholder="Monthly income"
              />
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Your age"
              />
              <input
                type="text"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                placeholder="Your occupation"
              />
              <textarea
                name="financialGoals"
                value={formData.financialGoals}
                onChange={handleChange}
                placeholder="E.g. Save for retirement, invest in stocks..."
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
              <p>🎂 Age: {state.profile.age || "Not set"}</p>
              <p>👨‍💼 Occupation: {state.profile.occupation || "Not set"}</p>
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
