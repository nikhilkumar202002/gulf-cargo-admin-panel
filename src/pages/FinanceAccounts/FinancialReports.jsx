import React from "react";
import { useNavigate } from "react-router-dom";

export default function FinancialReports() {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Financial Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Monthly Report Card */}
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800">Monthly Revenue Report</h3>
          <p className="text-gray-500">Period: August 2025</p>
          <span className="mt-3 inline-block px-3 py-1 text-xs rounded bg-green-100 text-green-700">Generated</span>
          <button
            onClick={() => navigate("/financeaccounts/monthlyreport")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
          >
            View Report
          </button>
        </div>

        {/* Quarterly Report Card */}
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800">Quarterly Expenses Report</h3>
          <p className="text-gray-500">Period: Q2 2025</p>
          <span className="mt-3 inline-block px-3 py-1 text-xs rounded bg-green-100 text-green-700">Generated</span>
          <button
            onClick={() => navigate("/financeaccounts/quarterlyreport")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
          >
            View Report
          </button>
        </div>

        {/* Annual Report Card */}
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800">Annual Financial Report</h3>
          <p className="text-gray-500">Period: 2025</p>
          <span className="mt-3 inline-block px-3 py-1 text-xs rounded bg-yellow-100 text-yellow-700">Pending</span>
          <button
            onClick={() => navigate("/financeaccounts/annualreport")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
          >
            View Report
          </button>
        </div>
      </div>
    </div>
  );
}
