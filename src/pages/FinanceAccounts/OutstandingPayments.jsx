import React from "react";

const OutstandingPayments = () => {
  const pendingPayments = [
    { id: "INV004", client: "Global Freight", amount: 1500, dueDate: "2025-09-10", daysOverdue: 3 },
    { id: "INV005", client: "Express Cargo", amount: 900, dueDate: "2025-09-08", daysOverdue: 1 },
    { id: "INV006", client: "QuickShip", amount: 700, dueDate: "2025-09-12", daysOverdue: 0 },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Outstanding Payments</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Invoice ID</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Client</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Amount ($)</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Due Date</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Days Overdue</th>
            </tr>
          </thead>
          <tbody>
            {pendingPayments.map((payment) => (
              <tr key={payment.id} className="border-t hover:bg-gray-50">
                <td className="px-5 py-3">{payment.id}</td>
                <td className="px-5 py-3">{payment.client}</td>
                <td className="px-5 py-3 font-medium">${payment.amount}</td>
                <td className="px-5 py-3">{payment.dueDate}</td>
                <td className="px-5 py-3 text-red-600">{payment.daysOverdue > 0 ? payment.daysOverdue : "On Time"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OutstandingPayments;
