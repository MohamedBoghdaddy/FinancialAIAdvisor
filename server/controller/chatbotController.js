import axios from "axios";
import ChatModel from "../models/ChatModel.js";
import dotenv from "dotenv";
import Sentiment from "sentiment";

dotenv.config();
const sentiment = new Sentiment();

const financialTips = [
  "💰 Save at least 20% of your income each month.",
  "📉 Avoid impulse buying by waiting 24 hours before making a purchase.",
  "📊 Invest in diversified assets to reduce risk.",
  "🏦 Use high-yield savings accounts for emergency funds.",
  "💳 Pay off high-interest debt as soon as possible to avoid extra fees.",
];

const faqs = {
  "how to save money":
    "💰 Save at least 20% of your income each month and avoid impulse purchases.",
  "best way to invest":
    "📊 Diversify your investments and consider low-cost index funds.",
  "how to improve credit score":
    "✅ Pay bills on time and keep credit utilization below 30%.",
  "how to start budgeting":
    "📋 Track your expenses and allocate your income into savings, needs, and wants.",
};

// **API Fetching Functions**
const fetchCurrencyRates = async (base = "USD", target = "EUR") => {
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${base}&to_currency=${target}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching currency rates:", error);
    return "Unable to fetch currency exchange rates.";
  }
};

const fetchStockGainers = async () => {
  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/stock/market-gainers?token=${process.env.FINNHUB_API_KEY}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching stock gainers:", error);
    return "Unable to fetch stock gainers.";
  }
};

const fetchEconomicEvents = async () => {
  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/calendar/economic?token=${process.env.FINNHUB_API_KEY}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching economic events:", error);
    return "Unable to fetch economic events.";
  }
};

const fetchMetalPrices = async () => {
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_METAL_PRICE&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching metal prices:", error);
    return "Unable to fetch metal prices.";
  }
};

// **Chatbot Handler**
export const handleChatRequest = async (req, res) => {
  const { message } = req.body;
  const lowerMessage = message.toLowerCase();

  // **Check FAQs**
  if (faqs[lowerMessage]) {
    return res.json({ response: faqs[lowerMessage] });
  }

  try {
    // **Sentiment Analysis**
    const sentimentResult = sentiment.analyze(message);
    let sentimentLabel = "😐 Neutral";
    if (sentimentResult.score > 0) sentimentLabel = "😊 Positive";
    else if (sentimentResult.score < 0) sentimentLabel = "😞 Negative";

    let responseText = `🔍 Sentiment Analysis: ${sentimentLabel}\nAnalyzing financial data for: ${message}`;

    // **Determine API to Call**
    if (message.includes("exchange rate") || message.includes("currency")) {
      const currencyData = await fetchCurrencyRates();
      responseText += `\n💱 Currency Exchange Rate: ${JSON.stringify(
        currencyData
      )}`;
    } else if (
      message.includes("stock") ||
      message.includes("market gainers")
    ) {
      const stockData = await fetchStockGainers();
      responseText += `\n📈 Stock Market Gainers: ${JSON.stringify(stockData)}`;
    } else if (
      message.includes("economic event") ||
      message.includes("inflation")
    ) {
      const economicData = await fetchEconomicEvents();
      responseText += `\n📅 Economic Events: ${JSON.stringify(economicData)}`;
    } else if (
      message.includes("gold") ||
      message.includes("silver") ||
      message.includes("metal prices")
    ) {
      const metalData = await fetchMetalPrices();
      responseText += `\n🥇 Metal Prices: ${JSON.stringify(metalData)}`;
    } else {
      responseText += `\n❌ No relevant financial data found for: ${message}`;
    }

    // **Add a Financial Tip**
    const randomTip =
      financialTips[Math.floor(Math.random() * financialTips.length)];
    responseText += `\n💡 Financial Tip: ${randomTip}`;

    // **Save to Database**
    const chatEntry = new ChatModel({ message, response: responseText });
    await chatEntry.save();

    res.json({ response: responseText });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ response: "Error fetching financial data." });
  }
};
