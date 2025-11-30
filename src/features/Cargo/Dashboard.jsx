import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBoxes,
  FaShippingFast,
  FaUsers,
  FaUserTie,
  FaBuilding,
  FaCar,
  FaFileInvoiceDollar,
} from "react-icons/fa";

// --- API Imports ---
// Note: These paths are assumed based on your project structure.
// You may need to adjust them if your API files are located elsewhere.
import { getPhysicalBills } from "../api/billApi";
import { getBillShipments } from "../api/billShipmentApi";
import { getPartiesByCustomerType } from "../api/partiesApi";
import { getActiveDrivers } from "../api/driverApi";
import { getAllStaff } from "../api/staffApi";
import { getAllBranches } from "../api/branchesApi";
import { getCargoList } from "../api/createCargoApi";

const StatCard = ({ icon, title, value, link, loading, color }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    indigo: "from-indigo-500 to-indigo-600",
    purple: "from-purple-500 to-purple-600",
    pink: "from-pink-500 to-pink-600",
    sky: "from-sky-500 to-sky-600",
    teal: "from-teal-500 to-teal-600",
  };

  return (
    <Link
      to={link}
      className={`block p-6 rounded-2xl bg-gradient-to-br ${
        colorClasses[color] || colorClasses.blue
      } text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-lg font-medium uppercase tracking-wider opacity-80">
            {title}
          </p>
          {loading ? (
            <div className="h-10 w-24 bg-white/20 animate-pulse rounded-md" />
          ) : (
            <p className="text-4xl font-bold">{value}</p>
          )}
        </div>
        <div className="text-5xl opacity-30">{icon}</div>
      </div>
    </Link>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    cargos: 0,
    bills: 0,
    shipmentBills: 0,
    customers: 0,
    staff: 0,
    drivers: 0,
    branches: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAllStats = async () => {
      setLoading(true);
      setError("");
      try {
        const results = await Promise.allSettled([
          getCargoList(),
          getPhysicalBills(),
          getBillShipments(),
          getPartiesByCustomerType(0), // Assuming 0 or no arg fetches all customers
          getAllStaff(),
          getActiveDrivers(),
          getAllBranches(),
        ]);

        const getLength = (res) => {
            if (res.status !== 'fulfilled' || !res.value) return 0;
            const data = res.value.data?.data || res.value.data || res.value;
            return Array.isArray(data) ? data.length : 0;
        };

        setStats({
          cargos: getLength(results[0]),
          bills: getLength(results[1]),
          shipmentBills: getLength(results[2]),
          customers: getLength(results[3]),
          staff: getLength(results[4]),
          drivers: getLength(results[5]),
          branches: getLength(results[6]),
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard statistics. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
  }, []);

  const cardData = [
    {
      title: "Total Cargos",
      value: stats.cargos,
      icon: <FaBoxes />,
      link: "/cargo/allcargolist",
      color: "indigo",
    },
    {
      title: "Physical Bills",
      value: stats.bills,
      icon: <FaFileInvoiceDollar />,
      link: "/bills/view",
      color: "green",
    },
    {
      title: "Shipment Bills",
      value: stats.shipmentBills,
      icon: <FaShippingFast />,
      link: "/bills-shipments/list",
      color: "sky",
    },
    {
      title: "Customers",
      value: stats.customers,
      icon: <FaUsers />,
      link: "/customers",
      color: "purple",
    },
    {
      title: "Staff Members",
      value: stats.staff,
      icon: <FaUserTie />,
      link: "/hr&staff/allstaffs",
      color: "pink",
    },
    {
      title: "Active Drivers",
      value: stats.drivers,
      icon: <FaCar />,
      link: "/drivers/alldriverslist",
      color: "teal",
    },
    {
      title: "Branches",
      value: stats.branches,
      icon: <FaBuilding />,
      link: "/branches",
      color: "blue",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-lg text-gray-600">
          Welcome! Here's a quick overview of your operations.
        </p>
      </header>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cardData.map((card) => (
          <StatCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            value={stats[card.title.toLowerCase().replace(" ", "")]}
            link={card.link}
            loading={loading}
            color={card.color}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;