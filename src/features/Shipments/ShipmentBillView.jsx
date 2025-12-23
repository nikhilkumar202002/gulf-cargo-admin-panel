// src/features/Shipments/ShipmentBillView.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getBillShipments,
  updateBillShipmentStatus,
  deleteBillShipments,
} from "../../services/billShipmentApi";
import { getShipmentStatuses } from "../../services/coreService";
import { FaEye, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import EditShipmentModal from "./EditShipment";

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
  
  // Raw Data from API
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  // Selection & Bulk Actions
  const [statuses, setStatuses] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [savingBulk, setSavingBulk] = useState(false);

  const [editId, setEditId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- Initial Load ---
  useEffect(() => {
    let mounted = true;

    // 1. Load Status Options
    const loadStatuses = async () => {
      try {
        const res = await getShipmentStatuses();
        if(mounted) setStatuses(unwrapArray(res));
      } catch (e) {
        console.warn("[UI] statuses load error", e?.message);
      }
    };

    // 2. Load All Shipments
    const loadShipments = async () => {
      setLoading(true);
      setErr("");
      try {
        // Fetching without filters to get ALL data for client-side filtering
        const data = await getBillShipments({});
        const list = unwrapArray(data);
        if(mounted) setRows(list);
      } catch (e) {
        if(mounted) {
            setErr(e?.message || "Failed to load shipments.");
            setRows([]);
        }
      } finally {
        if(mounted) setLoading(false);
      }
    };

    loadStatuses();
    loadShipments();

    return () => { mounted = false; };
  }, []);


  // --- REAL-TIME FILTERING LOGIC ---
  const filteredRows = useMemo(() => {
    // Reset page to 1 if user starts typing or changes status
    if (page !== 1) setPage(1);

    return rows.filter((row) => {
      // 1. Search Filter (Shipment No, AWB, Ports)
      if (q) {
        const lowerQ = q.toLowerCase().trim();
        const matchesSearch =
          row.shipment_number?.toLowerCase().includes(lowerQ) ||
          row.awb_or_container_number?.toLowerCase().includes(lowerQ) ||
          row?.origin_port?.name?.toLowerCase().includes(lowerQ) ||
          row?.destination_port?.name?.toLowerCase().includes(lowerQ);

        if (!matchesSearch) return false;
      }

      // 2. Status Filter
      if (statusId) {
        const rowStatusId = row.shipment_status_id || row.status?.id;
        if (String(rowStatusId) !== String(statusId)) return false;
      }

      return true;
    });
  }, [rows, q, statusId]); // Runs whenever rows, q, or statusId changes


  // --- Pagination Logic (Based on filtered results) ---
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

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
    
    const targetStatus = statuses.find(s => String(s.id) === String(bulkStatusId));
    const statusName = targetStatus ? targetStatus.name : "Unknown Status";

    setSavingBulk(true);
    setErr("");
    const ids = [...selectedIds].map(Number);

    try {
      await updateBillShipmentStatus(ids, Number(bulkStatusId));
      
      // Update local state instantly
      setRows(prevRows => prevRows.map(row => {
        if (ids.includes(Number(row.id))) {
          return {
            ...row,
            status: targetStatus || row.status, 
            shipment_status_id: Number(bulkStatusId)
          };
        }
        return row;
      }));

      toast.success(`Updated ${ids.length} shipments to '${statusName}'`);
      setSelectedIds(new Set());
      setBulkStatusId("");
      
    } catch (e) {
      console.error("Update error:", e);
      setErr(e?.message || "Failed to update status.");
      toast.error("Failed to update status");
    } finally {
      setSavingBulk(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shipment?")) return;
    try {
      await deleteBillShipments([id]);
      setRows((prevRows) => prevRows.filter((row) => row.id !== id));
      toast.success("Shipment deleted");
    } catch (e) {
      console.error("Delete failed:", e);
      toast.error("Failed to delete shipment");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select items first");
      return;
    }
    if (!window.confirm(`Delete ${selectedIds.size} shipments?`)) return;
    
    const idsToDelete = [...selectedIds];
    try {
      await deleteBillShipments(idsToDelete);
      setRows((prevRows) => prevRows.filter((row) => !idsToDelete.includes(Number(row.id))));
      setSelectedIds(new Set());
      toast.success(`Deleted ${idsToDelete.length} shipments`);
    } catch (e) {
      console.error("Bulk delete failed:", e);
      toast.error("Bulk delete failed");
    }
  };

  const handleEditClick = (id) => {
    setEditId(id);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    // Ideally refetch single item or whole list, here we reload all for simplicity
    // Or you could pass the updated object back up from the modal
    getBillShipments({}).then(data => setRows(unwrapArray(data)));
    setIsEditModalOpen(false);
    setEditId(null);
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

      {/* --- FILTER BAR --- */}
      <div className="rounded-xl border bg-white p-3 md:p-4 shadow-sm mb-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by Shipment #, AWB, Port..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm transition duration-150 ease-in-out"
            />
          </div>

          {/* Status Dropdown */}
          <div className="w-full md:w-64">
            <select
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              {statuses.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk actions toolbar */}
        <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-4">
             <div className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
              {selectedIds.size} Selected
            </div>
            
            <div className="flex items-center gap-2">
              {/* Bulk Update Group */}
<div className="flex items-center">
  <div className={`flex items-center rounded-lg border shadow-sm transition-all duration-200 ${selectedIds.size > 0 ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
    
    {/* Label Icon (Optional visual cue) */}
    <div className="pl-3 pr-1 text-gray-400">
      <span className="text-xs font-semibold uppercase tracking-wider">Change Status:</span>
    </div>

    {/* The Select Dropdown */}
    <select
      value={bulkStatusId}
      onChange={(e) => setBulkStatusId(e.target.value)}
      disabled={selectedIds.size === 0}
      className="h-9 border-none bg-transparent py-0 pl-2 pr-8 text-sm text-gray-700 focus:ring-0 disabled:cursor-not-allowed"
    >
      <option value="">Select...</option>
      {statuses.map((s) => (
        <option key={s.id} value={String(s.id)}>
          {s.name}
        </option>
      ))}
    </select>

    {/* The Action Button (Attached) */}
    <button
      onClick={handleBulkUpdate}
      disabled={!bulkStatusId || selectedIds.size === 0 || savingBulk}
      className="h-9 border-l border-indigo-100 bg-white px-4 text-sm font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white rounded-r-lg transition-colors"
    >
      {savingBulk ? "Saving..." : "Update"}
    </button>
  </div>
</div>
            </div>
          </div>

          <button
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0}
              className="px-3 py-1.5 text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm border-b">
                <tr className="text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  <th className="py-3 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={(e) => toggleSelectAllPage(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="py-3 px-3">SL</th>
                  <th className="py-3 px-3">Shipment No</th>
                  <th className="py-3 px-3">AWB / Container</th>
                  <th className="py-3 px-3">Origin</th>
                  <th className="py-3 px-3">Destination</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3 text-center">Boxes</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-sm">
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl opacity-50">🔍</span>
                        <span>No shipments match your filters.</span>
                      </div>
                    </td>
                  </tr>
                )}

                {pageRows.map((r, idx) => {
                    const id = Number(r.id);
                    const sl = (page - 1) * pageSize + idx + 1;
                    const statusName = r?.status?.name || r?.status || "Pending";
                    
                    const boxCount = Array.isArray(r?.custom_shipments)
                      ? r.custom_shipments.reduce((acc, bill) => acc + (Number(bill.pcs) || 0), 0)
                      : 0;

                    const checked = selectedIds.has(id);

                    return (
                      <tr
                        key={id}
                        className={`hover:bg-gray-50 transition-colors ${checked ? 'bg-indigo-50/60' : ''}`}
                      >
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleRow(id, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-gray-500">{sl}</td>
                        <td className="py-3 px-3 font-medium text-gray-900">
                          {r.shipment_number || "—"}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {r.awb_or_container_number || "—"}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {r?.origin_port?.name || "—"}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {r?.destination_port?.name || "—"}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {r?.shipping_method?.name || "—"}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-600">{boxCount}</td>
                        <td className="py-3 px-3 text-gray-500 whitespace-nowrap text-xs">
                          {fmtDateTime(r.created_at)}
                        </td>
                      <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusPill(statusName)}`}
                          >
                            {statusName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              title="View"
                              onClick={() => navigate(`/billshipment/${r.id}`)}
                              className="text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              <FaEye className="w-4 h-4" />
                            </button>
                            <button
                                title="Edit"
                                onClick={() => handleEditClick(r.id)}
                                className="text-gray-400 hover:text-amber-600 transition-colors"
                            >
                                <FaEdit className="w-4 h-4" />
                            </button>
                           <button
                              title="Delete"
                              onClick={() => handleDelete(r.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
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
              Showing <span className="font-medium">{pageRows.length}</span> of <span className="font-medium">{filteredRows.length}</span> results
              {err && <span className="text-rose-600 ml-3 font-medium">{err}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded-md border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white transition shadow-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <div className="px-2 font-medium">
                  {page} / {totalPages}
              </div>
              <button
                className="px-3 py-1 rounded-md border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white transition shadow-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      <EditShipmentModal 
        shipmentId={editId}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}