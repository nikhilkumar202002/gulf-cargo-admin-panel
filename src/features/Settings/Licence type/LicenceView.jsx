import React, { useEffect, useState, useMemo } from "react";
import { getLicenseTypes } from "../../../services/coreService";
import LicenceCreate from "./LicenceCreate";
import { Toaster, toast } from "react-hot-toast";
import { IoClose } from "react-icons/io5";

function classNames(...cls) {
  return cls.filter(Boolean).join(" ");
}

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

export default function LicenceView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const list = await getLicenseTypes();
      setRows(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusFilter !== "all") {
      data = data.filter((r) => String(r.status) === statusFilter);
    }
    if (query.trim()) {
      data = data.filter((r) =>
        r.type_name?.toLowerCase().includes(query.toLowerCase())
      );
    }
    return data;
  }, [rows, query, statusFilter]);

  const handleCreateSuccess = () => {
    toast.success("New license type added successfully!");
    setCreateModalOpen(false);
    fetchRows();
  };

  return (
    <section className="mx-auto w-full">
      <Toaster position="top-right" />

      {/* Header / Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h1 className="text-xl font-semibold text-gray-900">License Types</h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full sm:w-60 rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />

          <button
            onClick={() => setCreateModalOpen(true)}
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            + Add License
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {loading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="border rounded-xl p-5 animate-pulse bg-white">
              <div className="h-4 w-2/3 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 col-span-full text-center py-10">
            No license types found.
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
                  {r.type_name}
                </h2>
                <StatusBadge active={active} />
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <IoClose size={22} />
            </button>

            <LicenceCreate
              onSuccess={handleCreateSuccess}
              onClose={() => setCreateModalOpen(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
