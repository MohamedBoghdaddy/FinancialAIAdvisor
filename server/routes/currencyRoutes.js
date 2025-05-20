// ✅ FILE: /server/routes/currencyRoutes.js

import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// ✅ Static list of currencies for dropdowns
router.get("/symbols", (req, res) => {
  const symbols = [
    { code: "USD", description: "United States Dollar" },
    { code: "EGP", description: "Egyptian Pound" },
    { code: "EUR", description: "Euro" },
    { code: "GBP", description: "British Pound" },
    { code: "JPY", description: "Japanese Yen" },
    { code: "SAR", description: "Saudi Riyal" },
    { code: "AED", description: "UAE Dirham" },
  ];

  res.json({ success: true, symbols });
});

// ✅ Gemini-powered conversion (only return number + currency)
router.get("/convert", async (req, res) => {
  const { from, to, amount } = req.query;

  if (!from || !to || !amount) {
    return res.status(400).json({
      success: false,
      message: "Missing query parameters: from, to, amount",
    });
  }

  const prompt = `
You are a currency conversion expert. Convert ${amount} ${from} to ${to} using the most recent exchange rate.

🚫 Do not explain.
🚫 Do not add any sentences.
✅ Only respond with the numeric result followed by the target currency code.

Example response: 4785.00 ${to}
`;

  try {
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const text = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    res.json({ success: true, result: text });
  } catch (err) {
    console.error("🔥 Gemini conversion error:", err.message);
    res.status(500).json({ success: false, error: "Gemini conversion failed" });
  }
});

export default router;