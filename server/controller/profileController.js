import { body, validationResult } from "express-validator";
import Profile from "../models/ProfileModel.js";
import User from "../models/UserModel.js";

// Enhanced validation rules
export const profileValidationRules = [
  body("age")
    .optional()
    .isInt({ min: 18, max: 120 })
    .withMessage("Age must be between 18 and 120"),
  body("employmentStatus")
    .optional()
    .isIn(["Employed", "Self-employed", "Unemployed", "Student", "Retired"])
    .withMessage("Invalid employment status"),
  body("salary").optional().isNumeric().withMessage("Salary must be a number"),
  body("financialGoals")
    .optional()
    .isString()
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage("Financial goals cannot exceed 500 characters"),
  body("customExpenses.*.name")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Expense name cannot exceed 50 characters"),
  body("customExpenses.*.amount")
    .optional()
    .isNumeric()
    .withMessage("Expense amount must be a number")
    .custom((value) => value >= 0)
    .withMessage("Expense amount cannot be negative"),
];

/**
 * Get latest user profile with custom expenses and debugging
 */
export const getLatestProfile = async (req, res) => {
  console.log('Received headers:', req.headers); // Debug log
  console.log('Authenticated user:', req.user); // Debug log

  try {
    const profile = await Profile.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean()
      .select('+totalMonthlyExpenses'); // Include virtual field

    console.log('Found profile:', profile); // Debug log

    if (!profile) {
      console.log('No profile found for user:', req.user._id);
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    // Calculate total expenses (both as virtual field and manual calculation)
    profile.totalMonthlyExpenses = profile.customExpenses?.reduce(
      (total, expense) => total + (expense.amount || 0), 
      0
    ) || 0;

    console.log('Profile with expenses calculated:', { 
      totalMonthlyExpenses: profile.totalMonthlyExpenses,
      customExpensesCount: profile.customExpenses?.length || 0
    }); // Debug log

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Profile fetch error:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id
    });

    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message 
      })
    });
  }
};
/**
 * Enhanced create/update profile with custom expenses handling
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
    let updateData = req.body;

    // Process custom expenses
    if (updateData.customExpenses) {
      updateData.customExpenses = updateData.customExpenses
        .map((expense) => ({
          name: expense.name.trim(),
          amount: Number(expense.amount),
        }))
        .filter((expense) => expense.name && !isNaN(expense.amount));
    }

    // Add audit fields
    updateData.lastUpdated = new Date();
    updateData.updatedBy = userId;

    const options = {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    };

    const profile = await Profile.findOneAndUpdate(
      { userId },
      updateData,
      options
    );

    // Calculate total expenses for response
    const responseData = profile.toObject();
    responseData.totalMonthlyExpenses =
      responseData.customExpenses?.reduce(
        (total, expense) => total + (expense.amount || 0),
        0
      ) || 0;

    res.status(200).json({
      success: true,
      message: profile.isNew ? "Profile created" : "Profile updated",
      data: responseData,
    });
  } catch (error) {
    console.error("[Profile Controller] Save error:", error);

    let status = 500;
    let message = "Internal server error";

    if (error.name === "ValidationError") {
      status = 400;
      message = "Validation failed: " + error.message;
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
 * Delete profile with confirmation
 */
export const deleteProfile = async (req, res) => {
  try {
    const { deletedCount } = await Profile.deleteOne({ userId: req.user._id });

    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found or already deleted",
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

/**
 * Get all profiles (admin only) with filtering
 */
export const getAllProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const profiles = await Profile.find()
      .lean()
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("+totalMonthlyExpenses");

    const count = await Profile.countDocuments();

    res.status(200).json({
      success: true,
      data: profiles,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("[Profile Controller] Get all error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get profile by ID with enhanced security
 */
export const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile ID format",
      });
    }

    const profile = await Profile.findOne({
      _id: id,
      ...(req.user.role !== "admin" ? { userId: req.user._id } : {}),
    })
      .lean()
      .select("+totalMonthlyExpenses");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found or unauthorized access",
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
