import React from "react";
import { FaBoxOpen, FaClock, FaTruck, FaUsers } from "react-icons/fa";
import useDashboardCounters from "./useDashboardCounters";
import KpiCharts from "./KpiCharts";
import "../Styles/Styles.css";

export default function AgencyDashboard() {
  const { data, isLoading, isFetching, error, refetch } = useDashboardCounters();
  const totalShipments = (data?.softwareShipmentsToday || 0) + (data?.physicalShipmentsToday || 0);
  const metrics = [
    ["Total Shipments", totalShipments, FaBoxOpen],
    ["Out for Delivery", data?.outForDelivery || 0, FaTruck],
    ["Pending Clearance", data?.waitingForClearance || 0, FaClock],
    ["Total Clients", (data?.totalConsignees || 0) + (data?.totalReceivers || 0), FaUsers],
  ];

  return (
    <section className="dashboard min-h-full" aria-busy={isFetching}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Agency Dashboard</h1><p className="mt-1 text-sm text-slate-500">Live shipment and client overview</p></div>
        <button onClick={() => refetch()} disabled={isFetching} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-50">{isFetching ? "Refreshing…" : "Refresh"}</button>
      </div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Dashboard data could not be loaded. Please try again.</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([title, value, iconComponent]) => (
          <article key={title} className="dashboard-card flex items-center gap-4 border border-slate-200 bg-white shadow-sm">
            <div className="card-icon shrink-0">{React.createElement(iconComponent, { "aria-hidden": true })}</div>
            <div><p className="text-2xl font-bold text-slate-900">{isLoading ? "—" : value.toLocaleString()}</p><p className="text-sm text-slate-500">{title}</p></div>
          </article>
        ))}
      </div>
      {!isLoading && data && <KpiCharts counters={data} />}
    </section>
  );
}
