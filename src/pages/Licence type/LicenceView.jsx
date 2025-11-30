import React, { useEffect, useState } from "react";
import { getLicenseTypes } from "../../api/licenceType";
import LicenceCreate from "./LicenceCreate";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";

function classNames(...cls) {
  return cls.filter(Boolean).join(" ");
}

const Spinner = ({ className = "h-4 w-4 text-indigo-600" }) => (
  <svg className={classNames("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const StatusBadge = ({ active }) => (
  <span
    className={classNames(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
      active ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
             : "bg-gray-100 text-gray-700 ring-gray-400/20"
    )}
  >
    <span className={classNames("mr-1 h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-gray-400")} />
    {active ? "Active" : "Inactive"}
  </span>
);

// Fetching license types
const fetchRows = async (setLoading, setRows, setMsg) => {
  setLoading(true);
  setMsg({ text: "", variant: "" });
  try {
    const list = await getLicenseTypes(); // Fetch license types
   
    setRows(Array.isArray(list) ? list : []);
  } catch (err) {
   
    setMsg({
      text: err?.response?.data?.message || "Failed to load license types.",
      variant: "error",
    });
  } finally {
    setLoading(false);
  }
};

export default function LicenceView() {
  const [rows, setRows] = useState([]); // Ensure initial state is an empty array
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRows(setLoading, setRows, setMsg); // Fetch license types
  }, []);

  useEffect(() => {
    if (location.state?.toast) {
      toast.success(location.state.toast.message || "Success!");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleCreationSuccess = () => {
    setCreateModalOpen(false);
    fetchRows(setLoading, setRows, setMsg); // Refetch data
    toast.success("New license type has been added.");
  };


  return (
    <section className="mx-auto max-w-6xl p-4">
      <Toaster position="top-right" />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">License Types</h1>

          <div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
            {/* Search */}
            <label className="relative w-full sm:max-w-xs">
              <span className="sr-only">Search by name</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
              <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </label>

            {/* Status filter */}
            <label className="relative">
              <span className="sr-only">Filter by status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-w-[11rem] appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                title="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="1">Active</option>      {/* 1 = Active */}
                <option value="0">Inactive</option>    {/* 0 = Inactive */}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
              </svg>
            </label>

            {/* Add Button */}
            <button type="button" onClick={() => setCreateModalOpen(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20">
              Add License Type
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-700">
              <tr className="border-b border-gray-200">
                <th className="w-16 px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="w-40 px-4 py-3 font-semibold">Status</th>
                {/* <th className="w-44 px-4 py-3 font-semibold">Actions</th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    No license types found.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const active = r.status === "Active";  // Check for "Active" status
                  return (
                    <tr key={r?.id ?? idx}>
                      <td className="px-4 py-4 text-gray-700">{idx + 1}</td>
                      <td className="px-4 py-4 text-gray-900">{r?.type_name ?? "-"}</td>
                      <td className="px-4 py-4">
                        <StatusBadge active={active} />
                      </td>
                    
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0" onClick={() => setCreateModalOpen(false)} aria-hidden="true"></div>
          <div className="relative w-full max-w-md rounded-2xl bg-gray-50 p-4 shadow-xl">
            <LicenceCreate
              onSuccess={handleCreationSuccess}
              onClose={() => setCreateModalOpen(false)}
            />
          </div>
        </div>
      )}

    </section>
  );
}
