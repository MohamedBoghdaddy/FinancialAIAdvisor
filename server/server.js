// ✅ Existing imports...
import express from "express";
import dotenv from "dotenv";
dotenv.config();
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

// ✅ New: Import LifeManagement routes
import lifeManagementRoutes from "./routes/lifemanagement.js";


// ✅ Other route imports
import userRoutes from "./routes/userroutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import questionnaireRoutes from "./routes/questionnaireRoutes.js";
import analyticsRoutes from "./routes/analyticRoutes.js";



// ✅ Resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const upload = multer({ dest: "uploads/" });
const MongoDBStore = connectMongoDBSession(session);

const PORT = process.env.PORT || 4000;
const MONGO_URL = "mongodb+srv://mohamedhammad3142:boghdaddy1234@cluster0.keg5o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const FLASK_API_BASE_URL = "http://127.0.0.1:5000";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const JWT_SECRET ='6dsb&c~HYAx3K787,5.K2lK*EA*h|9C-6Y,$.jiKS1s9lTE5^bPN$>+~';

if (!MONGO_URL) {
  console.error("❌ MongoDB connection string (MONGO_URL) is missing.");
  process.exit(1);
}

// ✅ Connect MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    setTimeout(connectDB, 5000);
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

// ✅ Middleware
app.use(
  cors({
    origin: [CLIENT_URL, FLASK_API_BASE_URL],
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Routes
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/questionnaire", questionnaireRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/lifemanagement", lifeManagementRoutes); // ✅ ADDED this line

// ✅ Proxy Routes for Flask
app.post("/api/chat", async (req, res) => {
  try {
    const response = await axios.post(`${FLASK_API_BASE_URL}/api/chat`, req.body, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error communicating with Flask API:", error.message);
    res.status(500).json({ error: "Failed to communicate with AI agent. Please try again." });
  }
});

app.post("/api/analyze_survey", async (req, res) => {
  try {
    const response = await axios.post(`${FLASK_API_BASE_URL}/api/user`, req.body, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error analyzing survey:", error.message);
    res.status(500).json({ error: "Failed to analyze survey data. Please try again." });
  }
});

app.post("/api/generate_plan", async (req, res) => {
  try {
    const response = await axios.post(`${FLASK_API_BASE_URL}/api/generate_plan`, req.body, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error generating plan:", error.message);
    res.status(500).json({ error: "Failed to generate financial plan. Please try again." });
  }
});

// ✅ Serve Frontend
app.use(express.static(path.join(__dirname, "../client/build")));
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "../client/build/index.html"))
);

// ✅ Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
