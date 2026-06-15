import axios from "axios";
import { env } from "../config/env.js";
import { recordAuditLog } from "../utils/auditLog.js";
import { FORBIDDEN_INTENTS, getIntentConfig } from "../utils/voiceIntents.js";

const { FLASK_API_BASE_URL } = env;

/**
 * POST /api/voice/command
 * Tap-to-speak entry point: sends the transcribed text to the LLM intent
 * classifier and returns a structured intent + risk level. Does not
 * execute anything - see /api/voice/execute.
 */
export const parseVoiceCommand = async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ success: false, message: "text is required" });
  }

  try {
    const response = await axios.post(
      `${FLASK_API_BASE_URL}/api/llm/intent`,
      { text },
      { timeout: 30000 }
    );

    const { intent, risk_level, parameters } = response.data;

    await recordAuditLog({
      userId: req.user._id,
      action: "voice_command",
      category: "voice",
      req,
      metadata: { intent, risk_level },
      riskLevel: risk_level === "high" ? "high" : "low",
    });

    let action_required = "execute";
    if (FORBIDDEN_INTENTS.has(intent) || risk_level === "high") {
      action_required = "blocked";
    } else if (risk_level === "medium") {
      action_required = "confirm";
    }

    res.status(200).json({
      success: true,
      data: { intent, risk_level, parameters, action_required },
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      message: "Voice intent service unavailable",
      ...(env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

/**
 * POST /api/voice/execute
 * Executes a previously-classified intent. High-risk / forbidden intents
 * are always blocked. Medium-risk intents require `confirmed: true`.
 */
export const executeVoiceCommand = async (req, res) => {
  const { intent, confirmed } = req.body;

  if (!intent || typeof intent !== "string") {
    return res.status(400).json({ success: false, message: "intent is required" });
  }

  if (FORBIDDEN_INTENTS.has(intent)) {
    await recordAuditLog({
      userId: req.user._id,
      action: "voice_execute_blocked",
      category: "voice",
      req,
      metadata: { intent },
      riskLevel: "high",
    });
    return res.status(403).json({
      success: false,
      message:
        "This action cannot be performed by voice. Please use the app's normal interface and confirm manually.",
    });
  }

  const config = getIntentConfig(intent);
  if (!config) {
    return res.status(400).json({ success: false, message: "Unknown intent" });
  }

  if (config.riskLevel === "medium" && !confirmed) {
    return res.status(200).json({
      success: true,
      data: { status: "confirmation_required", intent },
    });
  }

  await recordAuditLog({
    userId: req.user._id,
    action: "voice_execute",
    category: "voice",
    req,
    metadata: { intent, riskLevel: config.riskLevel },
    riskLevel: "low",
  });

  res.status(200).json({
    success: true,
    data: {
      status: "executed",
      intent,
      route: config.route || null,
    },
  });
};
