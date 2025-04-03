import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
import connectMongoDBSession from "connect-mongodb-session";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

import userRoutes from "./routes/userroutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import questionnaireRoutes from "./routes/questionnaireRoutes.js";
import analyticsRoutes from "./routes/analyticRoutes.js";

// ✅ Resolve __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
const MongoDBStore = connectMongoDBSession(session);

const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL;
const FLASK_API_BASE_URL = "http://127.0.0.1:5000"; // 🔗 Flask API URL
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URL) {
  console.error("❌ MongoDB connection string (MONGO_URL) is missing.");
  process.exit(1);
}

// ✅ MongoDB Connection with Retry
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    setTimeout(connectDB, 5000); // Retry in 5 seconds
  }
};
connectDB();

const store = new MongoDBStore({
  uri: MONGO_URL,
  collection: "sessions",
});

store.on("error", (error) =>
  console.error("❌ MongoDB session store error:", error)
);

// ✅ CORS Config (Frontend + Flask)
app.use(
  cors({
    origin: [CLIENT_URL, FLASK_API_BASE_URL],
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Routes
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/questionnaire", questionnaireRoutes);
app.use("/api/analytics", analyticsRoutes);

// ✅ Preflight Request Handler
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", CLIENT_URL);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

// ✅ Proxy AI Chat Requests to Flask
app.post("/api/chat", async (req, res) => {
  try {
    console.log("🔄 Forwarding chat request to Flask AI...");
    const response = await axios.post(
      `${FLASK_API_BASE_URL}/api/chat`,
      req.body,
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error communicating with Flask API:", error.message);
    res.status(500).json({
      error: "Failed to communicate with AI agent. Please try again.",
    });
  }
});

// ✅ Survey Analysis → Flask
app.post("/api/analyze_survey", async (req, res) => {
  try {
    console.log("🔄 Sending survey data to Flask AI...");
    const response = await axios.post(
      `${FLASK_API_BASE_URL}/api/user`,
      req.body,
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );
    console.log("✅ Flask AI response:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error analyzing survey:", error.message);
    res.status(500).json({
      error: "Failed to analyze survey data. Please try again.",
    });
  }
});

// ✅ Financial Plan Generation
app.post("/api/generate_plan", async (req, res) => {
  try {
    console.log("🔄 Requesting financial plan from Flask AI...");
    const response = await axios.post(
      `${FLASK_API_BASE_URL}/api/generate_plan`,
      req.body,
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );
    console.log("✅ Plan generated:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error generating plan:", error.message);
    res.status(500).json({
      error: "Failed to generate financial plan. Please try again.",
    });
  }
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res
    .status(500)
    .json({ error: "Something went wrong. Please try again later." });
});

// ✅ Serve Frontend (React Build)
app.use(express.static(path.join(__dirname, "../client/build")));
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "../client/build/index.html"))
);

// ✅ Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
