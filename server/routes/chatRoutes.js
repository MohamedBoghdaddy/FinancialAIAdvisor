import express from "express";
import { handleChatRequest } from "../controller/chatbotController.js";

const router = express.Router();

// Route for handling chatbot requests
router.post("/chat", handleChatRequest);

export default router;
