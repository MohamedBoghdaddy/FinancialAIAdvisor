// 📦 Core Imports
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import session from "express-session";
import connectMongoDBSession from "connect-mongodb-session";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import loanRoutes from './routes/loanRoutes.js';
import expenseRoutes from "./routes/ExpenseRoutes.js";
import { env } from "./config/env.js";

// 🌍 Route Imports
import userRoutes from "./routes/userroutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import analyticsRoutes from "./routes/analyticRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import securityRoutes from "./routes/securityRoutes.js";
import voiceRoutes from "./routes/voiceRoutes.js";

// 📁 Path & Env Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔐 Configuration (validated centrally; exits process if misconfigured in production)
const { PORT, CLIENT_URL, FLASK_API_BASE_URL, JWT_SECRET, MONGO_URL } = env;

// 🍃 MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected.");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};
await connectDB();

// 🚀 Express App Init (⚠️ Must come BEFORE routes)
const app = express();

// 🧠 Session Store
const MongoDBStore = connectMongoDBSession(session);
const store = new MongoDBStore({
  uri: MONGO_URL,
  collection: "sessions",
});
store.on("error", (err) => console.error("❌ Session store error:", err));

// 🛡️ Security Middleware
app.use(helmet());
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

// 🔐 Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later",
});

// 📂 Uploads Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// 🛠️ General Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// 🧩 API Routes
app.use("/api/users", userRoutes);
app.use("/api/chat", apiLimiter, chatRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/currency", currencyRoutes); // ✅ moved after app initialization
app.use('/api/loan', loanRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/voice", voiceRoutes);
// 🔄 FastAPI Proxy Configuration
const forwardRequest = async (req, res, endpoint) => {
  try {
    const token = req.headers.authorization || req.cookies.token;
    const response = await axios({
      method: req.method,
      url: `${FLASK_API_BASE_URL}${endpoint}`,
      data: req.body,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      withCredentials: true,
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`❌ Proxy Error [${endpoint}]:`, error.message);
    res.status(error?.response?.status || 500).json({
      error: error?.response?.data?.error || "Internal Server Error",
    });
  }
};

// 🔄 Proxy Routes (forward to the FastAPI services app)
app.post("/api/chat", (req, res) => forwardRequest(req, res, "/chatbot/chat"));
app.post("/api/llm/generate", (req, res) => forwardRequest(req, res, "/api/llm/generate"));
app.post("/api/llm/financial-advice", (req, res) =>
  forwardRequest(req, res, "/api/llm/financial-advice")
);
app.post("/api/llm/intent", (req, res) => forwardRequest(req, res, "/api/llm/intent"));
app.post("/api/llm/scam-check", (req, res) => forwardRequest(req, res, "/api/llm/scam-check"));

// ⚛️ Serve React Frontend in Production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build/index.html"));
  });
}

// 🚫 404 Handler for unmatched API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errorCode: "NOT_FOUND",
  });
});

// 🚨 Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
    errorCode: err.code || "INTERNAL_ERROR",
  });
});

// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`
  🚀 Server is running!
  🔗 Local: http://localhost:${PORT}
  🌐 Client: ${CLIENT_URL}
  🧠 AI API: ${FLASK_API_BASE_URL}
  `);
});
