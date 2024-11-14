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
import userRoutes from "./routes/userroutes.js";

// Resolving __dirname for ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
const MongoDBStore = connectMongoDBSession(session);
const JWT_SECRET = process.env.JWT_SECRET;

const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error(
    "MongoDB connection string (MONGO_URL) is not defined in the environment variables."
  );
  process.exit(1);
}

const store = new MongoDBStore({
  uri: MONGO_URL,
  collection: "sessions",
});

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("Database connection error:", error);
    process.exit(1);
  });

store.on("error", (error) => {
  console.error("MongoDB session store error:", error);
});

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/users", userRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Serve the client app
app.use(express.static(path.join(__dirname, "../client/build")));

// Render client for any path
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "../client/build/index.html"))
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
