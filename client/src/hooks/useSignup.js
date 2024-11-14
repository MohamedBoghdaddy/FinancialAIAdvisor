import { useState } from "react";
import { useAuthContext } from "../context/AuthContext"; // Adjust path if necessary
import axios from "axios";

export const useSignup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [gender, setGender] = useState("");
  const [nid, setNid] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [income, setIncome] = useState(""); // New state for Monthly Income
  const [financialGoals, setFinancialGoals] = useState(""); // New state for Financial Goals
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { dispatch } = useAuthContext();

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    // Check for password match
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:4000/api/users/signup",
        {
          username,
          email,
          password,
          gender,
          nid,
          firstName,
          middleName,
          lastName,
          income, // Include Monthly Income in request
          financialGoals, // Include Financial Goals in request
        },
        { withCredentials: true }
      );

      const { user } = response.data; // Destructure user from response

      dispatch({ type: "REGISTRATION_SUCCESS", payload: user });

      setSuccessMessage("Registration successful");
    } catch (error) {
      console.error("Signup error:", error);
      setErrorMessage(error.response?.data?.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    gender,
    setGender,
    nid,
    setNid,
    firstName,
    setFirstName,
    middleName,
    setMiddleName,
    lastName,
    setLastName,
    income, // Return Monthly Income state
    setIncome, // Return setter for Monthly Income
    financialGoals, // Return Financial Goals state
    setFinancialGoals, // Return setter for Financial Goals
    errorMessage,
    successMessage,
    isLoading,
    handleSignup,
  };
};