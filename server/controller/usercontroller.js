import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; // bcryptjs preferred for ease of use
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import User from "../models/UserModel.js";
import { env } from "../config/env.js";
import { recordAuditLog } from "../utils/auditLog.js";

const JWT_SECRET = env.JWT_SECRET;

// __dirname resolution for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Multer config for profile photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${Date.now()}${path.extname(file.originalname)}`);
  },
});
export const upload = multer({ storage });

// JWT Token creation helper
const createToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

// REGISTER USER
export const registerUser = async (req, res) => {
  const { username, email, password, firstName, lastName, gender } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      const field = existingUser.username === username ? "username" : "email";
      return res
        .status(400)
        .json({ message: `User with this ${field} already exists.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      gender,
    });

    const token = createToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username,
        email,
        role: user.role,
        gender,
        firstName,
        lastName,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};

// LOGIN USER
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find user and include password explicitly
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      await recordAuditLog({
        action: "failed_login",
        category: "auth",
        req,
        metadata: { email },
        riskLevel: "medium",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.blocked) {
      return res.status(403).json({ message: "Your account has been blocked" });
    }

    if (!user.password) {
      return res
        .status(500)
        .json({ message: "Password not set for this user" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      await recordAuditLog({
        userId: user._id,
        action: "failed_login",
        category: "auth",
        req,
        metadata: { email },
        riskLevel: "medium",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = createToken(user);

    // Set JWT cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    await recordAuditLog({
      userId: user._id,
      action: "login",
      category: "auth",
      req,
      riskLevel: "low",
    });

    // Return user info and token
    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// LOGOUT USER
export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed", error: error.message });
  }
};

// GET ALL USERS (without passwords)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET USER BY ID (without password)
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CHECK AUTHENTICATION
export const checkAuth = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fields a user is allowed to update on their own account.
const SELF_EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "gender",
  "receiveNotifications",
  "profilePhoto",
];

// UPDATE USER PROFILE (including optional profile photo upload)
// Users may only update their own profile; admins may update any profile.
// Role, password, and blocked status cannot be changed through this endpoint.
export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const isOwner = req.user._id.toString() === userId;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "You are not allowed to update this user's profile",
      });
    }

    const updates = {};
    for (const field of SELF_EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (req.file) updates.profilePhoto = `/uploads/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    }).select("-password");
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE USER
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await recordAuditLog({
      userId: req.user?._id,
      action: "delete_user",
      category: "admin",
      req,
      metadata: { targetUserId: req.params.userId, targetEmail: user.email },
      riskLevel: "high",
    });

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// TOGGLE BLOCK / UNBLOCK USER
export const toggleBlockStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.blocked = !user.blocked;
    await user.save();

    await recordAuditLog({
      userId: req.user?._id,
      action: "toggle_block_user",
      category: "admin",
      req,
      metadata: { targetUserId: user._id.toString(), blocked: user.blocked },
      riskLevel: "high",
    });

    res.json({ success: true, blocked: user.blocked });
  } catch (err) {
    res.status(500).json({ message: "Error toggling block status" });
  }
};

// UPDATE LOGIN METADATA (last login timestamp, IP, activity log)
export const updateLoginMeta = async (req, res) => {
  const { email } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  try {
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: { lastLogin: new Date(), lastIP: ip },
        $push: { activityLog: { action: "Login", timestamp: new Date() } },
      },
      { new: true }
    );

    res.status(200).json({ success: true, user });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error updating login metadata" });
  }
};

// UPDATE USER ROLE OR PASSWORD
export const updateUserRoleOrPassword = async (req, res) => {
  const { id } = req.params;
  const { newRole, newPassword } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (newRole) user.role = newRole;
    if (newPassword) user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    await recordAuditLog({
      userId: req.user?._id,
      action: "admin_update_user",
      category: "admin",
      req,
      metadata: {
        targetUserId: id,
        roleChanged: Boolean(newRole),
        passwordChanged: Boolean(newPassword),
      },
      riskLevel: "high",
    });

    res.json({ success: true, message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating user" });
  }
};

// UPDATE USER ROLE ONLY (optional)
export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { newRole } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = newRole;
    await user.save();

    await recordAuditLog({
      userId: req.user?._id,
      action: "admin_update_role",
      category: "admin",
      req,
      metadata: { targetUserId: id, newRole },
      riskLevel: "high",
    });

    res.json({ success: true, message: "Role updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update role" });
  }
};
