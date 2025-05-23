import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/CurrencyConverter.css";


const API_KEY = "a16a74e7732bd447e54a6c51068147e2";

const CurrencyConverter = () => {
  const [amount, setAmount] = useState(1);
  const [toCurrency, setToCurrency] = useState("EGP");
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [currencyList, setCurrencyList] = useState([]);

  // 👇 Load currency list once (symbols endpoint works even on free plan)
  useEffect(() => {
    axios
      .get(`https://data.fixer.io/api/symbols?access_key=${API_KEY}`)
      .then((res) => {
        if (res.data.success) {
          setCurrencyList(Object.keys(res.data.symbols));
        } else {
          console.error("Symbol fetch error", res.data.error);
        }
      })
      .catch((err) => {
        console.error("Error loading currencies", err);
      });
  }, []);

  const convertCurrency = () => {
    axios
      .get(`https://data.fixer.io/api/latest`, {
        params: {
          access_key: API_KEY,
          symbols: toCurrency,
        },
      })
      .then((res) => {
        if (res.data.success && res.data.rates[toCurrency]) {
          const rate = res.data.rates[toCurrency];
          setConvertedAmount(rate * amount);
        } else {
          alert("Conversion failed. Try again.");
        }
      })
      .catch((err) => {
        console.error("Conversion error", err);
      });
  };

  return (
    <div className="currency-converter">
      <h2>💱 Currency Converter</h2>
      <div>
        <input
          type="number"
          value={amount}
          min="1"
          onChange={(e) => setAmount(e.target.value)}
        />
        <span> EUR → </span>
        <select
          value={toCurrency}
          onChange={(e) => setToCurrency(e.target.value)}
        >
          {currencyList.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <button onClick={convertCurrency}>Convert</button>
      </div>

      {convertedAmount !== null && (
        <p>
          {amount} EUR = <strong>{convertedAmount.toFixed(2)}</strong>{" "}
          {toCurrency}
        </p>
      )}
    </div>
  );
};

export default CurrencyConverter;
