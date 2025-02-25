import express from "express";
import {
  submitQuestionnaire,
  getUserQuestionnaire,
} from "../controller/questionnaireController.js";
import { auth } from "../Middleware/authMiddleware.js";

const router = express.Router();

// Route to submit questionnaire responses (Only once per day)
router.post("/submit", auth, submitQuestionnaire);

// Route to get the latest questionnaire response by the logged-in user
router.get("/latest", auth, getUserQuestionnaire);

export default router;
