import React from "react";
import { FaSearch, FaBell } from "react-icons/fa";

const Header = () => {
  return (
    <header className="w-full bg-gray-800 text-white p-4 flex justify-between items-center shadow">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      <div className="flex items-center gap-4">
        <FaSearch className="cursor-pointer" aria-label="Search" />
        <FaBell className="cursor-pointer" aria-label="Notifications" />
        <div className="relative group">
          <img
            src="https://ui-avatars.com/api/?name=User"
            alt="User avatar"
            className="w-8 h-8 rounded-full border border-gray-600 cursor-pointer"
          />
          <div className="absolute hidden group-hover:block right-0 mt-2 w-40 bg-white dark:bg-gray-700 shadow-md rounded-md text-sm z-50">
            <a
              href="/profile"
              className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              Profile
            </a>
            <a
              href="/settings"
              className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              Settings
            </a>
            <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
