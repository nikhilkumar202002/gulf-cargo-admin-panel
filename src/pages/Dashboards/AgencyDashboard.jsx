import React, { useState } from "react";
import {
  FaUsers,
  FaClock,
  FaInbox,
  FaTruck,
  FaBoxOpen,
  FaRegClock,
  FaPeopleCarry,
  FaExchangeAlt,
  FaCircle,
  FaChevronRight,
  FaChevronLeft,
} from "react-icons/fa";
import "../Styles.css"; // ✅ Reuse existing styles

// Reusable Card Component
const Card = ({ data }) => (
  <div className="dashboard-card flex items-center gap-3 bg-white rounded-2xl shadow-sm">
    <div className="card-icon flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 text-xl text-blue-600">
      {data.icon}
    </div>
    <div className="flex flex-col">
      <h1 className="text-xl font-semibold">{data.value}</h1>
      <p className="text-sm text-gray-500">{data.title}</p>
    </div>
  </div>
);

const AgencyDashboard = () => {
  // Top summary cards
  const agencyCards = [
    { title: "Total Shipments", value: 865, icon: <FaBoxOpen /> },
    { title: "Out for Delivery", value: 63, icon: <FaTruck /> },
    { title: "Pending Clearance", value: 12, icon: <FaClock /> },
    { title: "Total Clients", value: 240, icon: <FaUsers /> },
  ];

  // Cargo movement stats
  const cargoData = [
    { label: "Total Cargo", value: 865, icon: <FaBoxOpen className="text-blue-500" /> },
    { label: "Delivered", value: 640, icon: <FaTruck className="text-green-500" /> },
    { label: "Pending", value: 63, icon: <FaRegClock className="text-yellow-500" /> },
    { label: "Under Clearance", value: 12, icon: <FaExchangeAlt className="text-purple-500" /> },
  ];

  // Latest shipment details
  const shipmentData = [
    {
      date: "Today",
      shipmentId: "CARGO-2023123",
      client: "Acme Logistics",
      status: "Out for Delivery",
      destination: "New York, NY",
      type: "Express",
      amount: "- 120.00 $",
      statusColor: "bg-blue-500",
    },
    {
      date: "Today",
      shipmentId: "CARGO-2023124",
      client: "FastShip",
      status: "Pending",
      destination: "Los Angeles, CA",
      type: "Standard",
      amount: "- 45.00 $",
      statusColor: "bg-yellow-400",
    },
    {
      date: "20.05",
      shipmentId: "CARGO-2023125",
      client: "Eagle Carriers",
      status: "Delivered",
      destination: "Chicago, IL",
      type: "Overnight",
      amount: "- 150.00 $",
      statusColor: "bg-green-500",
    },
    {
      date: "19.05",
      shipmentId: "CARGO-2023126",
      client: "ShipRight",
      status: "Cleared",
      destination: "Houston, TX",
      type: "Standard",
      amount: "- 100.00 $",
      statusColor: "bg-purple-500",
    },
    {
      date: "18.05",
      shipmentId: "CARGO-2023127",
      client: "Urban Movers",
      status: "In Transit",
      destination: "Miami, FL",
      type: "Express",
      amount: "- 85.00 $",
      statusColor: "bg-orange-400",
    },
  ];

  const [page, setPage] = useState(1);

  return (
    <section className="dashboard min-h-screen bg-gray-50">
      <div className="dashboard-container max-w-7xl mx-auto py-8">
        
        {/* Agency Top Cards */}
        <div className="dashboard-row grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {agencyCards.map((card, index) => (
            <Card key={index} data={card} />
          ))}
        </div>

        {/* Cargo & Movement Overview */}
        <div className="dashboard-row">
          <div className="dashboard-row-heading mb-4">
            <h1 className="dashboard-overview text-xl font-bold">Cargo & Movement Overview</h1>
          </div>

          <div className="dashboard-table-wrapper flex gap-3 flex-col md:flex-row">
            <div className="cargo-movement bg-white rounded-2xl shadow-md p-6 flex-1">
              <h2 className="text-lg font-semibold mb-5">Cargo Stats</h2>
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-left font-semibold text-xs">
                    <th className="py-2">Category</th>
                    <th className="py-2 text-right pr-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {cargoData.map((row) => (
                    <tr key={row.label} className="border-b last:border-b-0">
                      <td className="flex items-center gap-3 py-3">
                        <span className="p-2 rounded-lg bg-gray-100">
                          {row.icon}
                        </span>
                        <span className="font-medium">{row.label}</span>
                      </td>
                      <td className="text-right font-semibold text-gray-700 pr-2">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Latest Shipments */}
        <div className="dashboard-cargo-list mt-10">
          <div className="dashboard-cargo-list-heading mb-3">
            <h1 className="text-lg font-bold">Latest Shipments</h1>
          </div>

          <div className="dashboard-cargo-table rounded-2xl shadow-md bg-white px-6 py-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 font-semibold">
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Shipment ID</th>
                  <th className="py-2 text-left">Client</th>
                  <th className="py-2 text-left">Destination</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-left">Amount</th>
                </tr>
              </thead>
              <tbody>
                {shipmentData.map((item) => (
                  <tr key={item.shipmentId} className="border-t last:border-b-0 hover:bg-gray-50 transition">
                    <td className="py-2">{item.date}</td>
                    <td className="py-2 font-medium">{item.shipmentId}</td>
                    <td className="py-2">{item.client}</td>
                    <td className="py-2">{item.destination}</td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${item.statusColor}`}
                      >
                        <FaCircle className="w-2 h-2" /> {item.status}
                      </span>
                    </td>
                    <td className="py-2">{item.type}</td>
                    <td className="py-2 font-semibold">{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <button
                className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm text-gray-500 bg-gray-100 hover:bg-gray-200"
                disabled={page === 1}
              >
                <FaChevronLeft className="w-3 h-3" /> Prev
              </button>
              <span className="text-gray-600 text-sm">Page {page} of 1</span>
              <button
                className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm text-gray-500 bg-gray-100 hover:bg-gray-200"
                disabled={true}
              >
                Next <FaChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AgencyDashboard;
