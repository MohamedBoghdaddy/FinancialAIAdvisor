import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

const JWT_SECRET = process.env.JWT_SECRET;

// **Authentication Middleware**

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ✅ Ensure token is provided in the correct format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Authorization denied, no token provided." });
    }

    // ✅ Extract token from the header
    const token = authHeader.split(" ")[1];

    // ✅ Debugging: Log token before verification
    console.log("Received Token:", token);

    if (!token) {
      return res.status(401).json({ message: "Unauthorized, token missing." });
    }

    // ✅ Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Fetch user from the database and attach to request
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(404).json({ message: "User not found." });
    }

    next(); // ✅ Proceed to the next middleware
  } catch (error) {
    console.error("Token verification failed:", error.message);

    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Session expired, please log in again." });
    }

    return res
      .status(401)
      .json({ message: "Unauthorized, invalid or expired token." });
  }
};



// **Role-Based Authorization Middleware**
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied: Role '${
          req.user?.role || "Unknown"
        }' is not authorized.`,
      });
    }
    next();
  };
};
