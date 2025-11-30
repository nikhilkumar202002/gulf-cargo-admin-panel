import React from "react";

export default function AnnualReport() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between">
 <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Annual Financial Report</h1>
        <p className="text-gray-500">Period: 2025</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-gray-500">Total Shipments</h3>
          <p className="text-2xl font-bold text-indigo-600">5,200</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-gray-500">Total Revenue</h3>
          <p className="text-2xl font-bold text-green-600">$1,200,000</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-gray-500">Total Expenses</h3>
          <p className="text-2xl font-bold text-red-600">$450,000</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-md">
          <h3 className="text-gray-500">Net Profit</h3>
          <p className="text-2xl font-bold text-blue-600">$750,000</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md p-5">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Yearly Financial Summary</h2>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3 text-left">Quarter</th>
              <th className="p-3 text-right">Revenue</th>
              <th className="p-3 text-right">Expenses</th>
              <th className="p-3 text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {[
              { q: "Q1", rev: "$280,000", exp: "$120,000", profit: "$160,000" },
              { q: "Q2", rev: "$300,000", exp: "$110,000", profit: "$190,000" },
              { q: "Q3", rev: "$310,000", exp: "$100,000", profit: "$210,000" },
              { q: "Q4", rev: "$310,000", exp: "$120,000", profit: "$190,000" },
            ].map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-3">{row.q}</td>
                <td className="p-3 text-right">{row.rev}</td>
                <td className="p-3 text-right">{row.exp}</td>
                <td className="p-3 text-right">{row.profit}</td>
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
