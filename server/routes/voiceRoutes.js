import express from "express";
import { auth } from "../Middleware/authMiddleware.js";
import { executeVoiceCommand, parseVoiceCommand } from "../controller/voiceController.js";

const router = express.Router();

router.post("/command", auth, parseVoiceCommand);
router.post("/execute", auth, executeVoiceCommand);

export default router;
