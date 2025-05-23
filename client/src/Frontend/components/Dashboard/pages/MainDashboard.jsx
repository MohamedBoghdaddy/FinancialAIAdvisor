import React, { useContext } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { DashboardContext } from "../../../../context/DashboardContext";

const MainDashboard = () => {
  const { profileData, loading, error } = useContext(DashboardContext);

  const salary = profileData?.salary || 0;
  const expenses = profileData?.expenses || 0; // or assume a default
  const balance = salary - expenses;

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          {loading ? (
            <p className="text-center text-sm text-gray-400">Loading data...</p>
          ) : error ? (
            <p className="text-center text-red-500">Error loading profile</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
                <h3 className="text-lg font-semibold mb-2">Total Balance</h3>
                <p className="text-2xl font-bold">
                  ${balance.toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
                <h3 className="text-lg font-semibold mb-2">Income</h3>
                <p className="text-2xl font-bold">${salary.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
                <h3 className="text-lg font-semibold mb-2">Expenses</h3>
                <p className="text-2xl font-bold">
                  ${expenses.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MainDashboard;
