import React, { useEffect, useMemo, useState } from "react";
import { getShipmentMethods } from "../../api/shipmentMethodApi";
import { Link } from "react-router-dom";

// Utility function to join class names
function classNames(...cls) {
  return cls.filter(Boolean).join(" ");
}

// Spinner Component
const Spinner = ({ className = "h-4 w-4 text-indigo-600" }) => (
  <svg
    className={classNames("animate-spin", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

// Badge Component for Status
const Badge = ({ ok }) => (
  <span
    className={classNames(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      ok
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
        : "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-400/20"
    )}
  >
    <span
      className={classNames(
        "mr-1 h-1.5 w-1.5 rounded-full",
        ok ? "bg-emerald-500" : "bg-gray-400"
      )}
    />
    {ok ? "Active" : "Inactive"}
  </span>
);

export default function ShipmentMethodView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch shipment methods
  const fetchRows = async () => {
    setLoading(true);
    setMsg({ text: "", variant: "" });
    try {
      const params = {};
      if (statusFilter === "1" || statusFilter === "0") {
        params.status = Number(statusFilter); // -> ?status=1 or ?status=0
      }
      const list = await getShipmentMethods(params); // No token check needed
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      
      setMsg({
        text: err?.response?.data?.message || "Failed to load shipment methods.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]); // Refetch when the filter changes

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r?.name ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  const skeletonRows = Array.from({ length: 6 });

  return (
    <section className="mx-auto max-w-6xl p-4">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">Shipment Methods</h1>

          <div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
            <label className="relative w-full sm:max-w-xs">
              <span className="sr-only">Search by name</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
              <svg
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </label>

            <label className="relative">
              <span className="sr-only">Filter by status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-w-[9rem] appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                title="Filter by status"
              >
                <option value="all">All</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
              <svg
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
              </svg>
            </label>

            <div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fetchRows}
                disabled={loading}
                className={classNames(
                  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition",
                  "hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/20",
                  loading && "opacity-60"
                )}
              >
                {loading ? (<><Spinner className="h-4 w-4 text-white" /> Refreshing…</>) : (<>
                  {/* refresh icon */} Refresh
                </>)}
              </button>

              <Link
                to="/shipmentmethod/create"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                     fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 4.5a.75.75 0 01.75.75v6h6a.75.75 0 010 1.5h-6v6a.75.75 0 01-1.5 0v-6h-6a.75.75 0 010-1.5h6v-6A.75.75 0 0112 4.5z"/>
                </svg>
                Add New
              </Link>
            </div>
          </div>
        </div>

        {/* Messages */}
        {msg.text ? (
          <div
            role="status"
            className={classNames(
              "m-4 rounded-xl border px-3 py-2 text-sm",
              msg.variant === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            )}
          >
            {msg.text}
          </div>
        ) : null}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-700">
              <tr className="border-b border-gray-200">
                <th className="w-16 px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="w-36 px-4 py-3 font-semibold">Status</th>
                <th className="w-44 px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading
                ? skeletonRows.map((_, i) => (
                    <tr key={`sk-${i}`} className="animate-pulse">
                      <td className="px-4 py-4">
                        <div className="h-4 w-6 rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-56 rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-5 w-24 rounded-full bg-gray-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-8 w-24 rounded bg-gray-200" />
                      </td>
                    </tr>
                  ))
                : filtered.length === 0
                ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                        No shipment methods found.
                      </td>
                    </tr>
                  )
                : (
                    filtered.map((r, idx) => {
                      const isActive = String(r?.status) === "1" || String(r?.status).toLowerCase() === "active";
                      return (
                        <tr
                          key={r?.id ?? idx}
                          className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50/40 transition-colors"
                        >
                          <td className="px-4 py-4 text-gray-700">{idx + 1}</td>
                          <td className="px-4 py-4 text-gray-900">{r?.name ?? "-"}</td>
                          <td className="px-4 py-4"><Badge ok={isActive} /></td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(r)}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 hover:shadow focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.8}
                                  stroke="currentColor"
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.65-1.65a1.875 1.875 0 112.652 2.652l-11 11a4.5 4.5 0 01-1.897 1.13l-3.288.94a.375.375 0 01-.46-.46l.94-3.288a4.5 4.5 0 011.13-1.897l10.273-10.273z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
                                </svg>
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
