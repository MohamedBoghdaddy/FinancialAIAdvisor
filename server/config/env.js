// 🔐 Centralized environment configuration & validation
import dotenv from "dotenv";

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

// Required in all environments. In production, missing values cause startup to fail.
const REQUIRED_VARS = ["JWT_SECRET", "MONGO_URL"];

// Development-only fallback so local setup doesn't require a .env immediately.
// NEVER used in production.
const DEV_FALLBACKS = {
  JWT_SECRET: "dev_only_insecure_jwt_secret_change_me",
  MONGO_URL: "mongodb://localhost:27017/fingenie",
};

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  if (isProduction) {
    console.error(
      `❌ Missing required environment variable(s): ${missing.join(", ")}. Refusing to start in production.`
    );
    process.exit(1);
  } else {
    console.warn(
      `⚠️  Missing environment variable(s): ${missing.join(
        ", "
      )}. Using insecure development fallbacks. Do NOT use these in production.`
    );
  }
}

export const env = {
  NODE_ENV,
  isProduction,
  PORT: process.env.PORT || 4000,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  FLASK_API_BASE_URL: process.env.FLASK_API_URL || "http://localhost:8000",
  JWT_SECRET: process.env.JWT_SECRET || (!isProduction ? DEV_FALLBACKS.JWT_SECRET : undefined),
  MONGO_URL: process.env.MONGO_URL || (!isProduction ? DEV_FALLBACKS.MONGO_URL : undefined),
};

export default env;
