import { useNavigate } from "react-router-dom";

export default function DeliveryPerformance() {
  const navigate = useNavigate();

  const data = [
    { driver: "John Doe", completed: 120, failed: 5, successRate: "96%" },
    { driver: "Jane Smith", completed: 95, failed: 12, successRate: "89%" },
    { driver: "Mark Johnson", completed: 150, failed: 3, successRate: "98%" },
  ];

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6 text-gray-800">Delivery Performance</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold text-green-600">92%</h2>
          <p className="text-gray-500">Overall Success Rate</p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold text-blue-600">365</h2>
          <p className="text-gray-500">Total Deliveries</p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold text-red-600">20</h2>
          <p className="text-gray-500">Failed Deliveries</p>
        </div>
      </div>

      {/* Driver Performance Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Driver Performance</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-3 border-b">Driver</th>
              <th className="p-3 border-b">Completed</th>
              <th className="p-3 border-b">Failed</th>
              <th className="p-3 border-b">Success Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="p-3">{item.driver}</td>
                <td className="p-3 text-green-600">{item.completed}</td>
                <td className="p-3 text-red-600">{item.failed}</td>
                <td className="p-3">{item.successRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
