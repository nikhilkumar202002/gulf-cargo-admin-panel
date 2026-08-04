import React, { memo, useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const COLORS = ["#312e81", "#ef4444", "#f59e0b", "#10b981"];
const number = (value) => Number(value) || 0;
const formatNumber = (value) => number(value).toLocaleString();

function DonutCenterLabel({ viewBox, total }) {
  const cx = Number(viewBox?.cx ?? (Number(viewBox?.x) + Number(viewBox?.width) / 2));
  const cy = Number(viewBox?.cy ?? (Number(viewBox?.y) + Number(viewBox?.height) / 2));
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return (
    <g>
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-900 text-2xl font-bold">{formatNumber(total)}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" className="fill-slate-400 text-[10px] uppercase tracking-wider">Active</text>
    </g>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-medium text-slate-500">{label || item.name}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color || item.payload?.fill }} />
        <span className="text-lg font-bold text-slate-900">{formatNumber(item.value)}</span>
        <span className="text-xs text-slate-400">items</span>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, badge, children, className = "" }) {
  return (
    <article className={`relative min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:p-6 ${className}`}>
      <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-indigo-50/80 blur-2xl" />
      <header className="relative flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
        {badge && <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">{badge}</span>}
      </header>
      <div className="relative mt-5 h-72" aria-label={title}>{children}</div>
    </article>
  );
}

function KpiCharts({ counters, showBranches = true }) {
  const operations = useMemo(() => [
    { name: "Software", value: number(counters?.softwareShipmentsToday), fill: "#312e81" },
    { name: "Physical", value: number(counters?.physicalShipmentsToday), fill: "#6366f1" },
    { name: "Delivery", value: number(counters?.outForDelivery), fill: "#ef4444" },
    { name: "Clearance", value: number(counters?.waitingForClearance), fill: "#f59e0b" },
  ], [counters]);

  const movement = useMemo(() => [
    { name: "Out for delivery", value: number(counters?.outForDelivery) },
    { name: "Waiting clearance", value: number(counters?.waitingForClearance) },
    { name: "Enquiries collected", value: number(counters?.enquiriesCollected) },
  ], [counters]);

  const branches = useMemo(() => (counters?.branchWiseCargos || [])
    .map((item, index) => ({
      name: item.branch_name || item.name || `Branch ${item.branch_id ?? index + 1}`,
      value: number(item.total ?? item.count),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8), [counters]);

  const movementTotal = movement.reduce((sum, item) => sum + item.value, 0);
  const shipmentTotal = operations[0].value + operations[1].value;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">Analytics</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Operational overview</h2>
        </div>
        <p className="text-xs text-slate-400">Live data from your current KPI counters</p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <ChartCard title="Shipment operations" subtitle="Volume across each operational stage" badge={`${formatNumber(shipmentTotal)} shipments`} className="xl:col-span-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={operations} margin={{ top: 8, right: 8, left: -14, bottom: 2 }} barCategoryGap="30%">
              <defs>
                <linearGradient id="shipmentBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4338ca" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} dy={8} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc", radius: 10 }} />
              <Bar dataKey="value" name="Shipments" fill="url(#shipmentBar)" radius={[10, 10, 3, 3]} maxBarSize={58} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cargo movement" subtitle="Share of active shipment statuses" badge="Current" className="xl:col-span-2">
          {movementTotal > 0 ? (
            <div className="grid h-full grid-cols-1 items-center sm:grid-cols-5 xl:grid-cols-1 2xl:grid-cols-5">
              <div className="h-52 sm:col-span-3 xl:col-span-1 2xl:col-span-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={movement} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={5} cornerRadius={7} stroke="none">
                      {movement.map((item, index) => <Cell key={item.name} fill={COLORS[index]} />)}
                      <Label position="center" content={(props) => <DonutCenterLabel {...props} total={movementTotal} />} />
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                {movement.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[index] }} /><span className="truncate text-xs text-slate-500">{item.name}</span></div>
                    <span className="text-sm font-bold text-slate-800">{formatNumber(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-400">No movement data available</div>}
        </ChartCard>

        {showBranches && branches.length > 0 && (
          <ChartCard title="Cargo by branch" subtitle="Top performing branches by cargo volume" badge={`Top ${branches.length}`} className="xl:col-span-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branches} layout="vertical" margin={{ top: 2, right: 24, left: 14, bottom: 2 }} barCategoryGap="25%">
                <defs><linearGradient id="branchBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#fb7185" /></linearGradient></defs>
                <CartesianGrid strokeDasharray="4 5" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="value" name="Cargo" fill="url(#branchBar)" radius={[3, 10, 10, 3]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </section>
  );
}

export default memo(KpiCharts);
