import express from "express";
import {
  register,
  login,
  logoutUser,
  getUser,
  updateUser,
  deleteUser,
  checkAuth,
} from "../controller/usercontroller.js";
import { auth, authorizeRoles } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", register);
router.post("/login", login);
router.post("/logout", logoutUser);

router.get("/api/users/getone/:userId", getUser);
router.put("/update/:userId", auth, updateUser);
router.delete("/:userId", auth, deleteUser);

// Route accessible only to admins
router.get("/admin", auth, authorizeRoles("admin"), (req, res) => {
  res.status(200).json({ message: "Welcome, Admin!" });
});

// Route accessible to both admins and users
router.get("/dashboard", auth, authorizeRoles("admin", "user"), (req, res) => {
  res.status(200).json({ message: "Welcome to the Dashboard" });
});

// Add the checkAuth route
router.get("/checkAuth", checkAuth);

export default router;
