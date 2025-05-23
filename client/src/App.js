import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import LoanCalculator from './Frontend/components/Dashboard/LoanCalculator';

// Frontend Components
import Home from "./Frontend/components/Home/home";
import NavBar from "./Frontend/components/Home/Navbar";
import Footer from "./Frontend/components/Home/Footer";
import MiniNavbar from "./Frontend/components/Home/Mininavbar";

import Login from "./Frontend/components/LOGIN&REGISTRATION/Login/Login";
import Signup from "./Frontend/components/LOGIN&REGISTRATION/Signup/Signup";
import Dashboard from "./Frontend/components/Dashboard/pages/MainDashboard";

import Sidebar from "./Frontend/components/Dashboard/components/Sidebar.jsx";
import Settings from "./Frontend/components/Dashboard/pages/Settings.jsx";
import Profile from "./Frontend/components/Dashboard/pages/Profile.jsx";
import AnalyticsReport from "./Frontend/components/Dashboard/analytics";
import FinancialReportPage from "./Frontend/components/Dashboard/pages/FinancialReport";
import CurrencyConverter from "./Frontend/components/Dashboard/CurrencyConverter";
import AdminDashboard from "./Frontend/components/Dashboard/AdminDashboard";
import UserDetails from "./Frontend/components/Dashboard/UserDetails";

import Chatbot from "./Frontend/components/chatbot/chatbot";
import AIChat from "./Frontend/components/chatbot/AIChat";
import Contact from "./Frontend/components/Contact/contact";

import AdviceTabs from "./Frontend/components/Dashboard/tabs/Advice.jsx";
import InvestmentTabs from "./Frontend/components/Dashboard/tabs/Investments.jsx";
import OverviewTabs from "./Frontend/components/Dashboard/tabs/Overview.jsx";
import TransactionTabs from "./Frontend/components/Dashboard/tabs/Transactions.jsx";

import ProtectedRoute from "./Frontend/components/Auth/ProtectedRoute";
import AdminRoute from "./Frontend/components/Auth/AdminRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Home Page */}
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
          />

          {/* Auth Pages */}
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
            path="/signup"
            element={
              <>
                <MiniNavbar />
                <Signup />
              </>
            }
          />

          {/* Protected User Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <>
                  <MiniNavbar />
                  <Dashboard />
                  <Footer />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <>
                  <MiniNavbar />
                  <Sidebar />
                  <Settings />
                  <Footer />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <>
                  <MiniNavbar />
                  <Sidebar />
                  <Profile />
                  <Footer />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <>
                  <MiniNavbar />
                  <Sidebar />
                  <AnalyticsReport />
                  <Footer />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <>
                  <MiniNavbar />
                  <Sidebar />
                  <Contact />
                  <Footer />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/aichat"
            element={
              <ProtectedRoute>
                <>
                  <MiniNavbar />
                  <Sidebar />
                  <AIChat />
                  <Footer />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/Chatbot"
            element={
              <>
                <NavBar />
                <Sidebar />
                <Chatbot />
                <Footer />
              </>
            }
          />
          <Route
            path="/currency-converter"
            element={
              <ProtectedRoute>
                <>
                  <MiniNavbar />
                  <Sidebar />
                  <CurrencyConverter />
                  <Footer />
                </>
              </ProtectedRoute>
            }
          />
          <Route
  path="/loan"
  element={
    <ProtectedRoute>
      <>
        <MiniNavbar />
        <Sidebar />
        <LoanCalculator />
        <Footer />
      </>
    </ProtectedRoute>
  }
/>

          {/* Tabs Routes */}
          <Route
            path="/dashboard/advice"
            element={
              <ProtectedRoute>
                <>
                  <MiniNavbar />
                  <Sidebar />
                  <AdviceTabs />
                  <Footer />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/investments"
            element={
              <ProtectedRoute>
                <>
                  <MiniNavbar />
                  <Sidebar />
                  <InvestmentTabs />
                  <Footer />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/overview"
            element={
              <ProtectedRoute>
                <>
                  <MiniNavbar />
                  <Sidebar />
                  <OverviewTabs />
                  <Footer />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/transactions"
            element={
              <ProtectedRoute>
                <>
                  <MiniNavbar />
                  <Sidebar />
                  <TransactionTabs />
                  <Footer />
                </>
              </ProtectedRoute>
            }
          />

          {/* AI Report Page */}
          <Route path="/financial-report" element={<FinancialReportPage />} />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <AdminRoute>
                <UserDetails />
              </AdminRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
