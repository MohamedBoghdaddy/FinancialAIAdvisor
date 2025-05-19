import express from "express";
import axios from "axios";

const router = express.Router();
const FIXER_API_KEY = process.env.FIXER_API_KEY;

// Fetch currency symbols
router.get("/symbols", async (req, res) => {
  try {
    const { data } = await axios.get(
      `http://data.fixer.io/api/symbols?access_key=${FIXER_API_KEY}`
    );
    if (!data.success) return res.status(400).json({ error: data.error });
    res.json({ symbols: data.symbols });
  } catch (err) {
    console.error("❌ Error fetching symbols:", err.message);
    res.status(500).json({ error: "Currency symbol fetch failed" });
  }
});

// Convert currency
router.get("/convert", async (req, res) => {
  const { from, to, amount } = req.query;
  try {
    const { data } = await axios.get(
      `http://data.fixer.io/api/convert?access_key=${FIXER_API_KEY}&from=${from}&to=${to}&amount=${amount}`
    );
    if (!data.success) return res.status(400).json({ error: data.error });
    res.json({ result: data.result });
  } catch (err) {
    console.error("❌ Error converting currency:", err.message);
    res.status(500).json({ error: "Currency conversion failed" });
  }
});

export default router;
