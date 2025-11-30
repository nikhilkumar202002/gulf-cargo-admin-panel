import React from "react";

export default function QuarterlyReport() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between">
        <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quarterly Expenses Report</h1>
        <p className="text-gray-500">Period: Q2 2025</p>
      </div>
          <div>
            <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition"
      >
        ← Back
      </button>
        </div>
      </div>
      

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-gray-500">Total Expenses</h3>
          <p className="text-2xl font-bold text-red-600">$45,000</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-gray-500">Pending Payments</h3>
          <p className="text-2xl font-bold text-yellow-600">$8,200</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-gray-500">Settled Payments</h3>
          <p className="text-2xl font-bold text-green-600">$36,800</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md p-5">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Expenses Breakdown</h2>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Expense ID</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {[
              { date: "05 Apr 2025", id: "EXP-001", desc: "Fuel Costs", amount: "$12,000" },
              { date: "12 May 2025", id: "EXP-002", desc: "Driver Salaries", amount: "$20,000" },
              { date: "20 Jun 2025", id: "EXP-003", desc: "Warehouse Rent", amount: "$13,000" },
            ].map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-3">{row.date}</td>
                <td className="p-3">{row.id}</td>
                <td className="p-3">{row.desc}</td>
                <td className="p-3 text-right">{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Export Buttons */}
        <div className="mt-5 flex gap-3">
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg">Export PDF</button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg">Export Excel</button>
        </div>
      </div>
    </div>
  );
}
