import { useState, useEffect } from "react";
import { Button, Form, Table } from "react-bootstrap";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useDashboard from "../../../hooks/useDashboard";
import { useAuthContext } from "../../../context/AuthContext";
import "../styles/Settings.css";

const Settings = () => {
  const { user } = useAuthContext();
  const { state, fetchProfile, handleUpdateProfile, fetchDashboardData } =
    useDashboard();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    fetchDashboardData();
    if (user?._id) {
      fetchProfile();
    }
  }, [fetchDashboardData, fetchProfile, user]);

  useEffect(() => {
    if (state.profile) {
      setProfile({
        name: state.profile.name || "",
        email: state.profile.email || "",
        password: "",
      });
    }
  }, [state.profile]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmitProfileUpdate = async () => {
    try {
      await handleUpdateProfile(profile);
      toast.success("Profile updated successfully.");
    } catch (error) {
      toast.error("Error updating profile.");
      console.error("Error updating profile:", error);
    }
  };

  return (
    <div className="settings-container">
      <h2>Settings</h2>

      <h3>Profile Information</h3>
      <Form>
        <Form.Group controlId="name">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            name="name"
            value={profile.name}
            onChange={handleChange}
          />
        </Form.Group>

        <Form.Group controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            name="email"
            value={profile.email}
            onChange={handleChange}
          />
        </Form.Group>

        <Form.Group controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            name="password"
            value={profile.password}
            onChange={handleChange}
            placeholder="Enter new password (optional)"
          />
        </Form.Group>

        <Button
          variant="primary"
          onClick={handleSubmitProfileUpdate}
          className="mt-3"
        >
          Update Profile
        </Button>
      </Form>

      <h3>Investment Preferences</h3>
      {state.survey ? (
        <Table striped bordered hover>
          <tbody>
            <tr>
              <td>Risk Tolerance</td>
              <td>{state.survey.riskTolerance}</td>
            </tr>
            <tr>
              <td>Financial Goals</td>
              <td>{state.survey.financialGoals}</td>
            </tr>
            <tr>
              <td>Lifestyle</td>
              <td>{state.survey.lifestyle}</td>
            </tr>
          </tbody>
        </Table>
      ) : (
        <p>No investment preferences available.</p>
      )}
    </div>
  );
};

export default Settings;
