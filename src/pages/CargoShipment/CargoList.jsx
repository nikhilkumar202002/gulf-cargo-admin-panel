// src/pages/Cargos/AllCargoList.jsx
import React, { useEffect, useState, useCallback } from "react"; 
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux"; 
import toast, { Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { GiCargoCrate } from "react-icons/gi";
import { SlEye } from "react-icons/sl";
import { FaFileInvoiceDollar } from "react-icons/fa6";

/* APIs */
import { listCargos } from "../../api/createCargoApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { getActiveBranches } from "../../api/branchApi"; 

import BillModal from "./components/BillModal";
import EditCargoModal from "./components/EditCargoModal";

/* ---------------- helpers ---------------- */
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

const initialFilter = {
  bookingNo: "", 
  fromDate: "",
  tillDate: "",
  status: "",
  branchId: "", 
};

const COLOR = {
  violet: "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
};

/* ---------------- skeleton ---------------- */
const Skel = ({ w = "100%", h = 12 }) => (
  <div
    className="animate-pulse rounded bg-slate-200/80"
    style={{ width: w, height: h }}
  />
);

const TableSkeleton = ({ rows = 8, cols = 13 }) => (
  <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1200px] whitespace-nowrap">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-semibold tracking-wide text-slate-600">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-3 py-3">
                <Skel w="60%" h={12} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c} className="px-3 py-3">
                  <Skel
                    w={c === 0 ? "18px" : c % 3 === 0 ? "50%" : "70%"}
                    h={12}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ---------------- Pagination ---------------- */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const handlePrev = () => currentPage > 1 && onPageChange(currentPage - 1);
  const handleNext = () => currentPage < totalPages && onPageChange(currentPage + 1);

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    const half = Math.floor(maxPagesToShow / 2);

    if (totalPages <= maxPagesToShow + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > half + 2) pages.push("...");
      let start = Math.max(2, currentPage - half);
      let end = Math.min(totalPages - 1, currentPage + half);
      if (currentPage <= half + 1) end = maxPagesToShow - 1;
      if (currentPage >= totalPages - half) start = totalPages - maxPagesToShow + 2;
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - half - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-slate-600">
        Page <b>{currentPage}</b> of <b>{totalPages}</b>
      </p>
      <div className="inline-flex items-center gap-1 rounded-xl bg-white px-1.5 py-1 shadow-sm ring-1 ring-slate-200">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="px-3 h-9 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Prev
        </button>
        {getPageNumbers().map((page, i) =>
          typeof page === "number" ? (
            <button
              key={i}
              onClick={() => onPageChange(page)}
              className={
                currentPage === page
                  ? "min-w-[2.25rem] h-9 px-3 text-sm rounded-lg border border-indigo-500 bg-indigo-600 text-white font-medium shadow-sm"
                  : "min-w-[2.25rem] h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }
            >
              {page}
            </button>
          ) : (
            <span key={i} className="px-2 h-9 text-slate-400 select-none">
              ...
            </span>
          )
        )}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="px-3 h-9 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};

/* ---------------- Main ---------------- */
export default function AllCargoList() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useSelector((state) => state.auth?.token);

  const [cargos, setCargos] = useState([]);
  const [totalCargos, setTotalCargos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [filter, setFilter] = useState(initialFilter);
  const [statuses, setStatuses] = useState([]);
  const [branches, setBranches] = useState([]); 

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCargoId, setEditingCargoId] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;

  useEffect(() => {
    (async () => {
      try {
        const statusRes = await getActiveShipmentStatuses(); 
        setStatuses(unwrapArray(statusRes));
        
        const branchRes = await getActiveBranches({}, token);
        setBranches(unwrapArray(branchRes));
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    })();
  }, [token]);

  /* ---------------- Fetch Cargos (Filtered) ---------------- */
  const fetchCargos = useCallback(
    async (currentPage = 1, currentFilter = filter) => {
      setLoading(true);
      setError("");
      
      const searchParams = {
        page: currentPage,
        per_page: perPage,
        search: currentFilter.bookingNo || undefined,
        booking_no: currentFilter.bookingNo || undefined, 
        
        from_date: currentFilter.fromDate || undefined,
        to_date: currentFilter.tillDate || undefined,
        status_id: currentFilter.status || undefined,
        branch_id: currentFilter.branchId || undefined, 
      };

      try {
        const response = await listCargos(searchParams);

        const fetched = unwrapArray(response);
        setCargos(fetched);
        const pagination = response?.pagination;
        setTotalCargos(pagination?.total_items ?? fetched.length);
        setTotalPages(
          pagination?.last_page ??
            Math.ceil((pagination?.total_items ?? fetched.length) / perPage)
        );
      } catch (err) {
        console.error("Fetch cargos error:", err);
        setError(err?.message || "Failed to load cargos.");
        setCargos([]);
        setTotalCargos(0);
      } finally {
        setLoading(false);
      }
    },
    [filter]
  );

  // --- REFRESH LOGIC ---
  useEffect(() => {
    if (location.state?.refresh) {
      // 1. Fetch data
      fetchCargos(page, filter);
      // 2. Clear state so it doesn't loop
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, fetchCargos, navigate, page, filter, location.pathname]);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCargos(page, filter);
    }, 500); 

    return () => clearTimeout(timer);
  }, [page, filter, fetchCargos]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleExcelExport = async () => {
    if (totalCargos === 0) return toast.error("No cargos to export.");

    const exportPromise = async () => {
      const response = await listCargos({
        search: filter.bookingNo || undefined,
        booking_no: filter.bookingNo || undefined,
        from_date: filter.fromDate || undefined,
        to_date: filter.tillDate || undefined,
        status_id: filter.status || undefined,
        branch_id: filter.branchId || undefined,
      });

      const allCargos = unwrapArray(response);
      if (!allCargos.length) throw new Error("No cargo data found to export.");

      const rows = allCargos.map((c) => ({
        ID: c.id,
        "Booking No": c.booking_no,
        Branch: c.branch_name,
        Sender: c.sender_name,
        Receiver: c.receiver_name,
        Date: c.date,
        Time: c.time,
        "Shipping Method": c.shipping_method,
        "Payment Method": c.payment_method,
        Status: c.status?.name || c.status || "",
        "Total Weight": c.total_weight,
        "Total Cost": c.total_cost,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cargos");
      XLSX.writeFile(wb, `cargos_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}.xlsx`);
    };

    toast.promise(exportPromise(), {
      loading: `Exporting ${totalCargos} records...`,
      success: "Export complete!",
      error: (err) => err.message || "Export failed.",
    });
  };

  const getBoxCount = (c = {}) => {
    if (Number.isFinite(c.box_count)) return Number(c.box_count);
    if (Array.isArray(c.boxes)) return c.boxes.length;
    if (Array.isArray(c.items)) {
      const uniq = new Set(
        c.items.map((it) => it?.box_number ?? it?.boxNumber ?? it?.box).filter(Boolean)
      );
      return uniq.size || 0;
    }
    return 0;
  };

  return (
    <section className="min-h-screen ">
      <Toaster position="top-right" />
      <div className="mx-auto w-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GiCargoCrate className="h-6 w-6 text-[#ED2624]" />
            <h1 className="text-xl font-semibold text-slate-900">All Cargo</h1>
            <span className="ml-3 rounded-lg bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800 ring-1 ring-indigo-300">
              Total Cargos: {totalCargos || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExcelExport}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
            >
              Export
            </button>
          </div>
        </div>

        {/* Filters Container */}
        <div className="mb-5 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <input
                type="text"
                name="bookingNo"
                value={filter.bookingNo}
                onChange={handleFilterChange}
                placeholder="Search by Booking No..."
                className="w-full rounded-lg bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            
            <div className="md:col-span-1">
              <select
                name="branchId"
                value={filter.branchId}
                onChange={handleFilterChange}
                className="w-full rounded-lg bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-slate-600"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name || branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="rounded-xl bg-rose-50 p-4 text-rose-800 ring-1 ring-rose-200">
            {error}
          </div>
        ) : (
          <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 overflow-x-auto">
            <table className="w-full min-w-[1200px] whitespace-nowrap">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold tracking-wide text-slate-600">
                  <th className="px-3 py-3">Actions</th>
                  <th className="px-3 py-3">Booking No.</th>
                  <th className="px-3 py-3">Branch</th>
                  <th className="px-3 py-3">Sender</th>
                  <th className="px-3 py-3">Receiver</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Method</th>
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-3 py-3">Boxes</th>
                  <th className="px-3 py-3">Weight (kg)</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {cargos.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                      No cargos found.
                    </td>
                  </tr>
                ) : (
                  cargos.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/cargo/view/${c.id}`}
                            title="View"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-100 text-sky-700 ring-1 ring-sky-200 hover:bg-sky-200"
                          >
                            <SlEye className="h-3 w-3" />
                          </Link>
                          {/* EDIT MODAL BUTTON */}
                          <button
                            onClick={() => {
                              setEditingCargoId(c.id);
                              setEditModalOpen(true);
                            }}
                            title="Edit Cargo"
                            className="inline-flex items-center rounded-md bg-amber-100 p-2 text-amber-800 hover:bg-amber-200 transition"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              setSelectedShipment(c);
                              setInvoiceModalOpen(true);
                            }}
                            title="Invoice"
                            className="inline-flex items-center rounded-md bg-sky-50 p-2 text-sky-700 hover:bg-sky-100"
                          >
                            <FaFileInvoiceDollar className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium">{c.booking_no}</td>
                      <td className="px-3 py-2">{c.branch_name || "—"}</td>
                      <td className="px-3 py-2">{c.sender_name || "—"}</td>
                      <td className="px-3 py-2">{c.receiver_name || "—"}</td>
                      <td className="px-3 py-2">{c.date || "—"}</td>
                      <td className="px-3 py-2">{c.time || "—"}</td>
                      <td className="px-3 py-2">{c.shipping_method || "—"}</td>
                      <td className="px-3 py-2">{c.payment_method || "—"}</td>
                      <td className="px-3 py-2">{getBoxCount(c)}</td>
                      <td className="px-3 py-2">{c.total_weight ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${COLOR.violet}`}
                        >
                          {c.status?.name || c.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary */}
        {!loading && !error && totalCargos > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Page <b>{page}</b> of <b>{totalPages}</b> — Showing <b>{cargos.length}</b> per page (Total:{" "}
              <b>{totalCargos}</b>)
            </div>
            {totalPages > 1 && (
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <BillModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        shipment={selectedShipment}
      />
      <EditCargoModal
        open={editModalOpen}
        cargoId={editingCargoId}
        onClose={() => setEditModalOpen(false)}
        onSaved={async () => {
          setEditModalOpen(false);
          await fetchCargos(page, filter);
          // Removed Invoice Modal auto-open here as requested
        }}
      />
    </section>
  );
}