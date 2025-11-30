import React from "react";

const InvoicesPayments = () => {
  const invoices = [
    { id: "INV001", client: "ABC Logistics", amount: 1200, status: "Paid", date: "2025-09-01" },
    { id: "INV002", client: "XYZ Cargo", amount: 800, status: "Pending", date: "2025-09-03" },
    { id: "INV003", client: "FastTrack", amount: 950, status: "Overdue", date: "2025-08-28" },
  ];

  const statusClasses = {
    Paid: "bg-green-100 text-green-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Overdue: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Invoices & Payments</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Invoice ID</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Client</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Amount ($)</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Status</th>
              <th className="px-5 py-3 text-sm font-medium text-gray-700">Date</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t hover:bg-gray-50">
                <td className="px-5 py-3">{invoice.id}</td>
                <td className="px-5 py-3">{invoice.client}</td>
                <td className="px-5 py-3 font-medium">${invoice.amount}</td>
                <td className="px-5 py-3">
                  <span className={`px-3 py-1 text-xs rounded-full ${statusClasses[invoice.status]}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-5 py-3">{invoice.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesPayments;
