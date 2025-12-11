import React, { useEffect, useState } from "react";
import { FaBox } from "react-icons/fa";
import { RiMailSendFill, RiUserReceivedFill } from "react-icons/ri";
import "../Styles/Styles.css"; 
import { getCounters } from "../../services/coreService"; 

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
        // 1. Fetch API Data
        const res = await getCounters();
        
        // 2. Get Logged-In User
        const userStored = localStorage.getItem("user");
        let user = userStored ? JSON.parse(userStored) : null;
        
        // Handle potential nested user structure
        if (user && user.data) user = user.data;

        // 3. ROBUST ID EXTRACTION (Fixes the issue)
        // Check role_id, role.id, or role (if primitive)
        const rawRole = 
          user?.role_id ?? 
          user?.roleId ?? 
          (typeof user?.role === 'object' ? user?.role?.id : user?.role);
        
        const roleId = Number(rawRole || 0);

        // Check branch_id, branch.id, or branch (if primitive)
        const rawBranch = 
          user?.branch_id ?? 
          user?.branchId ?? 
          (typeof user?.branch === 'object' ? user?.branch?.id : user?.branch);

        const userBranchId = String(rawBranch || "");

        if (alive && res) {
          let displayedCargoCount = 0;

          if (roleId === 1) {
             // SUPER ADMIN (ID 1): Show Global Total
             displayedCargoCount = Number(res.totalCargos || 0);
          } 
          else if (userBranchId) {
             // STAFF: Filter by Branch ID
             const branchCounts = res.branchWiseCargos || [];
             const myBranchData = branchCounts.find(
               (b) => String(b.branch_id) === userBranchId
             );

             if (myBranchData) {
               displayedCargoCount = Number(myBranchData.total);
             } else {
               displayedCargoCount = 0;
             }
          } 
          else {
             displayedCargoCount = 0;
          }

          setStats({
            totalCargos: displayedCargoCount,
            totalSenders: Number(res.totalConsignees || 0),
            totalReceivers: Number(res.totalReceivers || 0)
          });
        }
      } catch (error) {
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchData();
    return () => { alive = false; };
  }, []);

  const staffCards = [
    { title: "Total Cargos", value: stats.totalCargos, icon: <FaBox /> },
    { title: "Senders", value: stats.totalSenders, icon: <RiMailSendFill /> },
    { title: "Receivers", value: stats.totalReceivers, icon: <RiUserReceivedFill /> },
  ];

  return (
    <section className="dashboard min-h-screen">
      <div className="dashboard-container w-full mx-auto">
        <div className="dashboard-row grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ">
          {(loading ? Array.from({ length: 3 }) : staffCards).map((card, index) => (
            <Card key={index} data={card || {}} loading={loading} />
          ))}
        </div>
      </div>
      
      {/* Shimmer Styles */}
      <style>{`
        .skel {
          background: #e5e7eb;
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
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  );
};

export default StaffDashboard;