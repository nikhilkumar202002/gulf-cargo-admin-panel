import { useNavigate } from "react-router-dom";

export default function RevenueExpenseReport() {
  const navigate = useNavigate();

  const data = [
    { month: "July", revenue: "$12,000", expense: "$7,500" },
    { month: "August", revenue: "$15,000", expense: "$9,000" },
    { month: "September", revenue: "$14,000", expense: "$8,200" },
  ];

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6 text-gray-800">Revenue & Expense Reports</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold text-green-600">$41,000</h2>
          <p className="text-gray-500">Total Revenue</p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold text-red-600">$24,700</h2>
          <p className="text-gray-500">Total Expenses</p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold text-blue-600">$16,300</h2>
          <p className="text-gray-500">Net Profit</p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold text-yellow-600">+12%</h2>
          <p className="text-gray-500">Growth</p>
        </div>
      </div>

      {/* Revenue Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Monthly Revenue & Expenses</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-3 border-b">Month</th>
              <th className="p-3 border-b">Revenue</th>
              <th className="p-3 border-b">Expenses</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="p-3">{item.month}</td>
                <td className="p-3 text-green-600">{item.revenue}</td>
                <td className="p-3 text-red-600">{item.expense}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
