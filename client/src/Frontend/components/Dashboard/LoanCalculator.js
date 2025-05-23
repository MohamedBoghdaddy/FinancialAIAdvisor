import React, { useState } from 'react';
import './LoanCalculator.css';

const LoanCalculator = () => {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [years, setYears] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState(null);

  const calculateLoan = () => {
    const principal = parseFloat(amount);
    const interestRate = parseFloat(rate) / 100 / 12;
    const payments = parseInt(years) * 12;

    const x = Math.pow(1 + interestRate, payments);
    const monthly = (principal * x * interestRate) / (x - 1);

    setMonthlyPayment(monthly.toFixed(2));
  };

  return (
    <div className="loan-calculator">
      <h2>Loan Calculator</h2>
      <label>
        Loan Amount:
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
      </label>
      <label>
        Interest Rate (%):
        <input type="number" value={rate} onChange={e => setRate(e.target.value)} />
      </label>
      <label>
        Term (Years):
        <input type="number" value={years} onChange={e => setYears(e.target.value)} />
      </label>
      <button onClick={calculateLoan}>Calculate</button>

      {monthlyPayment && (
        <div className="result">
          Monthly Payment: <strong>${monthlyPayment}</strong>
        </div>
      )}
    </div>
  );
};

export default LoanCalculator;
