import React, { useEffect, useMemo, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { LuSearch } from "react-icons/lu";
import { getAllDeliveryTypes } from "../../api/deliveryType"; 
import CreateDeliveryType from "./components/CreateDeliveryType";
import { Toaster } from "react-hot-toast";
import Modal from "./components/Modal";

/* -------- UI bits -------- */
function StatusPill({ status = "Inactive" }) {
  const isActive = String(status).toLowerCase() === "active";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
      isActive
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
        : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
    }`}>
      <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

const Skel = ({ w = 100, h = 14, rounded = 8, className = "" }) => (
  <span
    className={`animate-pulse bg-slate-200/70 ${className}`}
    style={{ display: "inline-block", width: typeof w === "number" ? `${w}px` : w, height: typeof h === "number" ? `${h}px` : h, borderRadius: rounded }}
  />
);

export default function ListDeliveryType() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState([]);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(10);
  const [page, setPage] = useState(1);

  const [openCreate, setOpenCreate] = useState(false);

  const refresh = async () => {
     // extract your existing fetch logic into a function and reuse:
     try {
       setLoading(true);
       const res = await getAllDeliveryTypes();
       setData(res?.data ?? []);
       setErr("");
     } catch {
       setErr("Failed to load delivery types.");
     } finally {
       setLoading(false);
     }
   };

   const handleCreated = () => {
     // after a successful create, refresh table
     refresh();
   };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getAllDeliveryTypes(); // expects { success, data: [...] }
        if (!cancelled) {
          setData(res?.data ?? []);
          setErr("");
        }
      } catch (e) {
        if (!cancelled) setErr("Failed to load delivery types.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter(
      (d) =>
        String(d.id).includes(q) ||
        d.name?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.status?.toLowerCase().includes(q)
    );
  }, [data, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rows));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * rows;
  const pageData = filtered.slice(start, start + rows);

  useEffect(() => setPage(1), [rows, query]);

  return (
    <div className="mx-auto max-w-6xl ">
      {/* Header card (white, subtle border & radius) */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="px-4 py-4 md:px-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Title */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Delivery Type List</h2>
              <p className="text-sm text-slate-500">Manage delivery types and status.</p>
            </div>

            {/* Controls (search, rows, add) */}
            <div className="flex items-center gap-3">
              {/* Search pill */}
              <div className="relative">
                <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, description or status…"
                  className="h-10 w-80 rounded-full border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-0"
                />
              </div>

              {/* Rows dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Rows</label>
                <select
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none"
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value))}
                >
                  {[5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Add button (purple like screenshot) */}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-800"
                onClick={() => setOpenCreate(true)}
              >
                <FiPlus className="text-base" />
                Add Delivery Type
              </button>
            </div>
          </div>
        </div>

        {/* Divider line under header */}
        <div className="h-px bg-slate-200" />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse bg-white">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3 border-b border-slate-200 w-16">#</th>
                <th className="px-6 py-3 border-b border-slate-200">Name</th>
                {/* <th className="px-6 py-3 border-b border-slate-200">Description</th> */}
                <th className="px-6 py-3 border-b border-slate-200">Status</th>
                {/* <th className="px-6 py-3 border-b border-slate-200 text-right w-20">Actions</th> */}
              </tr>
            </thead>

            <tbody>
              {/* Loading skeleton rows */}
              {loading &&
                Array.from({ length: rows }).map((_, i) => (
                  <tr key={`skel-${i}`} className="bg-white">
                    <td className="px-6 py-4 border-b border-slate-100"><Skel w={20} /></td>
                    <td className="px-6 py-4 border-b border-slate-100"><Skel w={160} /></td>
                    <td className="px-6 py-4 border-b border-slate-100"><Skel w={260} /></td>
                    <td className="px-6 py-4 border-b border-slate-100"><Skel w={80} /></td>
                    <td className="px-6 py-4 border-b border-slate-100 text-right">
                      <Skel w={28} h={28} rounded={14} className="inline-block" />
                    </td>
                  </tr>
                ))}

              {/* Error */}
              {!loading && err && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-rose-600">
                    {err}
                  </td>
                </tr>
              )}

              {/* Empty */}
              {!loading && !err && pageData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                    No delivery types found.
                  </td>
                </tr>
              )}

              {/* Rows */}
              {!loading && !err && pageData.map((row, idx) => (
                <tr key={row.id} className="bg-white">
                  <td className="px-6 py-4 text-sm text-slate-600 border-b border-slate-100">
                    {start + idx + 1}
                  </td>
                  <td className="px-6 py-4 border-b border-slate-100">
                    <div className="text-sm font-medium text-slate-800">{row.name}</div>
                    {/* {row.id != null && (
                      <div className="text-xs text-slate-500 mt-0.5">ID: {row.id}</div>
                    )} */}
                  </td>
                  {/* <td className="px-6 py-4 text-sm text-slate-600 border-b border-slate-100">
                    {row.description || "—"}
                  </td> */}
                  <td className="px-6 py-4 border-b border-slate-100">
                    <StatusPill status={row.status} />
                  </td>
                  {/* <td className="px-6 py-4 border-b border-slate-100">
                    <div className="flex justify-end">
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
                        title="Actions"
                        onClick={() => alert(`Actions for: ${row.name}`)}
                      >
                        <FiMoreVertical />
                      </button>
                    </div>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        {!loading && !err && filtered.length > 0 && (
          <>
            <div className="h-px bg-slate-200" />
            <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-600 md:px-6 bg-white rounded-b-xl">
              <div>
                Showing{" "}
                <span className="font-medium">
                  {start + 1}-{Math.min(start + rows, filtered.length)}
                </span>{" "}
                of <span className="font-medium">{filtered.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  Prev
                </button>
                <span className="px-2">
                  Page <b>{currentPage}</b> / {totalPages}
                </span>
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

 <Toaster
        position="top-right"
        toastOptions={{
          success: { style: { background: "#10b981", color: "#fff" } },
          error: { style: { background: "#ef4444", color: "#fff" } },
          loading: { style: { background: "#111827", color: "#fff" } },
        }}
      />

         <Modal
         open={openCreate}
         title="Create Delivery Type"
         onClose={() => setOpenCreate(false)}
       >
         <CreateDeliveryType
           onClose={() => setOpenCreate(false)}
           onCreated={handleCreated}
         />
       </Modal>
      </div>
    </div>
  );
}
