import express from "express";
import {
  submitQuestionnaire,
  getUserQuestionnaire,
} from "../controller/questionnaireController.js";
import { auth } from "../Middleware/authMiddleware.js";
import Questionnaire from "../models/questionnaireModel.js"; // ✅ Fixed missing import

const router = express.Router();

// Route to submit questionnaire responses (Only once per day)
router.post("/submit", auth, submitQuestionnaire);

// Route to get the latest questionnaire response by the logged-in user
router.get("/latest", auth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    const questionnaire = await Questionnaire.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 }) // Get the latest questionnaire
      .lean();

    if (!questionnaire) {
      return res.status(404).json({ message: "No questionnaire found." });
    }

    res.status(200).json(questionnaire);
  } catch (error) {
    console.error("❌ Error fetching questionnaire:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
