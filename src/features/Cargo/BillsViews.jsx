// src/pages/PhysicalBills/BillsViews.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { getPhysicalBills, importCustomShipments,deletePhysicalBill  } from "../../api/billApi";
import { Link } from "react-router-dom";
import { FiEye, FiSearch, FiUpload, FiFilter, FiInbox,FiEdit2, FiTrash2  } from "react-icons/fi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";

function BillsViews() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // holds a status NAME from the master list
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [viewModalOpen, setViewModalOpen] = useState(false);
const [selectedBill, setSelectedBill] = useState(null);

  const pageSize = 10;

  /** ---------- small utils ---------- */
  const str = (v) => (v == null ? "" : String(v));
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const billNo = (r) =>
    str(r?.bill_no || r?.invoice_no || r?.booking_no || r?.ref_no || r?.ref).trim();

    const destination = (r) =>
    str(
      r?.destination ??
      r?.des ??               // ← backend sends "des": "Dubai"
      r?.dest ??
      r?.port_of_destination ??
      r?.to ??
      r?.Destination          // optional: handle accidental PascalCase
    ).trim();

  const method = (r) =>
    str(r?.shipment_method || r?.method || r?.mode || r?.shipping_method).trim();

  const pcs = (r) => num(r?.pcs ?? r?.pieces);
  const weight = (r) => num(r?.weight ?? r?.total_weight ?? r?.gross_weight);

  const isoDate = (r) => r?.created_at || r?.date || r?.createdDate || r?.created_at_utc || null;

  const fmtDate = (v) => {
    if (!v) return "";
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return str(v);
      // dd-MMM-YYYY, 24h time (local)
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return str(v);
    }
  };

  const handleView = (bill) => {
  setSelectedBill(bill);
  setViewModalOpen(true);
};


  /** ---------- data fetch ---------- */
  const fetchBills = async () => {
    setLoading(true);
    try {
      // No is_shipment filter here -> full list view
      const data = await getPhysicalBills();
      const list = Array.isArray(data) ? data : [];
      setRows(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bills.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const [statusList, setStatusList] = useState([]);
  const statusMap = useMemo(() => {
    const m = new Map();
    for (const s of statusList) if (s?.id != null && s?.name) m.set(String(s.id), s.name);
    return m;
  }, [statusList]);

  const statusLabel = (r) => {
    const raw = str(r?.status).trim();
    if (raw && statusMap.has(raw)) return statusMap.get(raw);
    const direct = str(r?.status_name || r?.current_status || r?.state).trim();
    return direct || raw || "—";
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchBills();
    })();
    return () => {
      alive = false;
    };
  }, []);

useEffect(() => {
  let alive = true;
  (async () => {
    try {
      const list = await getActiveShipmentStatuses();
      if (!alive) return;
      setStatusList(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load statuses", e);
      setStatusList([]);
    }
  })();
  return () => { alive = false; };
}, []);

  /** ---------- import (Excel/CSV) ---------- */
  const onPickFile = () => fileInputRef.current?.click();

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-upload of same name
    if (!file) return;

    const validExt = [".xlsx", ".xls", ".csv"];
    const name = file.name.toLowerCase();
    if (!validExt.some((ext) => name.endsWith(ext))) {
      toast.error("Please upload an Excel file (.xlsx/.xls) or CSV.");
      return;
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File too large. Max 10 MB.");
      return;
    }

    try {
      setUploading(true);
      const tId = toast.loading("Importing…");
      const res = await importCustomShipments(file);
      const ok = res?.data?.success ?? true;
      const msg = res?.data?.message || "Import completed.";
      toast.dismiss(tId);
      if (ok) {
        toast.success(msg);
        await fetchBills();
      } else {
        toast.error(msg || "Import failed.");
      }
    } catch (err) {
      console.error(err);
      let errorMessage = "Import failed. Please check your file and try again.";

      if (err.response?.data) {
        const { message, error, errors } = err.response.data;
        if (message) {
          errorMessage = message;
        } else if (error) {
          errorMessage = error;
        }

        // Detect raw SQL errors and provide a friendlier message.
        const rawError = message || error || "";
        if (rawError.includes("SQLSTATE") && rawError.includes("Incorrect decimal value")) {
          errorMessage = "Import failed: One or more rows contain invalid numeric data (e.g., in 'weight' or 'pcs' columns). Please check your file for non-numeric values and try again.";
        } else if (rawError.includes("SQLSTATE") && rawError.includes("Invalid datetime format")) {
          errorMessage = "Import failed: One or more rows contain an invalid date format. Please ensure all dates are correct and try again.";
        } else if (rawError.includes("SQLSTATE")) {
          errorMessage = "An unexpected database error occurred during import. Please check your file format and data.";
        }

        // Handle structured validation errors (e.g., from Laravel)
        if (errors && typeof errors === 'object') {
          const validationMessages = Object.entries(errors).map(([field, messages]) => 
            `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
          );
          if (validationMessages.length > 0) {
            // Join first few messages for a concise toast
            errorMessage = `Validation failed: ${validationMessages.slice(0, 3).join('; ')}${validationMessages.length > 3 ? '...' : ''}`;
          }
        }
      }

      toast.error(errorMessage, { duration: 6000 }); // Longer duration for detailed errors
    } finally {
      setUploading(false);
    }
  };

  /** ---------- client-side search & filter ---------- */
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      const hitQ =
        !query ||
        billNo(r).toLowerCase().includes(query) ||
        destination(r).toLowerCase().includes(query) ||
        method(r).toLowerCase().includes(query);
      const label = statusLabel(r);
      const hitStatus = !status || label.toLowerCase() === status.toLowerCase();
      return hitQ && hitStatus;
    });
  }, [rows, q, status, statusMap]);

  const totalPages =
    filtered.length === 0 ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const loadBills = async () => {
  setLoading(true);
  try {
    const list = await getPhysicalBills();
    setRows(list);
  } catch (err) {
    console.error("Failed to load bills:", err);
    toast.error("Failed to load bills");
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadBills();
}, []);

const handleDelete = async (id) => {
  if (!id) return toast.error("Invalid bill ID");
  if (!window.confirm("Are you sure you want to delete this bill?")) return;

  try {
    const res = await deletePhysicalBill(id);
    toast.success(res?.message || "Bill deleted successfully");
    // Remove from state to update UI instantly
    setRows((prevRows) => prevRows.filter((row) => row.id !== id));
  } catch (error) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      "Failed to delete bill.";
    toast.error(msg);
    console.error("Delete failed:", error);
  }
};


  /** ---------- UI ---------- */
  return (
   <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 font-[Inter]">
  <Toaster position="top-right" />

  {/* Header */}
  <header className="mb-8">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Bills
        </h2>
        <p className="text-sm text-slate-500">
          Manage and review all your physical bills in one place.
        </p>
      </div>

      {/* Quick Count */}
      <div className="hidden sm:flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-50 to-sky-50 border border-slate-200 px-3 py-1 text-sm">
          Total:&nbsp;<span className="font-semibold text-slate-800">{rows.length}</span>
        </span>
      </div>
    </div>
  </header>

  {/* Filters */}
  <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-4 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.04)]">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by bill no, destination, or method"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-200 transition"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative shrink-0">
          <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="appearance-none w-full sm:w-56 rounded-xl border border-slate-200 bg-white pl-10 pr-8 py-2.5 text-sm text-slate-800 shadow-sm focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 transition"
          >
            <option value="">All Status</option>
            {statusList.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
        </div>
      </div>

      {/* Import Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFileSelected}
          className="hidden"
        />
        <button
          type="button"
          onClick={onPickFile}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-white px-4 py-2.5 text-sm font-medium shadow-md hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
        >
          <FiUpload className="h-4 w-4" />
          {uploading ? "Importing…" : "Import Excel"}
        </button>
      </div>
    </div>
  </div>

  {/* Table */}
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 uppercase text-xs tracking-wide border-b border-slate-200">
          <tr>
            {["SL No", "Invoice / Bill No", "Pcs", "Weight (kg)", "Method", "Destination", "Date", "Status", "Actions"].map((th) => (
              <th key={th} className="px-4 py-3 font-semibold whitespace-nowrap">
                {th}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <tr key={`sk-${i}`} className="animate-pulse">
                {[...Array(9)].map((__, j) => (
                  <td key={`sk-${i}-${j}`} className="px-4 py-3">
                    <div className="h-3 w-full max-w-[160px] rounded bg-slate-200" />
                  </td>
                ))}
              </tr>
            ))
          ) : paged.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <FiInbox className="h-5 w-5" />
                  </div>
                  <div className="font-medium text-slate-700">No bills found</div>
                  <p className="mt-1 text-sm text-slate-500">
                    Try adjusting your filters or search query.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            paged.map((r, idx) => {
              const slno = (safePage - 1) * pageSize + idx + 1;
              const pcsVal = pcs(r);
              const wtVal = weight(r);
              const dVal = fmtDate(isoDate(r));
              const statusVal = statusLabel(r);

              const statusColor =
                /delivered|booked|forwarded|arrived|cleared|out for delivery/i.test(statusVal)
                  ? "emerald"
                  : /enquiry|inquiry|pending|waiting/i.test(statusVal)
                  ? "amber"
                  : /cancel|hold|error|not delivered/i.test(statusVal)
                  ? "rose"
                  : "slate";

              return (
                <tr
                  key={r?.id ?? `${billNo(r)}-${isoDate(r) ?? slno}`}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-600">{slno}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{billNo(r) || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{pcsVal ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{wtVal ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{method(r) || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{destination(r) || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{dVal || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        statusColor === "emerald"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : statusColor === "amber"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : statusColor === "rose"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          statusColor === "emerald"
                            ? "bg-emerald-600"
                            : statusColor === "amber"
                            ? "bg-amber-600"
                            : statusColor === "rose"
                            ? "bg-rose-600"
                            : "bg-slate-400"
                        }`}
                      />
                      {statusVal}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={r.id ? `/bill/view/${r.id}` : `/bill/view?bill_no=${encodeURIComponent(billNo(r))}`}
                        state={{ row: r }}
                        title="View"
                        aria-label="View bill"
                        className="inline-flex items-center rounded-md bg-sky-50 p-2 text-sky-700 hover:bg-sky-100 hover:text-sky-800 focus:ring-2 focus:ring-sky-200 transition"
                      >
                        <FiEye className="h-4 w-4" />
                      </Link>

                     <Link
                          to={`/bill/edit/${r.id}`}
                          title="Edit"
                          aria-label="Edit bill"
                          className="inline-flex items-center rounded-md bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 focus:ring-2 focus:ring-emerald-200 transition"
                        >
                          <FiEdit2 className="h-4 w-4" />
                      </Link>

                   <button
                        title="Delete"
                        aria-label="Delete bill"
                        onClick={() => handleDelete(r?.id)}
                        className="inline-flex items-center rounded-md bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 hover:text-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-200 transition"
                      >
                        <FiTrash2 className="h-4 w-4" />
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

    {/* Pagination */}
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 p-4 bg-gradient-to-r from-white to-slate-50/50">
      <div className="text-xs sm:text-sm text-slate-600">
        Page <span className="font-medium">{safePage}</span> of{" "}
        <span className="font-medium">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
        >
          Prev
        </button>
        <button
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  </div>
</section>


  );
}

export default BillsViews;
