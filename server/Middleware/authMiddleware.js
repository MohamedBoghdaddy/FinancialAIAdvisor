// middleware/authMiddleware.js

import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secure_dev_token";

/**
 * ✅ Middleware: Authenticate user using JWT
 * - Supports "Authorization: Bearer <token>" OR cookie-based token
 */

export const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // 👈 this gives access to req.user._id, role, etc.
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * ✅ Role-based Middleware
 * Example: authorizeRoles("admin", "employee")
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(", ")}`,
      });
    }

    next();
  };
};

// Specific role variants
export const verifyAdmin = authorizeRoles("admin");
export const verifyAdminOrEmployee = authorizeRoles("admin", "employee");
