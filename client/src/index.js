import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { AuthProvider } from "./context/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import { ChatProvider } from "./context/ChatContext";
import DashboardProvider from "./context/DashboardContext";

// Create a root container
const container = document.getElementById("root");
const root = createRoot(container);

// Render the App component
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ChatProvider>
        <DashboardProvider>
          <App />
        </DashboardProvider>
      </ChatProvider>
    </AuthProvider>
  </React.StrictMode>,
  document.getElementById("root")
);


reportWebVitals();
