import React, { useEffect, useState, useMemo } from "react";
import { getVisaTypes } from "../../../services/coreService";
import { Toaster } from "react-hot-toast";
import CreateVisaType from "./CreateVisaType"; // IMPORT THE FORM
import { IoClose } from "react-icons/io5";

/* Badge Component */
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

export default function VisaTypeList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const list = await getVisaTypes();
      setRows(Array.isArray(list) ? list : list?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);
  const resolveActive = (val) => {
  if (val === true) return true;
  if (val === false) return false;

  const s = String(val ?? "").trim().toLowerCase();

  if (s === "1" || s === "active" || s === "true") return true;
  if (s === "0" || s === "inactive" || s === "false") return false;

  const n = Number(s);
  if (!Number.isNaN(n)) return n === 1;

  return false;
};


  return (
    <section className="mx-auto w-full p-4">
      <Toaster />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-xl font-semibold text-gray-900">Visa Types</h1>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          + Add Visa Type
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div
              key={i}
              className="border rounded-xl p-5 bg-white animate-pulse"
            >
              <div className="h-4 w-2/3 bg-gray-200 mb-3" />
              <div className="h-4 w-1/3 bg-gray-200" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 py-10">
            No Visa Types found.
          </p>
        ) : (
          rows.map((r, idx) => {
            const active = resolveActive(r.status);

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

            <CreateVisaType
              onSuccess={async () => {
                setModalOpen(false);
                await fetchRows(); // refresh list
              }}
              onClose={() => setModalOpen(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
