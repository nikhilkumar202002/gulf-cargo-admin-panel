import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiPlus,
  FiHome,
  FiEye,
  FiEdit,
  FiSearch,
  FiFilter,
  FiTrash,
  FiPhone,
  FiFileText,
  FiDownload,
  FiUser,
  FiMapPin,
  FiMoreHorizontal, // New icon for actions if needed
} from "react-icons/fi";
import { Toaster, toast } from "react-hot-toast";
import ViewParty from "./ViewParty";

// --- SERVICES ---
import {
  getParties,
  getPartiesByCustomerType,
  deleteParty,
} from "../../services/partyService";
import { getActiveCustomerTypes } from "../../services/coreService";

// --- COMPONENTS ---
import EditParty from "./EditParties";
import "../Styles/styles.css";

/* ---------------- Utility ---------------- */
const normalizeList = (p) => {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.data?.parties)) return p.data.parties;
  if (Array.isArray(p?.parties)) return p.parties;
  if (Array.isArray(p?.data?.data)) return p.data.data;
  return [];
};

const getId = (o) => String(o?.id ?? o?._id ?? o?.code ?? o?.uuid ?? "");
const getRowId = (x) =>
  String(x?.id ?? x?.party_id ?? x?.partyId ?? x?.uuid ?? x?._id ?? "");

// --- UI HELPERS ---

// Small Avatar for Table
const TableAvatar = ({ name }) => {
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Generate a consistent color based on the name length
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const colorClass = colors[name?.length % colors.length] || colors[0];

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${colorClass}`}
    >
      {initials}
    </div>
  );
};

// Skeleton Loader
const TableSkeleton = () => (
  <>
    {[1, 2, 3, 4, 5].map((i) => (
      <tr key={i} className="border-b border-gray-50">
        <td className="p-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100"></div>
        </td>
        <td className="p-4">
          <div className="mb-2 h-4 w-32 animate-pulse rounded bg-gray-100"></div>
          <div className="h-3 w-20 animate-pulse rounded bg-gray-100"></div>
        </td>
        <td className="p-4">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-100"></div>
        </td>
        <td className="p-4">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-100"></div>
        </td>
        <td className="p-4">
          <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100"></div>
        </td>
        <td className="p-4">
          <div className="flex justify-end gap-2">
            <div className="h-8 w-8 animate-pulse rounded bg-gray-100"></div>
            <div className="h-8 w-8 animate-pulse rounded bg-gray-100"></div>
          </div>
        </td>
      </tr>
    ))}
  </>
);

export default function PartyList() {
  const navigate = useNavigate();

  // Data State
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState([]);
  const [types, setTypes] = useState([]);

  // Filters & Pagination State
  const [selectedType, setSelectedType] = useState("");
  const [search, setSearch] = useState("");
  const [phoneFilter, setPhoneFilter] = useState(""); // Phone Filter State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState({ last_page: 1, total: 0, from: 0, to: 0 });

  // Modal States
  const [editingPartyId, setEditingPartyId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewingParty, setViewingParty] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [deletingParty, setDeletingParty] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load Customer Types
  useEffect(() => {
    (async () => {
      try {
        const res = await getActiveCustomerTypes();
        setTypes(normalizeList(res));
      } catch (err) {
        console.error("Failed to load types", err);
      }
    })();
  }, []);

  // Load Parties
  const loadParties = async () => {
    setLoading(true);
    const trimmedSearch = search.trim();
    const trimmedPhone = phoneFilter.trim();

    try {
      const params = {
        page,
        per_page: perPage,
        search: trimmedSearch || undefined,
        phone: trimmedPhone || undefined, // Send phone param to API
        contact_number: trimmedPhone || undefined,
      };

      let res;
      if (selectedType) {
        res = await getPartiesByCustomerType(selectedType, params);
      } else {
        res = await getParties(params);
      }

      let list = normalizeList(res?.items || res);
      const backendMeta = res?.meta || res?.pagination;
      const hasServerPagination =
        backendMeta || (res?.current_page && res?.last_page);

      if (hasServerPagination) {
        setParties(list);
        setMeta({
          last_page: backendMeta?.last_page || res.last_page || 1,
          total: backendMeta?.total || res.total || 0,
          from: backendMeta?.from || res.from || 0,
          to: backendMeta?.to || res.to || 0,
        });
      } else {
        // --- Client Side Filtering Fallback ---
        let filteredList = list;

        // Name/City Search
        if (trimmedSearch) {
          const lowerSearch = trimmedSearch.toLowerCase();
          filteredList = filteredList.filter(
            (p) =>
              (p.name && p.name.toLowerCase().includes(lowerSearch)) ||
              (p.city && p.city.toLowerCase().includes(lowerSearch)) ||
              (p.address && p.address.toLowerCase().includes(lowerSearch))
          );
        }

        // Phone Search (Client Side)
        if (trimmedPhone) {
          filteredList = filteredList.filter((p) => {
            const num = p.phone || p.contact_number || "";
            return num.includes(trimmedPhone);
          });
        }

        const total = filteredList.length;
        const start = (page - 1) * perPage;
        const end = start + perPage;
        setParties(filteredList.slice(start, end));
        setMeta({
          last_page: Math.ceil(total / perPage) || 1,
          total: total,
          from: start + 1,
          to: Math.min(end, total),
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load parties.");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when page/type/perPage changes
  useEffect(() => {
    loadParties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedType, perPage]);

  // Debounce Search & Phone Filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadParties();
    }, 500); // 500ms delay
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, phoneFilter]); // Added phoneFilter to dependency array

  // --- Handlers ---
  const handleView = (id) => {
    const partyToView = parties.find((p) => getRowId(p) === id);
    if (partyToView) {
      setViewingParty(partyToView);
      setShowViewModal(true);
    } else {
      toast.error("Party details not found.");
    }
  };

  const handleEdit = (id) => {
    setEditingPartyId(id);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingPartyId(null);
    if (showViewModal) {
        setShowViewModal(false);
        setViewingParty(null);
    }
  };

  const handleSuccess = () => {
    handleCloseEditModal();
    loadParties();
    toast.success("Party updated successfully.");
  };

  const handleDeleteClick = (party) => {
    setDeletingParty(party);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingParty) return;
    const partyId = getRowId(deletingParty);
    try {
      await toast.promise(deleteParty(partyId), {
        loading: "Deleting...",
        success: "Deleted successfully!",
        error: (e) => e?.response?.data?.message || "Failed to delete.",
      });
      setShowDeleteModal(false);
      setDeletingParty(null);
      loadParties();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen  pb-20 font-sans text-slate-800">
      <Toaster position="top-right" />

      <div className="mx-auto w-full">
        {/* Header Section */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Customer Management
            </h1>
            <nav className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <Link
                to="/dashboard"
                className="flex items-center gap-1 hover:text-indigo-600"
              >
                <FiHome /> Home
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-800">Parties</span>
            </nav>
          </div>

          <Link
            to="/customers/create"
            className="group inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-lg focus:ring-4 focus:ring-indigo-100"
          >
            <FiPlus className="transition-transform group-hover:rotate-90" size={18} />
            Add New Party
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-12">
          {/* Text Search */}
          <div className="relative md:col-span-5">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <FiSearch className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search Name, City..."
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Phone Filter (Requested) */}
          <div className="relative md:col-span-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <FiPhone className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Filter by Phone..."
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
            />
          </div>

          {/* Customer Type Dropdown */}
          <div className="relative md:col-span-3">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <FiFilter className="h-4 w-4 text-slate-400" />
            </div>
            <select
              className="block w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm text-slate-800 transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              {types.map((t) => (
                <option key={getId(t)} value={getId(t)}>
                  {t.name || t.title}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Modern Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-slate-500 text-xs">
                    Party / Email
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-slate-500 text-xs">
                    Contact
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-slate-500 text-xs">
                    Location
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-slate-500 text-xs">
                    Role
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-slate-500 text-xs text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <TableSkeleton />
                ) : parties.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <FiUser size={24} />
                        </div>
                        <h3 className="mt-3 text-sm font-medium text-slate-900">
                          No parties found
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Try adjusting your search or filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  parties.map((party) => (
                    <tr
                      key={getRowId(party)}
                      className="group transition-colors hover:bg-slate-50/80"
                    >
                      {/* Name & Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <TableAvatar name={party.name} />
                          <div>
                            <div className="font-semibold text-slate-900">
                              {party.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {party.email || "No email provided"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-2 font-medium text-slate-700">
                             {party.phone || party.contact_number || "—"}
                          </span>
                          {party.whatsapp_number && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                               WA: {party.whatsapp_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-6 py-4">
                        <div className="max-w-[200px]">
                           <div className="flex items-start gap-1.5 text-slate-600">
                               <FiMapPin className="mt-0.5 shrink-0 text-slate-400" size={14}/>
                               <span className="truncate" title={party.address}>
                                   {party.city ? `${party.city}, ` : ''}{party.country?.name || party.country || "—"}
                               </span>
                           </div>
                           <div className="pl-5 text-xs text-slate-400 truncate mt-0.5" title={party.address}>
                                {party.address}
                           </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                            String(party.customer_type_id) === "1" ||
                            party.customer_type?.name === "Sender"
                              ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                              : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                          }`}
                        >
                          {party.customer_type?.name ||
                            (String(party.customer_type_id) === "1"
                              ? "Sender"
                              : "Receiver")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleView(getRowId(party))}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
                            title="View Details"
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(getRowId(party))}
                            className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 transition"
                            title="Edit"
                          >
                            <FiEdit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(party)}
                            className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 transition"
                            title="Delete"
                          >
                            <FiTrash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Show</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 py-1.5 pl-3 pr-8 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
                <span className="font-semibold text-slate-900">{meta.last_page || 1}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (meta.last_page || 1) || loading}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingPartyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Edit Party
              </h3>
              <button
                onClick={handleCloseEditModal}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>
            <div className="h-full overflow-y-auto p-6 pb-20">
              <EditParty
                partyId={editingPartyId}
                onClose={handleCloseEditModal}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 shrink-0">
              <h3 className="text-lg font-semibold text-slate-900">
                Party Details
              </h3>
              <button
                onClick={() => {
                   setShowViewModal(false);
                   setViewingParty(null);
                }}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
               <ViewParty id={getRowId(viewingParty)} isModalView={true} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && deletingParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <FiTrash size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Confirm Deletion</h3>
              <p className="mt-2 text-slate-500">
                Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingParty.name}</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex border-t border-slate-100 bg-slate-50 p-4 gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}