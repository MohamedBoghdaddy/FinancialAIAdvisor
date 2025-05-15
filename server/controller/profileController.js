// controllers/profileController.js
import { body, validationResult } from "express-validator";
import Profile from "../models/ProfileModel.js";
import User from "../models/UserModel.js";

// Validation rules that can be reused
export const profileValidationRules = [
  body("age")
    .optional()
    .isInt({ min: 18, max: 120 })
    .withMessage("Age must be between 18 and 120"),
  body("employmentStatus")
    .optional()
    .isIn(["Employed", "Self-employed", "Unemployed", "Student", "Retired"]),
  body("salary").optional().isNumeric(),
  body("financialGoals").optional().isString().trim().escape(),
];

/**
 * Get latest user profile
 */
export const getLatestProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean(); // Convert to plain JS object

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("[Profile Controller] Get error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Create or update profile with validation
 */
export const createOrUpdateProfile = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { _id: userId } = req.user;
    const updateData = req.body;

    // Add audit fields
    updateData.lastUpdated = new Date();
    updateData.updatedBy = userId;

    const options = {
      new: true,
      upsert: true,
      runValidators: true,
    };

    const profile = await Profile.findOneAndUpdate(
      { userId },
      updateData,
      options
    );

    res.status(200).json({
      success: true,
      message: profile.isNew ? "Profile created" : "Profile updated",
      data: profile,
    });
  } catch (error) {
    console.error("[Profile Controller] Save error:", error);

    // Handle different error types
    let status = 500;
    let message = "Internal server error";

    if (error.name === "ValidationError") {
      status = 400;
      message = "Validation failed";
    } else if (error.code === 11000) {
      status = 409;
      message = "Duplicate key error";
    }

    res.status(status).json({
      success: false,
      message,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete profile
 */
export const deleteProfile = async (req, res) => {
  try {
    const { deletedCount } = await Profile.deleteOne({ userId: req.user._id });

    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    console.error("[Profile Controller] Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Add this to your profileController.js
/**
 * Get all profiles (admin only)
 */
export const getAllProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find().lean();
    res.status(200).json({
      success: true,
      data: profiles,
    });
  } catch (error) {
    console.error("[Profile Controller] Get all error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



// Add this to profileController.js
/**
 * Get profile by ID (admin or user's own profile)
 */
export const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await Profile.findOne({ 
      _id: id,
      // Optional: Restrict to user's own profile unless admin
      ...(req.user.role !== 'admin' ? { userId: req.user._id } : {})
    }).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("[Profile Controller] Get by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};