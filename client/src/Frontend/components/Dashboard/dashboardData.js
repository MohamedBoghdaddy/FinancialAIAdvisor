export const dashboardData = {
  accountBalance: 25750.5,
  monthlyIncome: 5200.0,
  monthlyExpenses: 3450.75,
  savingsGoal: 50000,
  currentSavings: 18500,
  investments: [
    { id: 1, name: "Stock Portfolio", value: 15000, growth: 8.2 },
    { id: 2, name: "Retirement Fund", value: 42000, growth: 5.7 },
    { id: 3, name: "Real Estate", value: 120000, growth: 3.1 },
  ],
  recentTransactions: [
    {
      id: 1,
      date: "2023-05-15",
      description: "Grocery Store",
      amount: -125.4,
      category: "Food",
    },
    {
      id: 2,
      date: "2023-05-14",
      description: "Salary Deposit",
      amount: 2600.0,
      category: "Income",
    },
    {
      id: 3,
      date: "2023-05-12",
      description: "Electric Bill",
      amount: -85.2,
      category: "Utilities",
    },
    {
      id: 4,
      date: "2023-05-10",
      description: "Restaurant",
      amount: -65.8,
      category: "Dining",
    },
    {
      id: 5,
      date: "2023-05-05",
      description: "Investment Deposit",
      amount: -500.0,
      category: "Savings",
    },
  ],
  financialTips: [
    "Consider increasing your retirement contributions by 2% to maximize employer matching.",
    "Your dining expenses are 15% higher than last month. Consider setting a budget for eating out.",
    "You have $1,200 in a low-interest savings account. Consider moving it to a high-yield savings account.",
  ],
};
