// src/features/Shipments/ShipmentBillView.jsx
import React, { useCallback, useEffect, useState } from "react";
import {
  getBillShipments,
  updateBillShipmentStatus,
  deleteBillShipments,
} from "../../services/billShipmentApi";
import { getShipmentStatuses } from "../../services/coreService";
import { FaEye, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  if (v.includes("not delivered") || v.includes("cancel") || v.includes("rejected") || v.includes("fail") || v.includes("returned")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (v.includes("delivered") || v.includes("completed") || v.includes("received") || v.includes("cleared")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (v.includes("pending") || v.includes("draft") || v.includes("new") || v.includes("booked") || v.includes("scheduled")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (v.includes("transit") || v.includes("shipped") || v.includes("progress") || v.includes("manifest") || v.includes("departed") || v.includes("arrived")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (v.includes("hold") || v.includes("customs") || v.includes("review") || v.includes("exception")) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("search") ?? "";
  const statusId = searchParams.get("shipment_status_id") ?? "";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const updateListParams = useCallback((changes, replace = true) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value == null || value === "" || (key === "page" && value === 1)) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      return next;
    }, { replace });
  }, [setSearchParams]);
  
  // Raw Data from API
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  
  // Pagination
  const pageSize = 10;
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: pageSize, total_items: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  
  // Selection & Bulk Actions
  const [statuses, setStatuses] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [savingBulk, setSavingBulk] = useState(false);

  const [editId, setEditId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- Status Options ---
  useEffect(() => {
    let mounted = true;
    const loadStatuses = async () => {
      try {
        const res = await getShipmentStatuses();
        if(mounted) setStatuses(unwrapArray(res));
      } catch (e) {
        console.warn("[UI] statuses load error", e?.message);
      }
    };

    loadStatuses();
    return () => { mounted = false; };
  }, []);

  // Fetch one server page whenever the page or filters change.
  useEffect(() => {
    let mounted = true;
    const loadShipments = async () => {
      setLoading(true);
      setErr("");
      setRows([]);
      try {
        const data = await getBillShipments({
          page,
          per_page: pageSize,
          ...(q.trim() ? { search: q.trim() } : {}),
          ...(statusId ? { shipment_status_id: statusId } : {}),
        });
        const list = unwrapArray(data);
        if (mounted) {
          const meta = data?.pagination || data?.meta || data?.data?.pagination || data?.data?.meta;
          const total = Number(meta?.total_items ?? meta?.total ?? list.length);
          const lastPage = Math.max(1, Number(meta?.last_page) || Math.ceil(total / pageSize));
          if (page > lastPage) {
            updateListParams({ page: lastPage });
            return;
          }
          setRows(list);
          setPagination({
            current_page: Number(meta?.current_page) || page,
            per_page: Number(meta?.per_page) || pageSize,
            last_page: lastPage,
            total_items: total,
          });
        }
      } catch (e) {
        if(mounted) {
            setErr(e?.message || "Failed to load shipments.");
            setRows([]);
            setPagination({ current_page: page, last_page: page, per_page: pageSize, total_items: 0 });
        }
      } finally {
        if(mounted) setLoading(false);
      }
    };

    loadShipments();

    return () => { mounted = false; };
  }, [page, q, statusId, reloadKey, updateListParams]);

  const pageRows = rows;
  const totalPages = pagination.last_page;
  const showingFrom = pagination.total_items > 0 && pageRows.length > 0
    ? (pagination.current_page - 1) * pagination.per_page + 1
    : 0;
  const showingTo = showingFrom ? showingFrom + pageRows.length - 1 : 0;
  const billsOnPage = pageRows.reduce(
    (total, row) => total + (Array.isArray(row.custom_shipments) ? row.custom_shipments.length : 0),
    0,
  );
  const boxesOnPage = pageRows.reduce(
    (total, row) => total + (Array.isArray(row.custom_shipments)
      ? row.custom_shipments.reduce((sum, bill) => sum + (Number(bill.pcs) || 0), 0)
      : 0),
    0,
  );
  const hasFilters = Boolean(q || statusId);

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
      
      setReloadKey((key) => key + 1);

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
      setSelectedIds((previous) => {
        const next = new Set(previous);
        next.delete(Number(id));
        return next;
      });
      setReloadKey((key) => key + 1);
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
      setSelectedIds(new Set());
      setReloadKey((key) => key + 1);
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

  const handleEditSuccess = (updatedShipment) => {
    if (updatedShipment?.id == null) return;

    setReloadKey((key) => key + 1);
    setIsEditModalOpen(false);
    setEditId(null);
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <Toaster position="top-right" reverseOrder={false} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Operations / Shipments</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Physical shipments</h1>
          <p className="mt-1 text-sm text-slate-500">Review shipment movement and manage attached bills.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
          Total shipments <span className="ml-2 font-semibold tabular-nums text-slate-900">{pagination.total_items.toLocaleString()}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Shipments on this page</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{pageRows.length.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bills on this page</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{billsOnPage.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Boxes on this page</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{boxesOnPage.toLocaleString()}</p>
        </div>
      </div>

      <section aria-label="Shipment filters and actions" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 p-4 sm:p-5">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="shipment-search" className="mb-1.5 block text-xs font-medium text-slate-600">Search shipments</label>
            <div className="relative">
              <FaSearch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="shipment-search"
                type="search"
                value={q}
                onChange={(event) => updateListParams({ search: event.target.value, page: 1 })}
                placeholder="Shipment no, AWB or port"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>
          <div className="w-full sm:w-56">
            <label htmlFor="shipment-status-filter" className="mb-1.5 block text-xs font-medium text-slate-600">Status</label>
            <select
              id="shipment-status-filter"
              value={statusId}
              onChange={(event) => updateListParams({ shipment_status_id: event.target.value, page: 1 })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">All statuses</option>
              {statuses.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => updateListParams({ search: "", shipment_status_id: "", page: 1 })}
              className="h-10 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:px-5">
          {selectedIds.size > 0 ? (
            <>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">{selectedIds.size} selected</span>
                <span className="hidden text-xs text-slate-500 sm:inline">Selection is kept across pages</span>
                <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline">Clear selection</button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="bulk-shipment-status" className="sr-only">New shipment status</label>
                <select
                  id="bulk-shipment-status"
                  value={bulkStatusId}
                  onChange={(event) => setBulkStatusId(event.target.value)}
                  className="h-9 min-w-40 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="">Change status to...</option>
                  {statuses.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleBulkUpdate}
                  disabled={!bulkStatusId || savingBulk}
                  className="h-9 rounded-lg bg-sky-700 px-3 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingBulk ? "Updating..." : "Apply status"}
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                >
                  Delete selected
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Select shipments to update their status or delete them in bulk.</p>
          )}
        </div>
      </section>

      <section aria-label="Physical shipments list" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Shipment register</h2>
            <p className="mt-0.5 text-xs text-slate-500">{hasFilters ? "Filtered shipments" : "All physical shipments"} · Page {page} of {totalPages}</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{showingFrom}–{showingTo} of {pagination.total_items.toLocaleString()}</span>
        </div>

        {err && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
            <span>{err}</span>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="font-semibold underline underline-offset-2 hover:text-rose-900">Retry</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all shipments on this page"
                    checked={allOnPageSelected}
                    onChange={(event) => toggleSelectAllPage(event.target.checked)}
                    disabled={loading || pageRows.length === 0}
                    className="rounded border-slate-300 text-sky-700 focus:ring-sky-500 disabled:opacity-50"
                  />
                </th>
                <th scope="col" className="px-3 py-3">#</th>
                <th scope="col" className="px-4 py-3">Shipment</th>
                <th scope="col" className="px-4 py-3">AWB / Container</th>
                <th scope="col" className="px-4 py-3">Route</th>
                <th scope="col" className="px-4 py-3">Method</th>
                <th scope="col" className="px-4 py-3 text-right">Bills / Boxes</th>
                <th scope="col" className="px-4 py-3">Created</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={`loading-${index}`} className="animate-pulse">
                    {Array.from({ length: 10 }, (_, cell) => (
                      <td key={cell} className="px-4 py-4"><div className="h-4 rounded bg-slate-100" /></td>
                    ))}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-14 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FaSearch aria-hidden="true" /></div>
                    <p className="mt-3 font-medium text-slate-800">{err ? "Shipments could not be loaded" : "No shipments found"}</p>
                    <p className="mt-1 text-sm text-slate-500">{err ? "Use Retry above to load the list again." : "Try a different search or status filter."}</p>
                  </td>
                </tr>
              ) : pageRows.map((row, index) => {
                const id = Number(row.id);
                const serial = (pagination.current_page - 1) * pagination.per_page + index + 1;
                const billCount = Array.isArray(row.custom_shipments) ? row.custom_shipments.length : 0;
                const boxCount = Array.isArray(row.custom_shipments)
                  ? row.custom_shipments.reduce((sum, bill) => sum + (Number(bill.pcs) || 0), 0)
                  : 0;
                const rawStatus = row?.status?.name ?? row?.status?.id ?? row?.shipment_status_id ?? row?.status;
                const statusName = statuses.find((item) => String(item.id) === String(rawStatus))?.name
                  || (typeof rawStatus === "string" || typeof rawStatus === "number" ? String(rawStatus) : "Pending");
                const checked = selectedIds.has(id);

                return (
                  <tr key={id} className={`transition-colors hover:bg-slate-50/80 ${checked ? "bg-sky-50/60" : ""}`}>
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        aria-label={`Select shipment ${row.shipment_number || row.id}`}
                        checked={checked}
                        onChange={(event) => toggleRow(id, event.target.checked)}
                        className="rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                      />
                    </td>
                    <td className="px-3 py-3.5 tabular-nums text-slate-400">{serial}</td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/billshipment/${row.id}`, { state: { shipment: row } })}
                        className="font-semibold text-sky-700 hover:text-sky-900 hover:underline focus:outline-none focus:underline"
                      >
                        {row.shipment_number || `Shipment #${row.id}`}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{row.awb_or_container_number || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className="block max-w-44 truncate font-medium text-slate-800" title={row.origin_port?.name || ""}>{row.origin_port?.name || "—"}</span>
                      <span className="block max-w-44 truncate text-xs text-slate-500" title={row.destination_port?.name || ""}>to {row.destination_port?.name || "—"}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{row.shipping_method?.name || "—"}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="block font-semibold tabular-nums text-slate-900">{billCount.toLocaleString()} bills</span>
                      <span className="block text-xs tabular-nums text-slate-500">{boxCount.toLocaleString()} boxes</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{fmtDateTime(row.created_at) || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${statusPill(statusName)}`}>{statusName}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" title="View" aria-label={`View shipment ${row.shipment_number || row.id}`} onClick={() => navigate(`/billshipment/${row.id}`, { state: { shipment: row } })} className="rounded-lg p-2 text-slate-500 transition hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200"><FaEye aria-hidden="true" /></button>
                        <button type="button" title="Edit" aria-label={`Edit shipment ${row.shipment_number || row.id}`} onClick={() => handleEditClick(row.id)} className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200"><FaEdit aria-hidden="true" /></button>
                        <button type="button" title="Delete" aria-label={`Delete shipment ${row.shipment_number || row.id}`} onClick={() => handleDelete(row.id)} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200"><FaTrash aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
          <span>Showing <strong className="font-medium tabular-nums text-slate-900">{showingFrom}–{showingTo}</strong> of <strong className="font-medium tabular-nums text-slate-900">{pagination.total_items.toLocaleString()}</strong> shipments</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => updateListParams({ page: Math.max(1, page - 1) }, false)} disabled={loading || page <= 1} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
            <span className="min-w-20 text-center font-medium tabular-nums">{page} / {totalPages}</span>
            <button type="button" onClick={() => updateListParams({ page: Math.min(totalPages, page + 1) }, false)} disabled={loading || page >= totalPages} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </footer>
      </section>

      <EditShipmentModal
        shipmentId={editId}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </main>
  );
}
