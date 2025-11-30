import React from "react";

const ExpensesPurchaseOrders = () => {
  const expenses = [
    { id: "EXP001", category: "Fuel", amount: 400, date: "2025-09-02", status: "Approved" },
    { id: "EXP002", category: "Maintenance", amount: 120, date: "2025-09-03", status: "Pending" },
    { id: "EXP003", category: "Toll Charges", amount: 60, date: "2025-08-31", status: "Rejected" },
  ];

  const statusClasses = {
    Approved: "bg-green-100 text-green-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Rejected: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Expenses & Purchase Orders</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Expense ID</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Category</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Amount ($)</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Date</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id} className="border-t hover:bg-gray-50">
                <td className="px-5 py-3">{exp.id}</td>
                <td className="px-5 py-3">{exp.category}</td>
                <td className="px-5 py-3 font-medium">${exp.amount}</td>
                <td className="px-5 py-3">{exp.date}</td>
                <td className="px-5 py-3">
                  <span className={`px-3 py-1 text-xs rounded-full ${statusClasses[exp.status]}`}>
                    {exp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpensesPurchaseOrders;
