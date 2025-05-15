// 📁 routes/profileRoutes.js
import express from "express";
import {
  getLatestProfile,
  createOrUpdateProfile,
  deleteProfile,
  getProfileById,
  getAllProfiles,
} from "../controller/profileController.js";
import { auth, authorizeRoles } from "../middleware/authMiddleware.js";
import { profileValidationRules } from "../validators/profileValidator.js";
import rateLimit from "express-rate-limit";

// Create rate limiter
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many profile requests from this IP, please try again later",
});

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

// @desc    Get current user's profile
// @route   GET /api/profile/me
// @access  Private
router.get("/me", profileLimiter, getLatestProfile);

// @desc    Create or update profile
// @route   POST /api/profile
// @access  Private
router.post("/", profileLimiter, profileValidationRules, createOrUpdateProfile);

// @desc    Delete profile
// @route   DELETE /api/profile
// @access  Private
router.delete("/", profileLimiter, deleteProfile);

// @desc    Get profile by ID (Admin only)
// @route   GET /api/profile/:id
// @access  Private/Admin
router.get("/:id", profileLimiter, authorizeRoles("admin"), getProfileById);

// @desc    Get all profiles (Admin only)
// @route   GET /api/profile
// @access  Private/Admin
router.get("/", profileLimiter, authorizeRoles("admin"), getAllProfiles);

export default router;
