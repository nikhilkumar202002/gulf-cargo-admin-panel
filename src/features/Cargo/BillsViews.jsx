// src/pages/PhysicalBills/BillsViews.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import {
  getPhysicalBills,
  importCustomShipments,
  deletePhysicalBill,
} from "../../services/billShipmentApi";
import { Link } from "react-router-dom";
import {
  FiEye,
  FiSearch,
  FiUpload,
  FiFilter,
  FiInbox,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { useShipmentStatuses } from "../../hooks/useMasterData";
import { getApiError } from "../../utils/apiError";

const PAGE_SIZE = 10;

function BillsViews() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [pagination, setPagination] = useState({ current_page: 1, per_page: PAGE_SIZE, last_page: 1, total_items: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const fileInputRef = useRef(null);
  const requestIdRef = useRef(0);

  /** ---------- small utils ---------- */
  const str = (v) => (v == null ? "" : String(v));
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const billNo = (r) =>
    str(
      r?.bill_no || r?.invoice_no || r?.booking_no || r?.ref_no || r?.ref,
    ).trim();

  const destination = (r) =>
    str(
      r?.destination ??
        r?.des ?? // ← backend sends "des": "Dubai"
        r?.dest ??
        r?.port_of_destination ??
        r?.to ??
        r?.Destination, // optional: handle accidental PascalCase
    ).trim();

  const method = (r) =>
    str(
      r?.shipment_method || r?.method || r?.mode || r?.shipping_method,
    ).trim();

  const pcs = (r) => num(r?.pcs ?? r?.pieces);
  const weight = (r) => num(r?.weight ?? r?.total_weight ?? r?.gross_weight);

  const isoDate = (r) =>
    r?.created_at || r?.date || r?.createdDate || r?.created_at_utc || null;

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

  /** ---------- data fetch ---------- */
  const fetchBills = useCallback(async (pageArg, queryArg, statusArg) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    setRows([]);
    try {
      const params = {
        page: pageArg,
        per_page: PAGE_SIZE,
        search: queryArg.trim() || undefined,
      };
      let data;
      if (statusArg) {
        for (const filterKey of ["status_id", "shipment_status_id"]) {
          let candidate;
          try {
            candidate = await getPhysicalBills({ ...params, [filterKey]: Number(statusArg) });
          } catch (error) {
            if ([400, 422].includes(error?.response?.status)) continue;
            throw error;
          }
          if (requestId !== requestIdRef.current) return;
          const candidateRows = Array.isArray(candidate) ? candidate : [];
          if (candidateRows.every((bill) => String(bill?.status?.id ?? bill?.status) === String(statusArg))) {
            data = candidate;
            break;
          }
        }
        if (!data) {
          setLoadError({ message: "The bills API did not filter by shipment status. It needs a supported status filter parameter." });
          setPagination({ current_page: pageArg, per_page: PAGE_SIZE, last_page: pageArg, total_items: 0 });
          return;
        }
      } else {
        data = await getPhysicalBills(params);
      }
      if (requestId !== requestIdRef.current) return;
      const list = Array.isArray(data) ? data : [];
      const meta = data?.pagination || data?.meta;
      const total = Number(meta?.total_items ?? meta?.total ?? list.length);
      const lastPage = Math.max(1, Number(meta?.last_page) || Math.ceil(total / PAGE_SIZE));
      if (pageArg > lastPage) {
        setPage(lastPage);
        setPageInput(String(lastPage));
        return;
      }
      setRows(list);
      setPagination({
        current_page: Number(meta?.current_page) || pageArg,
        per_page: Number(meta?.per_page) || PAGE_SIZE,
        last_page: lastPage,
        total_items: total,
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error(err);
      setLoadError(getApiError(err));
      setPagination({ current_page: pageArg, per_page: PAGE_SIZE, last_page: pageArg, total_items: 0 });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const { data: statusList = [] } = useShipmentStatuses();
  const statusMap = useMemo(() => {
    const m = new Map();
    for (const s of statusList)
      if (s?.id != null && s?.name) m.set(String(s.id), s.name);
    return m;
  }, [statusList]);

  const statusLabel = (r) => {
    const raw = str(r?.status?.id ?? r?.status).trim();
    if (raw && statusMap.has(raw)) return statusMap.get(raw);
    const direct = str(r?.status?.name || r?.status_name || r?.current_status || r?.state).trim();
    return direct || raw || "—";
  };

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
        setPage(1);
        setPageInput("1");
        setRefreshKey((key) => key + 1);
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
        if (
          rawError.includes("SQLSTATE") &&
          rawError.includes("Incorrect decimal value")
        ) {
          errorMessage =
            "Import failed: One or more rows contain invalid numeric data (e.g., in 'weight' or 'pcs' columns). Please check your file for non-numeric values and try again.";
        } else if (
          rawError.includes("SQLSTATE") &&
          rawError.includes("Invalid datetime format")
        ) {
          errorMessage =
            "Import failed: One or more rows contain an invalid date format. Please ensure all dates are correct and try again.";
        } else if (rawError.includes("SQLSTATE")) {
          errorMessage =
            "An unexpected database error occurred during import. Please check your file format and data.";
        }

        // Handle structured validation errors (e.g., from Laravel)
        if (errors && typeof errors === "object") {
          const validationMessages = Object.entries(errors).map(
            ([field, messages]) =>
              `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`,
          );
          if (validationMessages.length > 0) {
            // Join first few messages for a concise toast
            errorMessage = `Validation failed: ${validationMessages.slice(0, 3).join("; ")}${validationMessages.length > 3 ? "..." : ""}`;
          }
        }
      }

      toast.error(errorMessage, { duration: 6000 }); // Longer duration for detailed errors
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBills(page, q, status);
    }, q.trim() ? 400 : 0);
    return () => {
      clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [page, q, status, refreshKey, fetchBills]);

  const searchText = q.trim().toLowerCase();
  const hasFilters = Boolean(searchText || status);
  const displayRows = rows
    .map((row, index) => ({ row, slno: (pagination.current_page - 1) * pagination.per_page + index + 1 }))
    .filter(({ row }) => !searchText || [billNo(row), destination(row), method(row)]
      .some((value) => value.toLowerCase().includes(searchText)));

  const showingFrom = pagination.total_items > 0 && rows.length > 0
    ? (pagination.current_page - 1) * pagination.per_page + 1
    : 0;
  const showingTo = showingFrom ? showingFrom + rows.length - 1 : 0;

  const changePage = (nextPage) => {
    const requested = Number(nextPage);
    if (!Number.isInteger(requested)) {
      setPageInput(String(page));
      return;
    }
    const safePage = Math.min(pagination.last_page, Math.max(1, requested));
    setPage(safePage);
    setPageInput(String(safePage));
  };

  const handleDelete = async (id) => {
    if (!id) return toast.error("Invalid bill ID");
    if (!window.confirm("Are you sure you want to delete this bill?")) return;

    try {
      const res = await deletePhysicalBill(id);
      toast.success(res?.message || "Bill deleted successfully");
      setRefreshKey((key) => key + 1);
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
    <section className="mx-auto w-full font-[Inter]">
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
              Total:&nbsp;
              <span className="font-semibold text-slate-800">
                {pagination.total_items}
              </span>
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
                  setPageInput("1");
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
                  setPageInput("1");
                }}
                className="appearance-none w-full sm:w-56 rounded-xl border border-slate-200 bg-white pl-10 pr-8 py-2.5 text-sm text-slate-800 shadow-sm focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 transition"
              >
                <option value="">All Status</option>
                {statusList.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                ▾
              </span>
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
      {loadError && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          <span>{loadError.message}</span>
          <button type="button" onClick={() => fetchBills(page, q, status)} className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700">
            Retry
          </button>
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 uppercase text-xs tracking-wide border-b border-slate-200">
              <tr>
                {[
                  "SL No",
                  "Invoice / Bill No",
                  "Pcs",
                  "Weight (kg)",
                  "Method",
                  "Destination",
                  "Date",
                  "Status",
                  "Actions",
                ].map((th) => (
                  <th
                    key={th}
                    className="px-4 py-3 font-semibold whitespace-nowrap"
                  >
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
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                        <FiInbox className="h-5 w-5" />
                      </div>
                      <div className="font-medium text-slate-700">
                        {loadError ? "Bills could not be loaded" : searchText ? "No matching bills on this page" : hasFilters ? "No matching bills found" : "No bills found"}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {loadError ? "Use Retry above to try the request again." : "Try adjusting your filters or search query."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayRows.map(({ row: r, slno }) => {
                  const pcsVal = pcs(r);
                  const wtVal = weight(r);
                  const dVal = fmtDate(isoDate(r));
                  const statusVal = statusLabel(r);

                  const statusColor =
                    /delivered|booked|forwarded|arrived|cleared|out for delivery/i.test(
                      statusVal,
                    )
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
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {billNo(r) || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {pcsVal ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {wtVal ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {method(r) || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {destination(r) || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {dVal || "—"}
                      </td>
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
                            to={
                              r.id
                                ? `/bill/view/${r.id}`
                                : `/bill/view?bill_no=${encodeURIComponent(billNo(r))}`
                            }
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
          <span>
            {searchText ? (
              <>
                <span className="font-medium">{displayRows.length}</span> matching bills on this page
                {" · "}{pagination.total_items} bills reported by API
              </>
            ) : (
              <>
                Showing <span className="font-medium">{showingFrom}–{showingTo}</span> of{" "}
                <span className="font-medium">{pagination.total_items}</span> bills
              </>
            )}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => changePage(page - 1)}
              disabled={loading || page <= 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-1">Page {page} of {pagination.last_page}</span>
            <button
              type="button"
              onClick={() => changePage(page + 1)}
              disabled={loading || page >= pagination.last_page}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                changePage(pageInput);
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="bill-page-number">Go to</label>
              <input
                id="bill-page-number"
                type="number"
                min="1"
                max={pagination.last_page}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BillsViews;
