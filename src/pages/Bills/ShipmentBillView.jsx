import React, { useEffect, useMemo, useState } from "react";
import {
  getBillShipments,
  updateBillShipmentStatuses,
  deleteBillShipments,
} from "../../api/billShipmentApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";

// --- Helpers ---
const unwrapArray = (o) =>
  Array.isArray(o)
    ? o
    : Array.isArray(o?.data?.data)
    ? o.data.data
    : Array.isArray(o?.data)
    ? o.data
    : Array.isArray(o?.items)
    ? o.items
    : Array.isArray(o?.results)
    ? o.results
    : [];

const statusPill = (s) => {
  const v = String(s || "").toLowerCase();
  if (v.includes("delivered") || v.includes("completed") || v.includes("received") || v.includes("cleared")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (v.includes("cancel") || v.includes("rejected") || v.includes("fail") || v.includes("returned")) {
    return "bg-rose-100 text-rose-800 border-rose-200";
  }
  if (v.includes("pending") || v.includes("draft") || v.includes("new") || v.includes("booked") || v.includes("scheduled")) {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  if (v.includes("transit") || v.includes("shipped") || v.includes("progress") || v.includes("manifest") || v.includes("departed") || v.includes("arrived")) {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (v.includes("hold") || v.includes("customs") || v.includes("review") || v.includes("exception")) {
    return "bg-purple-100 text-purple-800 border-purple-200";
  }
  return "bg-slate-100 text-slate-800 border-slate-200";
};

const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ShipmentBillView() {
  const navigate = useNavigate();
  
  // --- State ---
  const [q, setQ] = useState("");
  const [statusId, setStatusId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  // Data & Selection
  const [statuses, setStatuses] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [savingBulk, setSavingBulk] = useState(false);
  
  // Active filters applied to API
  const [filters, setFilters] = useState({});

  // --- Load Statuses on Mount ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getActiveShipmentStatuses();
        if(mounted) setStatuses(unwrapArray(res));
      } catch (e) {
        console.warn("[UI] statuses load error", e?.message);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // --- Fetch Data when Filters Change ---
  useEffect(() => {
    refresh(filters);
  }, [filters]);

  const applyFilters = () => {
    const newFilters = {};
    if (q.trim()) newFilters.search = q.trim();
    if (statusId) newFilters.shipment_status_id = statusId;
    if (dateFrom) newFilters.date_from = dateFrom;
    if (dateTo) newFilters.date_to = dateTo;
    setPage(1); // Reset to page 1 on filter change
    setFilters(newFilters);
  };

  const refresh = async (params = filters) => {
    setLoading(true);
    setErr("");
    try {
      const data = await getBillShipments(params);
      const list = unwrapArray(data);
      setRows(list);
    } catch (e) {
      setErr(e?.message || "Failed to load shipments.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setQ("");
    setStatusId("");
    setDateFrom("");
    setDateTo("");
    setFilters({});
    setPage(1);
  };

  // --- Pagination Logic ---
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  // --- Selection Logic ---
  const toggleRow = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const numericId = Number(id);
      if (checked) next.add(numericId);
      else next.delete(numericId);
      return next;
    });
  };

  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selectedIds.has(Number(r.id)));

  const toggleSelectAllPage = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r) => {
        const id = Number(r.id);
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  // --- Actions ---

  const handleBulkUpdate = async () => {
    if (!bulkStatusId || selectedIds.size === 0) return;
    
    // 1. Find the status object for the success message and local update
    const targetStatus = statuses.find(s => String(s.id) === String(bulkStatusId));
    const statusName = targetStatus ? targetStatus.name : "Unknown Status";

    setSavingBulk(true);
    setErr("");
    const ids = [...selectedIds].map(Number);

    try {
      // 2. Call API
      await updateBillShipmentStatuses(ids, Number(bulkStatusId));
      
      // 3. Optimistic Update: Update local state immediately (Fast UI)
      setRows(prevRows => prevRows.map(row => {
        if (ids.includes(Number(row.id))) {
          return {
            ...row,
            // Update the status object structure to match what the table renders
            status: targetStatus || row.status, 
            shipment_status_id: Number(bulkStatusId)
          };
        }
        return row;
      }));

      // 4. Show correct toast
      toast.success(`Successfully updated ${ids.length} shipment(s) to '${statusName}'.`);
      
      // 5. Clean up
      setSelectedIds(new Set());
      setBulkStatusId("");
      
    } catch (e) {
      console.error("Update error:", e);
      setErr(e?.message || "Failed to update status.");
      toast.error(e?.response?.data?.message || "Failed to update status.");
      // Only refresh from server if the optimistic update failed
      refresh(filters); 
    } finally {
      setSavingBulk(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shipment?")) return;
    try {
      await deleteBillShipments([id]);
      // Optimistic delete
      setRows((prevRows) => prevRows.filter((row) => row.id !== id));
      toast.success("Shipment deleted successfully!");
    } catch (e) {
      console.error("Delete failed:", e);
      toast.error(e?.response?.data?.message || "Failed to delete shipment.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error("No shipments selected for deletion.");
      return;
    }
    if (!window.confirm(`Delete all ${selectedIds.size} selected shipments?`)) return;
    
    const idsToDelete = [...selectedIds];
    try {
      await deleteBillShipments(idsToDelete);
      // Optimistic delete
      setRows((prevRows) => prevRows.filter((row) => !idsToDelete.includes(Number(row.id))));
      setSelectedIds(new Set());
      toast.success(`Deleted ${idsToDelete.length} shipment(s) successfully!`);
    } catch (e) {
      console.error("Bulk delete failed:", e);
      toast.error(e?.response?.data?.message || "Bulk delete failed.");
    }
  };

  return (
    <div className="w-full mx-auto px-4 py-5">
      <Toaster position="top-right" reverseOrder={false} />
      
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Shipments</h2>
          <div className="text-gray-500">Physical shipments list</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-white p-3 md:p-4 shadow-sm mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search number, AWB, port..."
            className="border rounded-lg px-3 py-2 flex-1 min-w-[200px] focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <select
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <button
            onClick={resetFilters}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 transition"
          >
            Reset
          </button>
          <button
            onClick={applyFilters}
            className="px-3 py-2 rounded-lg border bg-gray-900 text-white hover:bg-black transition"
          >
            Apply
          </button>
        </div>

        {/* Bulk actions toolbar */}
        <div className="mt-3 border-t pt-3 flex flex-wrap items-center gap-3">
          <div className="text-sm text-gray-600 min-w-[80px]">
            Selected: <b>{selectedIds.size}</b>
          </div>
          
          <div className="flex items-center gap-2">
            <select
                value={bulkStatusId}
                onChange={(e) => setBulkStatusId(e.target.value)}
                disabled={selectedIds.size === 0}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-200 outline-none disabled:bg-gray-100"
            >
                <option value="">Select status to update...</option>
                {statuses.map((s) => (
                <option key={s.id} value={String(s.id)}>
                    {s.name}
                </option>
                ))}
            </select>

            <button
                onClick={handleBulkUpdate}
                disabled={!bulkStatusId || selectedIds.size === 0 || savingBulk}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
                {savingBulk ? "Updating..." : "Update Status"}
            </button>
          </div>

          <button
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0}
              className="ml-auto px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Bulk Delete
            </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="relative min-h-[200px]">
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 backdrop-blur-[1px]">
              <div className="px-4 py-2 rounded-full bg-white shadow-lg border text-gray-600 text-sm font-medium animate-pulse">
                Loading Data...
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr className="text-left text-gray-700 text-sm">
                  <th className="py-3 px-3 border-b w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={(e) => toggleSelectAllPage(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="py-3 px-3 border-b">SL</th>
                  <th className="py-3 px-3 border-b">Shipment No</th>
                  <th className="py-3 px-3 border-b">AWB / Container</th>
                  <th className="py-3 px-3 border-b">Origin</th>
                  <th className="py-3 px-3 border-b">Destination</th>
                  <th className="py-3 px-3 border-b">Method</th>
                  <th className="py-3 px-3 border-b text-center">Items</th>
                  <th className="py-3 px-3 border-b">Created On</th>
                  <th className="py-3 px-3 border-b">Status</th>
                  <th className="py-3 px-3 border-b text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl">📦</span>
                        <span>No shipments found for the selected filters.</span>
                      </div>
                    </td>
                  </tr>
                )}

                {pageRows.map((r, idx) => {
                    const id = Number(r.id);
                    const sl = (page - 1) * pageSize + idx + 1;
                    // Handle status being an object OR a string/null safely
                    const statusName = r?.status?.name || r?.status || "Pending";
                    const itemsCount = Array.isArray(r?.custom_shipments)
                      ? r.custom_shipments.length
                      : 0;
                    const checked = selectedIds.has(id);

                    return (
                      <tr
                        key={id}
                        className={`hover:bg-gray-50 transition-colors ${checked ? 'bg-indigo-50/50' : ''}`}
                      >
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleRow(id, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="py-2 px-3 text-gray-500">{sl}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">
                          {r.shipment_number || "—"}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {r.awb_or_container_number || "—"}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {r?.origin_port?.name || "—"}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {r?.destination_port?.name || "—"}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {r?.shipping_method?.name || "—"}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-600">{itemsCount}</td>
                        <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                          {fmtDateTime(r.created_at)}
                        </td>
                      <td className="py-2 px-3">
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusPill(statusName)}`}
                          >
                            {statusName}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              title="View"
                              onClick={() => navigate(`/billshipment/${r.id}`)}
                              className="p-1.5 rounded-md text-indigo-600 hover:bg-indigo-50 transition"
                            >
                              <FaEye className="w-4 h-4" />
                            </button>
                            <button
                                title="Edit"
                                onClick={() => navigate(`/billshipment/${r.id}/edit`)}
                                className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 transition"
                            >
                                <FaEdit className="w-4 h-4" />
                            </button>
                           <button
                              title="Delete"
                              onClick={() => handleDelete(r.id)}
                              className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 border-t bg-gray-50/50">
            <div>
              Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span> 
              <span className="mx-2 text-gray-300">|</span>
              Total: {rows.length}
              {err && <span className="text-rose-600 ml-3 font-medium">{err}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white transition shadow-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
              <button
                className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white transition shadow-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}