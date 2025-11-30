import React, { useEffect, useMemo, useState } from "react";
import { getShipmentStatuses } from "../../../services/coreService";
import { IoClose } from "react-icons/io5";
import StatusCreate from "./StatusCreate";
import toast, { Toaster } from "react-hot-toast";

const classNames = (...cls) => cls.filter(Boolean).join(" ");

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

const resolveActive = (val) => {
  const s = String(val ?? "").toLowerCase();
  return s === "1" || s === "active" || s === "true";
};

export default function ShipmentStatusView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);

  const pageSize = 30;

  const fetchRows = async () => {
    setLoading(true);
    try {
      const list = await getShipmentStatuses();
      setRows(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    return rows.filter((r) =>
      (r?.name ?? "").toLowerCase().includes(query.toLowerCase())
    );
  }, [rows, query]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const pageRows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <section className="mx-auto w-full">

      <Toaster position="top-right" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h1 className="text-xl font-semibold text-gray-900">
          Shipment Statuses
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-60 rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />

          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm"
          >
            + Add Status
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {loading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse border rounded-xl p-5">
              <div className="h-4 w-2/3 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
            </div>
          ))
        ) : pageRows.length === 0 ? (
          <p className="col-span-full text-center py-10 text-gray-500">
            No shipment statuses found.
          </p>
        ) : (
          pageRows.map((r, idx) => (
            <div
              key={idx}
              className="border rounded-xl p-5 shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {r.name}
              </h2>

              <StatusBadge active={resolveActive(r?.status)} />

        
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-xl border bg-white disabled:opacity-50"
          >
            Prev
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 rounded-xl border bg-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      <StatusCreate
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            fetchRows();
            setCreateOpen(false);
            toast.success("Shipment status created!");
          }}
      />

    </section>
  );
}
