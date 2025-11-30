import { useNavigate } from "react-router-dom";

export default function ShipmentReport() {
  const navigate = useNavigate();

  const shipments = [
    { id: "SHP001", status: "Delivered", date: "2025-09-01", location: "Dubai", amount: "$450" },
    { id: "SHP002", status: "In Transit", date: "2025-09-02", location: "Abu Dhabi", amount: "$700" },
    { id: "SHP003", status: "Pending", date: "2025-09-04", location: "Sharjah", amount: "$300" },
  ];

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6 text-gray-800">Shipment Reports</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold text-gray-700">120</h2>
          <p className="text-gray-500">Total Shipments</p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold text-green-600">95</h2>
          <p className="text-gray-500">Delivered</p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold text-red-500">25</h2>
          <p className="text-gray-500">Pending</p>
        </div>
      </div>

      {/* Shipment Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Recent Shipments</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-3 border-b">ID</th>
              <th className="p-3 border-b">Status</th>
              <th className="p-3 border-b">Date</th>
              <th className="p-3 border-b">Location</th>
              <th className="p-3 border-b">Amount</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((ship, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="p-3">{ship.id}</td>
                <td className={`p-3 ${ship.status === "Delivered" ? "text-green-600" : ship.status === "Pending" ? "text-red-600" : "text-yellow-600"}`}>
                  {ship.status}
                </td>
                <td className="p-3">{ship.date}</td>
                <td className="p-3">{ship.location}</td>
                <td className="p-3">{ship.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
