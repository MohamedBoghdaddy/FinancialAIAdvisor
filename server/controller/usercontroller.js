// ... all your existing imports
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import User from "../models/UserModel.js";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

// __dirname resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${Date.now()}${path.extname(file.originalname)}`);
  },
});
export const upload = multer({ storage });

// JWT Token creation
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
    // Select password explicitly for login
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    if (user.blocked) {
      return res
        .status(403)
        .json({ message: "Your account has been blocked by the admin." });
    }

    if (!user.password) {
      // Very rare case, password missing in DB
      return res
        .status(500)
        .json({ message: "Password not set for this user." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      token,
      user: { id: user._id, username: user.username, email, role: user.role },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};



// LOGOUT
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

// GET USERS
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CHECK AUTH
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

// UPDATE PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = { ...req.body };
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

// DELETE
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// BLOCK / UNBLOCK
export const toggleBlockStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.blocked = !user.blocked;
    await user.save();

    res.json({ success: true, blocked: user.blocked });
  } catch (err) {
    res.status(500).json({ message: "Error toggling block status" });
  }
};

// LOGIN META UPDATE
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

// ✅ FIXED: ADD this missing export
export const updateUserRoleOrPassword = async (req, res) => {
  const { id } = req.params;
  const { newRole, newPassword } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (newRole) user.role = newRole;
    if (newPassword) user.password = await bcrypt.hash(newPassword, 10);

    await user.save();
    res.json({ success: true, message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating user" });
  }
};

// OPTIONAL: Separate role update only
export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { newRole } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = newRole;
    await user.save();

    res.json({ success: true, message: "Role updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update role" });
  }
};
