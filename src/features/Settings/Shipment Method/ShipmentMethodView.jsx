import React, { useEffect, useMemo, useState } from "react";
import { getShipmentMethods } from "../../../services/coreService";
import ShipmentMethodCreate from "./ShipmentMethodCreate";
import { IoClose } from "react-icons/io5";

function classNames(...cls) {
  return cls.filter(Boolean).join(" ");
}

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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  // 6 rows × 5 columns = 30 cards per page
  const pageSize = 30;

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter === "1" || statusFilter === "0") {
        params.status = Number(statusFilter);
      }
      const list = await getShipmentMethods(params);
      setRows(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r?.name ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const pageRows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <section className="mx-auto w-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Shipment Methods</h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>

          <button
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            + Add Method
          </button>
        </div>
      </div>

      {/* Cards Grid (5 columns, 6 rows = 30 cards per page) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse border rounded-xl p-5">
              <div className="h-4 w-2/3 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
            </div>
          ))
        ) : pageRows.length === 0 ? (
          <p className="text-gray-500 col-span-full text-center py-10">
            No shipment methods found.
          </p>
        ) : (
          pageRows.map((r, idx) => {
            const isActive =
              r?.status === 1 ||
              r?.status === "1" ||
              r?.status === true ||
              r?.status === "active" ||
              r?.status === "Active";

            return (
              <div
                key={idx}
                className="border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {r.name}
                </h2>
                <Badge ok={isActive} />
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
            className="px-4 py-2 rounded-xl border bg-white text-gray-700 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Prev
          </button>

          <span className="text-sm font-medium text-gray-700">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-xl border bg-white text-gray-700 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-6 relative">
            <button
              onClick={() => setShowCreate(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <IoClose size={22} />
            </button>

          <ShipmentMethodCreate
  onSuccess={() => {
    setShowCreate(false); // close modal
    fetchRows();          // refresh list instantly
  }}
/>
          </div>
        </div>
      )}
    </section>
  );
}
