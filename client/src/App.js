import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./Frontend/components/LOGIN&REGISTRATION/Login/Login";
import Signup from "./Frontend/components/LOGIN&REGISTRATION/Signup/Signup";
import Home from "./Frontend/components/Home/home";
import NavBar from "./Frontend/components/Home/Navbar";
// import PaymentHistory from "./Frontend/components/Dashboard/PaymentHistory";
import Footer from "./Frontend/components/Home/Footer";
import MiniNavbar from "./Frontend/components/Home/Mininavbar";
import Chatbot from "./Frontend/components/chatbot/chatbot";
import Questionnaire from "./Frontend/components/Dashboard/Questionnaire";
import Dashboard from "./Frontend/components/Dashboard/Dashboard";
import Sidebar from "./Frontend/components/Dashboard/sidebar";
import AnalyticsReport from "./Frontend/components/Dashboard/analytics";
import Settings from "./Frontend/components/Dashboard/settings";
import Profile from "./Frontend/components/Dashboard/profile";
import AIChat from "./Frontend/components/chatbot/AIChat";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <NavBar />
              <Home />
              <Chatbot />
              <Footer />
            </>
          }
        />{" "}
        <Route
          path="/login"
          element={
            <>
              <MiniNavbar />
              <Login />
            </>
          }
        />
        <Route
          path="/Signup"
          element={
            <>
              <MiniNavbar />
              <Signup />
            </>
          }
        />
        {/* <Route
          path="/PaymentHistory"
          element={
            <>
              <MiniNavBar />
              <PaymentHistory />
              <Sidebar />
              <Footer />
            </> 
          }
        />*/}
        <Route
          path="/Questionnaire"
          element={
            <>
              <MiniNavbar />
              <Sidebar />
              <Questionnaire />
            </>
          }
        />
        <Route
          path="/Settings"
          element={
            <>
              <MiniNavbar />
              <Sidebar />
              <Settings />
              <Footer />
            </>
          }
        />
        <Route
          path="/profile"
          element={
            <>
              <MiniNavbar />
              <Sidebar />
              <Profile />
              <Footer />
            </>
          }
        />
        <Route
          path="/analytics"
          element={
            <>
              <MiniNavbar />
              <Sidebar />
              <AnalyticsReport />
              <Footer />
            </>
          }
        />
        <Route
          path="/AIChat"
          element={
            <>
              <MiniNavbar />
              <Sidebar />
              <AIChat />
              <Footer />
            </>
          }
        />
        <Route
          path="/Questionnaire"
          element={
            <>
              <MiniNavbar />
              <Sidebar />
              <Questionnaire />
              <Footer />
            </>
          }
        />
        <Route
          path="/Dashboard"
          element={
            <>
              <MiniNavbar />
              <Sidebar />
              <Dashboard />
              <Footer />
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
