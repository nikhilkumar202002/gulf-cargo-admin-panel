// src/pages/StaffDashboard.jsx
import React, { useEffect, useState } from "react";
import {
  FaUsers,
  FaTasks,
  FaClock,
  FaInbox,
  FaTruck,
  FaUserCheck,
  FaUserTimes,
  FaUserMinus,
  FaExchangeAlt,
  FaCircle,
  FaChevronRight,
  FaChevronLeft,
} from "react-icons/fa";
import "../Styles.css"; // Reuse the same styles

// Constants for better maintainability
const LOADING_TIMEOUT = 800;
const TOTAL_PAGES = 1; // Assuming a single page for now

/* ---------------- Skeleton helpers ---------------- */
const Skel = ({ w = 100, h = 14, rounded = 8, className = "" }) => (
  <span
    className={`skel ${className}`}
    style={{
      display: "inline-block",
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      borderRadius: rounded,
    }}
    aria-hidden="true"
  />
);
const SkelCircle = ({ size = 48, className = "" }) => (
  <span
    className={`skel ${className}`}
    style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: 9999,
    }}
    aria-hidden="true"
  />
);

/* ---------------- UI bits ---------------- */
const Card = ({ data, loading }) => (
  <div className="dashboard-card flex items-center gap-3 bg-white rounded-2xl shadow-sm p-4">
    <div className="card-icon flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 text-xl text-blue-600">
      {loading ? <SkelCircle size={32} /> : data.icon}
    </div>
    <div className="flex flex-col">
      <h1 className="text-xl font-semibold">
        {loading ? <Skel w={50} h={20} /> : data.value}
      </h1>
      <p className="text-sm text-gray-500">
        {loading ? <Skel w={120} h={12} /> : data.title}
      </p>
    </div>
  </div>
);

const StaffDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Simulate loading; replace with your real fetch
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), LOADING_TIMEOUT);
    return () => clearTimeout(t);
  }, []);

  // Staff-specific summary cards
  const staffCards = [
    { title: "Today's Tasks", value: 15, icon: <FaInbox /> },
    { title: "Pending Approvals", value: 5, icon: <FaClock /> },
    { title: "Assigned Shipments", value: 10, icon: <FaTruck /> },
    { title: "Total Team Members", value: 8, icon: <FaUsers /> },
  ];

  // Staff Attendance Data
  const staffData = [
    { label: "Present", value: 6, icon: <FaUserCheck className="text-green-500" /> },
    { label: "Absent", value: 1, icon: <FaUserTimes className="text-red-500" /> },
    { label: "On Leave", value: 1, icon: <FaUserMinus className="text-yellow-500" /> },
    { label: "Shift Change", value: 0, icon: <FaExchangeAlt className="text-pink-500" /> },
  ];

  // Staff Assigned Cargo Data
  const assignedCargo = [
    {
      date: "Today",
      shipmentId: "CARGO-2023123",
      status: "Out for Delivery",
      destination: "New York, NY",
      type: "Express",
      statusColor: "bg-blue-500",
    },
    {
      date: "Today",
      shipmentId: "CARGO-2023124",
      status: "Pending",
      destination: "Los Angeles, CA",
      type: "Standard",
      statusColor: "bg-yellow-400",
    },
    {
      date: "20.05",
      shipmentId: "CARGO-2023125",
      status: "Delivered",
      destination: "Chicago, IL",
      type: "Overnight",
      statusColor: "bg-green-500",
    },
  ];

  return (
    <section className="dashboard min-h-screen bg-gray-50">
      <div className="dashboard-container max-w-7xl mx-auto py-8">
        {/* Staff-specific cards */}
        <div className="dashboard-row grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {(loading ? Array.from({ length: staffCards.length }) : staffCards).map((card, index) => (
            <Card key={index} data={card || {}} loading={loading} />
          ))}
        </div>

        {/* Staff Attendance Overview */}
        <div className="dashboard-row">
          <div className="dashboard-row-heading mb-4">
            <h1 className="dashboard-overview text-xl font-bold">
              {loading ? <Skel w={180} h={20} /> : "Staff Overview"}
            </h1>
          </div>

          <div className="dashboard-table-wrapper flex gap-3 flex-col md:flex-row">
            <div className="staff-attendance bg-white rounded-2xl shadow-md p-6 flex-1">
              <h2 className="text-lg font-semibold mb-5">
                {loading ? <Skel w={120} h={18} /> : "Attendance"}
              </h2>
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-left font-semibold text-xs">
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right pr-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? Array.from({ length: staffData.length }) : staffData).map((row, i) => (
                    <tr key={row?.label ?? i} className="border-b last:border-b-0">
                      <td className="flex items-center gap-3 py-3">
                        <span className="p-2 rounded-lg bg-gray-100">
                          {loading ? <SkelCircle size={20} /> : row.icon}
                        </span>
                        <span className="font-medium">
                          {loading ? <Skel w={100} h={14} /> : row.label}
                        </span>
                      </td>
                      <td className="text-right font-semibold text-gray-700 pr-2">
                        {loading ? <Skel w={24} h={14} /> : row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Staff Assigned Cargo Table */}
        <div className="dashboard-cargo-list mt-10">
          <div className="dashboard-cargo-list-heading mb-3">
            <h1 className="text-lg font-bold">
              {loading ? <Skel w={190} h={18} /> : "Assigned Shipments"}
            </h1>
          </div>

          <div className="dashboard-cargo-table rounded-2xl shadow-md bg-white px-6 py-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 font-semibold">
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Shipment ID</th>
                  <th className="py-2 text-left">Destination</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Type</th>
                </tr>
              </thead>
              <tbody>
                {(loading ? Array.from({ length: 3 }) : assignedCargo).map((item, i) => ( // Assuming 3 for skeleton
                  <tr key={item?.shipmentId ?? i} className="border-t last:border-b-0 hover:bg-gray-50 transition">
                    <td className="py-2">{loading ? <Skel w={70} /> : item.date}</td>
                    <td className="py-2 font-medium">{loading ? <Skel w={140} /> : item.shipmentId}</td>
                    <td className="py-2">{loading ? <Skel w={160} /> : item.destination}</td>
                    <td className="py-2">
                      {loading ? (
                        <Skel w={120} h={20} rounded={999} />
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${item.statusColor}`}
                        >
                          <FaCircle className="w-2 h-2" /> {item.status}
                        </span>
                      )}
                    </td>
                    <td className="py-2">{loading ? <Skel w={90} /> : item.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <button
                className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <FaChevronLeft className="w-3 h-3" /> Prev
              </button>
              <span className="text-gray-600 text-sm">
                {loading ? <Skel w={70} /> : `Page ${page} of ${TOTAL_PAGES}`}
              </span>
              <button
                className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
                disabled={page >= TOTAL_PAGES || loading}
                onClick={() => setPage((p) => p + 1)}
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

export default StaffDashboard;
