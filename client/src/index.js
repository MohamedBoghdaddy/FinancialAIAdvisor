import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { AuthProvider } from "./context/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import { ChatProvider } from "./context/ChatContext";

// Create a root container
const container = document.getElementById("root");
const root = createRoot(container);

// Render the App component
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ChatProvider>
        <App /> 
        </ChatProvider>
    </AuthProvider>
  </React.StrictMode>,
  document.getElementById("root")
);


reportWebVitals();
