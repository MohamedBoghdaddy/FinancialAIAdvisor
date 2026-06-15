// Centralized API base URLs for the Express server and the FastAPI
// (FinGenie) services app. Override via .env (REACT_APP_API_URL /
// REACT_APP_FASTAPI_URL) for staging/production deployments.
const isLocalhost = window.location.hostname === "localhost";

export const NODE_API_URL =
  process.env.REACT_APP_API_URL ||
  (isLocalhost
    ? "http://localhost:4000"
    : "https://financial-ai-backend-kr2s.onrender.com");

export const FASTAPI_URL =
  process.env.REACT_APP_FASTAPI_URL ||
  (isLocalhost ? "http://localhost:8000" : "https://fingenie-agent.onrender.com");
