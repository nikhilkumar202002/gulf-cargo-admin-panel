import React from "react";

export default function MonthlyReport() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Title */}
      <div className="flex justify-between">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Monthly Revenue Report</h1>
          <p className="text-gray-500">Period: August 2025</p>
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
          <h3 className="text-gray-500">Total Shipments</h3>
          <p className="text-2xl font-bold text-indigo-600">520</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-gray-500">Total Revenue</h3>
          <p className="text-2xl font-bold text-green-600">$120,000</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-gray-500">Total Profit</h3>
          <p className="text-2xl font-bold text-blue-600">$80,000</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md p-5">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Revenue Breakdown</h2>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Shipment ID</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {[
              { date: "01 Aug 2025", id: "SHIP-001", customer: "John Doe", amount: "$2,500" },
              { date: "03 Aug 2025", id: "SHIP-002", customer: "Eva Smith", amount: "$3,200" },
              { date: "07 Aug 2025", id: "SHIP-003", customer: "Mark Wilson", amount: "$4,000" },
            ].map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-3">{row.date}</td>
                <td className="p-3">{row.id}</td>
                <td className="p-3">{row.customer}</td>
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
