import { useNavigate } from "react-router-dom";

export default function BranchAnalysis() {
  const navigate = useNavigate();

  const branches = [
    { branch: "Dubai", revenue: "$12,000", deliveries: 150, rating: "4.8/5" },
    { branch: "Abu Dhabi", revenue: "$10,500", deliveries: 120, rating: "4.6/5" },
    { branch: "Sharjah", revenue: "$8,200", deliveries: 95, rating: "4.4/5" },
  ];

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6 text-gray-800">Branch-wise Analysis</h1>

      {/* Branch Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Branch Comparison</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-3 border-b">Branch</th>
              <th className="p-3 border-b">Revenue</th>
              <th className="p-3 border-b">Deliveries</th>
              <th className="p-3 border-b">Customer Rating</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="p-3">{branch.branch}</td>
                <td className="p-3 text-green-600">{branch.revenue}</td>
                <td className="p-3">{branch.deliveries}</td>
                <td className="p-3">{branch.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
