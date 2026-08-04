import React, { memo, useMemo } from "react";
import { useSelector } from "react-redux";
import { FaBox } from "react-icons/fa";
import { RiMailSendFill, RiUserReceivedFill } from "react-icons/ri";
import useDashboardCounters from "./useDashboardCounters";
import { getUserBranchId } from "./dashboardData";
import KpiCharts from "./KpiCharts";
import "../Styles/Styles.css";

const cards = [
  ["totalCargos", "Total Cargos", FaBox],
  ["totalSenders", "Senders", RiMailSendFill],
  ["totalReceivers", "Receivers", RiUserReceivedFill],
];

const MetricCard = memo(function MetricCard({ title, value, iconComponent, loading }) {
  return (
    <article className="dashboard-card flex items-center gap-4 border border-slate-200 bg-white shadow-sm">
      <div className="card-icon shrink-0">{React.createElement(iconComponent, { "aria-hidden": true })}</div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{loading ? "—" : value.toLocaleString()}</p>
        <p className="text-sm text-slate-500">{title}</p>
      </div>
    </article>
  );
});

export default function StaffDashboard() {
  const user = useSelector((state) => state.auth?.user);
  const { data, isLoading, isFetching, error, refetch } = useDashboardCounters();
  const branchId = getUserBranchId(user);

  const stats = useMemo(() => {
    const branch = data?.branchWiseCargos.find((item) => item.branch_id === branchId);
    return {
      totalCargos: branch?.total || 0,
      totalSenders: data?.totalConsignees || 0,
      totalReceivers: data?.totalReceivers || 0,
    };
  }, [data, branchId]);

  return (
    <section className="dashboard min-h-full" aria-busy={isFetching}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Your branch performance at a glance</p></div>
        <button onClick={() => refetch()} disabled={isFetching} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-50">{isFetching ? "Refreshing…" : "Refresh"}</button>
      </div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Dashboard data could not be loaded. Please try again.</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([key, title, iconComponent]) => <MetricCard key={key} title={title} value={stats[key]} iconComponent={iconComponent} loading={isLoading} />)}
      </div>
      {!isLoading && data && <KpiCharts counters={{ ...data, branchWiseCargos: data.branchWiseCargos.filter((item) => item.branch_id === branchId) }} showBranches={false} />}
    </section>
  );
}
