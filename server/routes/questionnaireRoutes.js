import express from "express";
import {
  submitQuestionnaire,
  getUserQuestionnaires,
} from "../controller/questionnaireController.js";
import { auth } from "../Middleware/authMiddleware.js";

const router = express.Router();

// Route to submit questionnaire responses
router.post("/submit", auth, submitQuestionnaire);

// Route to get questionnaire responses by the logged-in user
router.get("/my-responses", auth, getUserQuestionnaires);

export default router;
