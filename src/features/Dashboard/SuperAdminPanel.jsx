// src/pages/SuperAdminPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  FaTruck,
  FaUsers,
  FaTruckLoading
} from "react-icons/fa";
import { RiMailSendFill, RiUserReceivedFill } from "react-icons/ri";
import { PiBuildingOfficeFill } from "react-icons/pi";
import { TbTruckDelivery, TbClockHour4 } from "react-icons/tb";
import { BsCollectionFill } from "react-icons/bs";
import "../Styles/Styles.css";
import { getCounters,} from "../../services/coreService";

/* ---------------- Utility ---------------- */
const num = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);

/* ---------------- Skeleton Loader ---------------- */
const SkelLine = ({ w = 100, h = 14, className = "" }) => (
  <span
    className={`skel ${className}`}
    style={{
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      display: "inline-block",
      borderRadius: 6,
    }}
    aria-hidden="true"
  />
);

/* ---------------- KPI Card ---------------- */
const KPI = ({ value, label, Icon, sublabel, loading }) => (
  <div className="dashboard-card bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 flex items-center gap-4">
    <div className="card-icon shrink-0 w-11 h-11 rounded-xl bg-red-500 text-white grid place-items-center">
      <Icon className="text-xl" />
    </div>
    <div className="min-w-0">
      <div className="text-xl font-semibold leading-none truncate">
        {loading ? <SkelLine w={80} h={22} /> : value}
      </div>
      <div className="text-gray-600 text-sm">
        {loading ? <SkelLine w={120} h={12} /> : label}
      </div>
      {sublabel ? (
        <div className="text-gray-400 text-xs mt-1">
          {loading ? <SkelLine w={100} h={10} /> : sublabel}
        </div>
      ) : null}
    </div>
  </div>
);

/* ---------------- Main Page ---------------- */
export default function SuperAdminPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [counters, setCounters] = useState({
    totalStaff: 0,
    totalBranches: 0,
    totalConsignees: 0,
    totalReceivers: 0,
    softwareShipmentsToday: 0,
    physicalShipmentsToday: 0,
    outForDelivery: 0,
    enquiriesCollected: 0,
    staffPresent: 0,
    staffAbsent: 0,
    staffPartial: 0,
    movingPending: 0,
    waitingForClearance: 0,
  });

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchCounters = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await getCounters(); // includes branch counter API
        setCounters({
          totalStaff: num(res?.totalStaff),
          totalBranches: num(res?.totalBranches), // ✅ /branches-counts included
          totalConsignees: num(res?.totalConsignees),
          totalReceivers: num(res?.totalReceivers),
          softwareShipmentsToday: num(res?.softwareShipmentsToday),
          physicalShipmentsToday: num(res?.physicalShipmentsToday),
          outForDelivery: num(res?.outForDelivery),
          enquiriesCollected: num(res?.enquiriesCollected),
          staffPresent: num(res?.staffPresent),
          staffAbsent: num(res?.staffAbsent),
          staffPartial: num(res?.staffPartial),
          movingPending: num(res?.movingPending),
          waitingForClearance: num(res?.waitingForClearance),
        });
      } catch (e) {
        setErr(e?.message || "Failed to load counters");
      } finally {
        setLoading(false);
      }
    };

    fetchCounters();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          {loading ? <SkelLine w={130} h={22} /> : "Dashboard"}
        </h1>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg text-sm bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:pointer-events-none"
          disabled={loading}
        >
          {loading ? <SkelLine w={60} h={14} /> : "Refresh"}
        </button>
      </div>

        {/* Error Message */}
        {err && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
            {err}
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <KPI
            value={counters.softwareShipmentsToday}
            label="Software Shipments Today"
            Icon={FaTruck}
            loading={loading}
          />
          <KPI
            value={counters.physicalShipmentsToday}
            label="Physical Shipments Today"
            Icon={FaTruckLoading}
            loading={loading}
          />
          <KPI
            value={counters.totalConsignees}
            label="Consignee"
            Icon={RiMailSendFill}
            loading={loading}
          />
          <KPI
            value={counters.totalReceivers}
            label="Receiver"
            Icon={RiUserReceivedFill}
            loading={loading}
          />
          <KPI
            value={counters.totalStaff}
            label="Total Staffs"
            Icon={FaUsers}
            loading={loading}
          />
          {/* ✅ NEW BRANCH COUNTER */}
          <KPI
            value={counters.totalBranches}
            label="Total Branches"
            Icon={PiBuildingOfficeFill}
            loading={loading}
          />
          <KPI
            value={counters.outForDelivery}
            label="Out for Delivery"
            Icon={TbTruckDelivery}
            loading={loading}
          />
          <KPI
            value={counters.enquiriesCollected}
            label="Enquiries Collected"
            Icon={BsCollectionFill}
            loading={loading}
          />
          <KPI
            value={counters.waitingForClearance}
            label="Waiting for Clearance"
            Icon={TbClockHour4}
            loading={loading}
          />
        </div>

      {/* Shimmer Animation */}
      <style>{`
        .skel {
          background: #e5e7eb; /* gray-200 */
          position: relative;
          overflow: hidden;
        }
        .skel::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            rgba(229, 231, 235, 0) 0%,
            rgba(255, 255, 255, 0.75) 50%,
            rgba(229, 231, 235, 0) 100%
          );
          animation: skel-shimmer 1.2s infinite;
        }
        @keyframes skel-shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
