// src/features/Dashboard/StaffDashboard.jsx
import React, { useEffect, useState } from "react";
import {
  FaUserCheck,
  FaUserTimes,
  FaUserMinus,
  FaExchangeAlt,
  FaBox,
} from "react-icons/fa";
import { RiMailSendFill, RiUserReceivedFill } from "react-icons/ri";
import "../Styles/Styles.css"; 
import { getCounters } from "../../services/coreService";

// Constants for better maintainability
const TOTAL_PAGES = 1; 

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
  const [stats, setStats] = useState({
    totalCargos: 0,
    totalSenders: 0,
    totalReceivers: 0
  });

  useEffect(() => {
    let alive = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getCounters();
        if (alive && res) {
          // coreService: totalConsignees = Senders, totalReceivers = Receivers
          // totalCargos = software + physical
          const software = Number(res.softwareShipmentsToday || 0);
          const physical = Number(res.physicalShipmentsToday || 0);
          
          setStats({
            totalCargos: software + physical,
            totalSenders: Number(res.totalConsignees || 0),
            totalReceivers: Number(res.totalReceivers || 0)
          });
        }
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchData();
    return () => { alive = false; };
  }, []);

  // Summary cards based on your request
  const staffCards = [
    { title: "Total Cargos", value: stats.totalCargos, icon: <FaBox /> },
    { title: "Senders", value: stats.totalSenders, icon: <RiMailSendFill /> },
    { title: "Receivers", value: stats.totalReceivers, icon: <RiUserReceivedFill /> },
  ];

  return (
    <section className="dashboard min-h-screen">
      <div className="dashboard-container w-full mx-auto">
        
        {/* KPI Cards (Total Cargos, Sender, Receiver) */}
        <div className="dashboard-row grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ">
          {(loading ? Array.from({ length: 3 }) : staffCards).map((card, index) => (
            <Card key={index} data={card || {}} loading={loading} />
          ))}
        </div>

  </div>

    </section>
  );
};

export default StaffDashboard;