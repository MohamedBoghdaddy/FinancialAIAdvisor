import express from "express";
import { auth, authorizeRoles } from "../Middleware/authMiddleware.js";
import {
  getAccountScore,
  getAuditLog,
  getSecurityCenter,
} from "../controller/securityController.js";

const router = express.Router();

router.get("/account-score", auth, getAccountScore);
router.get("/audit-log", auth, getAuditLog);
router.get("/admin/security-center", auth, authorizeRoles("admin"), getSecurityCenter);

export default router;
