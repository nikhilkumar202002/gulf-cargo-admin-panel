import React, { useEffect, useState, useMemo } from "react";
import { getPaymentMethods } from "../../../services/coreService";
import CreatePaymentType from "./CreatePaymentType";
import { IoClose } from "react-icons/io5";

/* ------------------ Badge ------------------ */
const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
      active
        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
        : "bg-gray-100 text-gray-700 ring-gray-400/20"
    }`}
  >
    <span
      className={`mr-1 h-1.5 w-1.5 rounded-full ${
        active ? "bg-emerald-500" : "bg-gray-400"
      }`}
    />
    {active ? "Active" : "Inactive"}
  </span>
);

/* ------------------ MAIN VIEW ------------------ */
export default function PaymentTypeList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  /* Fetch Data */
  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await getPaymentMethods();
      setRows(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.log("Error fetching:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  /* Filter Logic */
  const filtered = useMemo(() => {
    let data = rows;

    if (statusFilter !== "all")
      data = data.filter((r) => String(r.status) === statusFilter);

    if (query.trim())
      data = data.filter((r) =>
        r.name?.toLowerCase().includes(query.toLowerCase())
      );

    return data;
  }, [rows, query, statusFilter]);

  return (
    <section className="mx-auto w-full p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-xl font-semibold text-gray-900">Payment Methods</h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Search */}
          <input
            type="text"
            placeholder="Search…"
            className="w-full sm:w-60 rounded-xl border border-gray-300 px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>

          {/* ADD NEW TYPE button */}
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            + Add New Type
          </button>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {loading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="border rounded-xl p-5 bg-white animate-pulse">
              <div className="h-4 w-2/3 bg-gray-200 rounded mb-3" />
              <div className="h-4 w-1/3 bg-gray-200 rounded" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 py-10">
            No payment methods found.
          </p>
        ) : (
          filtered.map((r, idx) => {
            const active =
              r.status === 1 ||
              r.status === "1" ||
              r.status === true ||
              String(r.status).toLowerCase() === "active";

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

      {/* ---------------- MODAL ---------------- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setModalOpen(false)}
            >
              <IoClose size={22} />
            </button>

            <CreatePaymentType
              onSuccess={async () => {
                setModalOpen(false);
                await fetchRows(); // Refresh list
              }}
              onClose={() => setModalOpen(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
