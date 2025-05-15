import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import dotenv from "dotenv";
import { promisify } from "util";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secure_dev_token";

/**
 * ✅ Enhanced Authentication Middleware
 * - Fixed the changedPasswordAfter error
 * - Added token verification promisify
 * - Better error handling
 * - Supports multiple token sources
 */
export const auth = async (req, res, next) => {
  try {
    // Check for token in multiple locations
    let token;
    const tokenSources = [
      () =>
        req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.split(" ")[1]
          : null,
      () => req.cookies?.token,
      () => req.headers["x-auth-token"],
    ];

    for (const source of tokenSources) {
      token = source();
      if (token) break;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided",
        hint: "Include 'Authorization: Bearer <token>' header or 'token' cookie",
      });
    }

    // Verify token with promisify
    const verify = promisify(jwt.verify);
    const decoded = await verify(token, JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id).select(
      "+passwordChangedAt"
    );
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "The user belonging to this token no longer exists",
      });
    }

    // Fixed: Check if method exists before calling
    if (
      currentUser.changedPasswordAfter &&
      typeof currentUser.changedPasswordAfter === "function"
    ) {
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({
          success: false,
          message: "User recently changed password. Please log in again.",
        });
      }
    }

    // Grant access
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (err) {
    console.error("🔒 Authentication Error:", err.message);

    // Enhanced error handling
    const errorResponse = {
      success: false,
      message: "Authentication failed",
    };

    if (err.name === "JsonWebTokenError") {
      errorResponse.message = "Invalid token. Please log in again.";
    } else if (err.name === "TokenExpiredError") {
      errorResponse.message = "Your token has expired. Please log in again.";
      errorResponse.code = "TOKEN_EXPIRED";
    }

    res.status(401).json(errorResponse);
  }
};

/**
 * ✅ Role-Based Authorization Middleware
 * - Fixed potential undefined user errors
 * - Better logging
 */
export const authorizeRoles = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        console.warn("Role check failed - No user in request");
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      // Check if user has any of the required roles
      if (!roles.includes(req.user.role)) {
        console.warn(
          `Unauthorized access attempt by ${req.user._id} (${req.user.role})`
        );
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${roles.join(", ")}`,
          yourRole: req.user.role,
        });
      }

      next();
    } catch (err) {
      console.error("Role Authorization Error:", err);
      res.status(500).json({
        success: false,
        message: "Role verification failed",
        error: err.message,
      });
    }
  };
};

// Pre-configured role checkers
export const verifyAdmin = authorizeRoles("admin");
export const verifyAdminOrModerator = authorizeRoles("admin", "moderator");

/**
 * ✅ Security Headers Check
 * - Fixed header case sensitivity
 */
export const checkSecurityHeaders = (req, res, next) => {
  const requiredHeaders = [
    "x-content-type-options",
    "x-frame-options",
    "content-security-policy",
  ];

  const missingHeaders = requiredHeaders.filter(
    (header) => !req.headers[header]
  );

  if (missingHeaders.length > 0) {
    console.warn("Missing security headers:", missingHeaders);
    return res.status(400).json({
      success: false,
      message: "Missing required security headers",
      missingHeaders: missingHeaders.map((h) => h.toUpperCase()),
    });
  }

  next();
};

/**
 * NEW: Token Refresh Verification
 */
export const verifyRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token provided",
      });
    }

    const decoded = await promisify(jwt.verify)(refreshToken, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
      error: err.message,
    });
  }
};
