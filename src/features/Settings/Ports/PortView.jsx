import React, { useEffect, useMemo, useState } from "react";
import { getPorts } from "../../../services/coreService"; 
import PortCreate from "./PortCreate";
import { IoClose } from "react-icons/io5";
import toast from "react-hot-toast"; 
import { Link } from "react-router-dom";

// Utilities
const classNames = (...cls) => cls.filter(Boolean).join(" ");

// Status Badge
const StatusBadge = ({ active }) => (
  <span
    className={classNames(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
      active
        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
        : "bg-gray-100 text-gray-700 ring-gray-400/20"
    )}
  >
    <span
      className={classNames(
        "mr-1 h-1.5 w-1.5 rounded-full",
        active ? "bg-emerald-500" : "bg-gray-400"
      )}
    />
    {active ? "Active" : "Inactive"}
  </span>
);

// Resolve active/inactive
const resolveRowActive = (row) => {
  const status = row?.status ?? row?.is_active;
  if (status === true) return true;
  if (status === false) return false;

  const s = String(status).toLowerCase();
  if (s === "1" || s === "active") return true;
  if (s === "0" || s === "inactive") return false;

  const n = Number(s);
  return !Number.isNaN(n) && n === 1;
};

export default function PortView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination – 6 rows × 5 columns = 30 cards per page
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  const [showCreate, setShowCreate] = useState(false);

  // Fetch rows
  const fetchRows = async () => {
    setLoading(true);
    try {
      const list = await getPorts();
      setRows(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  // Filters
  const filtered = useMemo(() => {
    let list = [...rows];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) => (r?.name ?? "").toLowerCase().includes(q));
    }

    if (statusFilter === "1") {
      list = list.filter((r) => resolveRowActive(r) === true);
    } else if (statusFilter === "0") {
      list = list.filter((r) => resolveRowActive(r) === false);
    }

    return list;
  }, [rows, query, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / pageSize);

  const pageRows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <section className="mx-auto w-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Ports</h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Search */}
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name…"
            className="w-full sm:w-60 rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>

          {/* Add New */}
        <button
              onClick={() => setShowCreate(true)}
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
            >
              + Add Port
            </button>
        </div>
      </div>

      {/* Cards Grid – 5 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {loading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse border rounded-xl p-5">
              <div className="h-4 w-2/3 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
            </div>
          ))
        ) : pageRows.length === 0 ? (
          <p className="text-gray-500 col-span-full text-center py-10">
            No ports found.
          </p>
        ) : (
          pageRows.map((r, idx) => {
            const active = resolveRowActive(r);

            return (
              <div
                key={idx}
                className="border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {r.name}
                </h2>

                <StatusBadge active={active} />
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-xl border bg-white text-gray-700 text-sm disabled:opacity-50"
          >
            Prev
          </button>

          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-xl border bg-white text-gray-700 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {showCreate && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-6 relative">

      <button
        onClick={() => setShowCreate(false)}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
      >
        <IoClose size={22} />
      </button>

      <PortCreate
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          fetchRows();
          setShowCreate(false);
        }}
      />
    </div>
  </div>
)}
    </section>
  );
}
