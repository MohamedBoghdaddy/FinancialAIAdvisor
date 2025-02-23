import axios from "axios";
import Binance from "node-binance-api";
import ChatModel from "../models/ChatModel.js";
import dotenv from "dotenv";
import Sentiment from "sentiment";

dotenv.config();
const sentiment = new Sentiment();

// **Initialize Binance API**
const binance = new Binance().options({
  APIKEY: process.env.BINANCE_API_KEY,
  APISECRET: process.env.BINANCE_SECRET_KEY,
});

// **Financial Tips**
const financialTips = [
  "💰 Save at least 20% of your income each month.",
  "📉 Avoid impulse buying by waiting 24 hours before making a purchase.",
  "📊 Invest in diversified assets to reduce risk.",
  "🏦 Use high-yield savings accounts for emergency funds.",
  "💳 Pay off high-interest debt as soon as possible to avoid extra fees.",
];

// **FAQs**
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

// **Fetch Crypto Price from Binance**
const fetchCryptoPrice = async (symbol) => {
  try {
    const cleanSymbol = symbol.replace(/\W/g, "").toUpperCase() + "USDT";
    console.log(`Fetching Binance price for: ${cleanSymbol}`);

    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${cleanSymbol}`,
      { headers: { "X-MBX-APIKEY": process.env.BINANCE_API_KEY } }
    );

    if (!response.data || !response.data.price) {
      return `❌ No price data found for ${symbol}`;
    }

    return `🚀 Crypto Price: ${symbol.toUpperCase()} is **$${
      response.data.price
    }**`;
  } catch (error) {
    console.error(`Error fetching ${symbol} price:`, error.message);
    return "Unable to fetch crypto price.";
  }
};

// **Fetch Currency Exchange Rate from Alpha Vantage**
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

// **Fetch Stock Price from MarketStack**
const fetchStockPrice = async (symbol) => {
  try {
    const response = await axios.get(`http://api.marketstack.com/v1/eod`, {
      params: {
        access_key: process.env.MARKETSTACK_API_KEY,
        symbols: symbol,
        limit: 1,
      },
    });

    const stockData = response.data.data[0];
    if (!stockData) return `❌ No stock data found for ${symbol}`;

    return `📈 Stock Price for ${symbol}: $${stockData.close} (as of ${stockData.date})`;
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error.message);
    return "Unable to fetch stock market data.";
  }
};

// **Fetch Metal Prices from Alpha Vantage**
const fetchMetalPrices = async (metal) => {
  try {
    // Define the correct Finnhub symbols for gold & silver
    const metalSymbols = {
      GOLD: "GC1!",
      SILVER: "SI1!",
    };

    if (!metalSymbols[metal]) {
      return `❌ No data available for ${metal}`;
    }

    const response = await axios.get(`https://finnhub.io/api/v1/quote`, {
      params: {
        symbol: metalSymbols[metal],
        token: process.env.FINNHUB_API_KEY, // Your Finnhub API Key
      },
    });

    if (!response.data || !response.data.c) {
      return `❌ No price data found for ${metal}`;
    }

    return `🥇 **${metal} Price**: **$${response.data.c} per ounce**`;
  } catch (error) {
    console.error(`Error fetching ${metal} price:`, error.message);
    return "Unable to fetch metal prices.";
  }
};



// **Fetch Global Finance News from Mediastack**
const fetchFinanceNews = async () => {
  try {
    const response = await axios.get(`http://api.mediastack.com/v1/news`, {
      params: {
        access_key: process.env.MEDIASTACK_API_KEY,
        categories: "business",
        languages: "en",
        limit: 20, // Fetch more articles to allow better filtering
      },
    });

    if (
      !response.data ||
      !response.data.data ||
      response.data.data.length === 0
    ) {
      return "❌ No finance news available at the moment.";
    }

    // **Filter Finance-Related Articles**
    const financeKeywords = [
      "finance",
      "investment",
      "stock",
      "market",
      "economy",
      "cryptocurrency",
      "banking",
      "trading",
      "money",
      "debt",
      "recession",
      "inflation",
      "interest rates",
      "exchange rates",
      "bonds",
      "financial crisis",
      "Wall Street",
      "Federal Reserve",
      "gold prices",
      "forex",
    ];

    const filteredArticles = response.data.data.filter((article) =>
      financeKeywords.some(
        (keyword) =>
          (article.title && article.title.toLowerCase().includes(keyword)) ||
          (article.description &&
            article.description.toLowerCase().includes(keyword))
      )
    );

    if (filteredArticles.length === 0) {
      return "❌ No relevant finance news found.";
    }

    // **Format Filtered News**
    const newsArticles = filteredArticles
      .map(
        (article) =>
          `🔹 **${article.title}**\n📰 ${
            article.description || "No description available"
          }\n🔗 [Read more](${article.url})`
      )
      .join("\n\n");

    return `📢 **Latest Finance News:**\n\n${newsArticles}`;
  } catch (error) {
    console.error("Error fetching finance news:", error.message);
    return "Unable to fetch finance news.";
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

    // **Check for Crypto Prices**
    if (message.includes("crypto price of")) {
      const cryptoSymbol = message.split("crypto price of ")[1].toUpperCase();
      const cryptoData = await fetchCryptoPrice(cryptoSymbol);
      responseText += `\n${cryptoData}`;
    }

    // **Check for Stock Price**
    else if (message.includes("stock price of ")) {
      const stockSymbol = message.split("stock price of ")[1].toUpperCase();
      const stockData = await fetchStockPrice(stockSymbol);
      responseText += `\n${stockData}`;
    }

    // **Check for Exchange Rates**
    else if (
      message.includes("exchange rate") ||
      message.includes("currency")
    ) {
      const currencyData = await fetchCurrencyRates();
      responseText += `\n💱 Currency Exchange Rate: ${JSON.stringify(
        currencyData
      )}`;
    }

    // **Check for Metal Prices**
    else if (
      message.includes("gold") ||
      message.includes("silver") ||
      message.includes("metal prices")
    ) {
      const metalData = await fetchMetalPrices();
      responseText += `\n🥇 Metal Prices: ${JSON.stringify(metalData)}`;
    }

    // **Check for Finance News**
    else if (
      message.includes("finance news") ||
      message.includes("business news")
    ) {
      const financeNews = await fetchFinanceNews();
      responseText += `\n${financeNews}`;
    }

    // **No Relevant Data Found**
    else {
      responseText += `\n❌ No relevant financial data found for: ${message}`;
    }

    // **Add a Financial Tip**
    responseText += `\n💡 Financial Tip: ${
      financialTips[Math.floor(Math.random() * financialTips.length)]
    }`;

    // **Save to Database**
    const chatEntry = new ChatModel({ message, response: responseText });
    await chatEntry.save();

    res.json({ response: responseText });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ response: "Error fetching financial data." });
  }
};
