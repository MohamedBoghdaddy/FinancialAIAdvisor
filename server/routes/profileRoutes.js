// 📁 routes/profileRoutes.js
import express from "express";
import {
  getLatestProfile,
  createOrUpdateProfile,
} from "../controllers/profileController.js";
import { auth, authorizeRoles } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.get("/latest", auth, getLatestProfile);
router.post("/submit", auth, createOrUpdateProfile);

export default router;
