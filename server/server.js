// 📦 Core Imports
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import session from "express-session";
import connectMongoDBSession from "connect-mongodb-session";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

// 🧠 Optional: import helmet for security
// import helmet from "helmet";

// 🌍 Route Imports
import userRoutes from "./routes/userroutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import questionnaireRoutes from "./routes/questionnaireRoutes.js";
import analyticsRoutes from "./routes/analyticRoutes.js";
import lifeManagementRoutes from "./routes/lifemanagement.js";

// 📁 Path & Env Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

// 🔐 Configuration
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const FLASK_API_BASE_URL = "http://localhost:8000/phi-model";
const JWT_SECRET = process.env.JWT_SECRET || "secure_dev_token";
const MONGO_URL =
  process.env.MONGO_URL ||
  "mongodb+srv://your_user:your_pass@cluster.mongodb.net/db";

// 🚨 Verify Config
if (!MONGO_URL) {
  console.error("❌ MongoDB URI missing.");
  process.exit(1);
}

// 🍃 MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected.");
  } catch (error) {
    console.error("❌ MongoDB failed:", error);
    setTimeout(connectDB, 5000); // Retry logic
  }
};
connectDB();

// 🧠 Session Store
const MongoDBStore = connectMongoDBSession(session);
const store = new MongoDBStore({
  uri: MONGO_URL,
  collection: "sessions",
});
store.on("error", (err) => console.error("❌ Session store error:", err));

// 🚀 Express App Init
const app = express();

// 🛡️ Middleware
// app.use(helmet()); // Optional
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 🌐 CORS: Allow both frontend and FastAPI
app.use(
  cors({
    origin: [
      CLIENT_URL,
      FLASK_API_BASE_URL,
      "http://localhost:8000",
      "http://127.0.0.1:8000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// 📂 Uploads
const upload = multer({ dest: "uploads/" });

// 🧩 API Routes
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes); // Web chat or logs, not AI proxy
app.use("/api/questionnaire", questionnaireRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/lifemanagement", lifeManagementRoutes);

// ✅ Unified FastAPI proxy with Authorization support
const forwardPost = async (req, res, endpoint) => {
  try {
    const token = req.headers.authorization || req.cookies.token;
    const response = await axios.post(
      `${FLASK_API_BASE_URL}${endpoint}`,
      req.body,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: token }),
        },
        withCredentials: true,
      }
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      `❌ Proxy Error [${endpoint}]:`,
      error?.response?.data || error.message
    );
    res.status(error?.response?.status || 500).json({
      error: error?.response?.data || "Unexpected error from FastAPI.",
    });
  }
};

// ✅ Routes mapped to FastAPI
app.post("/api/chat", (req, res) => forwardPost(req, res, "/phi-model/chat"));
app.post("/api/infer", (req, res) => forwardPost(req, res, "/phi-model/infer"));
app.post("/api/analyze_survey", (req, res) =>
  forwardPost(req, res, "/api/user")
);
app.post("/api/generate_plan", (req, res) =>
  forwardPost(req, res, "/api/generate_plan")
);

// ⚛️ Serve React Frontend
app.use(express.static(path.join(__dirname, "../client/build")));
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "../client/build/index.html"))
);

// 🚀 Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
);
