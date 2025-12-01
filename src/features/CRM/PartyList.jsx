import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiPlus,
  FiHome,
  FiEye,
  FiEdit,
  FiSearch,
  FiFilter,
  FiTrash, // Import for Delete icon
  FiMail,
  FiPhone,
  FiMapPin,
  FiFileText,
  FiDownload,
  FiHash,
  FiUser,
  FiArrowLeft,
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

const Skel = ({ w = "100%", h = "20px" }) => (
  <div
    className="animate-pulse bg-gray-200 rounded"
    style={{ width: w, height: h }}
  ></div>
);

const TableSkeleton = () => (
  <>
    {[1, 2, 3, 4, 5].map((i) => (
      <tr key={i} className="border-b border-gray-100">
        <td className="p-4">
          <Skel w="40px" />
        </td>
        <td className="p-4">
          <Skel w="120px" />
        </td>
        <td className="p-4">
          <Skel w="100px" />
        </td>
        <td className="p-4">
          <Skel w="150px" />
        </td>
        <td className="p-4">
          <Skel w="80px" />
        </td>
        <td className="p-4">
          <Skel w="80px" />
        </td>
      </tr>
    ))}
  </>
);

// --- VIEW UTILS (From provided ViewParty.jsx design) ---
const s = (v, fallback = "—") =>
  v === null || v === undefined || String(v).trim() === ""
    ? fallback
    : String(v);

const pick = (obj, keys, fallback = "—") => {
  for (const k of keys) {
    const path = String(k).split(".");
    let cur = obj;
    for (const p of path) cur = cur?.[p];
    if (cur !== undefined && cur !== null && String(cur).trim() !== "")
      return cur;
  }
  return fallback;
};

const Pill = ({ children, tone = "slate" }) => {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    red: "bg-rose-50 text-rose-700 ring-rose-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
        tones[tone] || tones.slate
      }`}
    >
      {children}
    </span>
  );
};

const Card = ({ title, icon, children, className = "" }) => (
  <div
    className={`rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm ${className}`}
  >
    <div className="mb-3 flex items-center gap-2 text-slate-500">
      {icon}
      <h3 className="text-xs font-semibold uppercase tracking-wide">{title}</h3>
    </div>
    <div className="space-y-2 text-sm">{children}</div>
  </div>
);

const Row = ({ label, value, mono = false, align = "right" }) => {
  const alignCls =
    align === "left"
      ? "text-left"
      : align === "center"
      ? "text-center"
      : "text-right";
  return (
    <div className="grid grid-cols-[110px,1fr] items-start gap-3">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span
        className={[
          "min-w-0 font-medium text-slate-800", // allow the cell to actually shrink
          alignCls,
          mono ? "font-mono" : "",
          "break-all",
          "whitespace-pre-wrap",
        ].join(" ")}
      >
        {value || "—"}
      </span>
    </div>
  );
};

const Avatar = ({ name = "—" }) => {
  const initials = (name || "—")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-800 to-indigo-600 text-lg font-semibold text-white shadow-sm ring-1 ring-slate-300">
      {initials}
    </div>
  );
};

// --- MAIN MODAL CONTENT COMPONENT ---
const PartyDetailsModalContent = ({ party, handleEdit, onClose }) => {
  if (!party) {
    return (
      <div className="p-6 text-center text-red-500">
        Error: Party data missing.
      </div>
    );
  }

  const {
    name = "—",

    contact_number = "",
    whatsapp_number = "",
    status = "unknown",
    address = "",
    created_at = "",
    updated_at = "",
  } = party;

  const statusTone =
    s(status).toLowerCase() === "active"
      ? "green"
      : s(status).toLowerCase() === "inactive"
      ? "red"
      : "slate";

  const branchName = pick(party, ["branch.name", "branch_name"], "—");
  const branchId = pick(party, ["branch.id", "branch_id"], "—");
  const customerType = pick(
    party,
    ["customer_type.customer_type", "customer_type.name", "customer_type"],
    "—"
  );
  const customerTypeId = pick(
    party,
    ["customer_type.id", "customer_type_id"],
    "—"
  );
  const docType = pick(
    party,
    ["document_type.document_type", "document_type.name", "document_type"],
    "—"
  );
  const docTypeId = pick(party, ["document_type.id", "document_type_id"], "—");
  const docId = pick(party, ["document_id"], "—");
  const country = pick(party, ["country.name", "country"], "—");
  const state = pick(party, ["state.name", "state"], "—");
  const district = pick(party, ["district.name", "district"], "—");
  const city = pick(party, ["city"], "—");
  const postalCode = pick(party, ["postal_code", "pincode"], "—");
  const documents = Array.isArray(party.documents) ? party.documents : [];

  // Determine if the party is a Receiver (ID 2 is commonly used for receivers)
  const isReceiver =
    String(customerTypeId) === "2" ||
    (customerType && customerType.toLowerCase().includes("receiver"));

  return (
    <div className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-slate-50/60 p-6">
      {/* Hero header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 md:flex-row md:items-center md:justify-between -m-6 mb-6 rounded-t-xl">
        <div className="flex items-center gap-4">
          <Avatar name={name} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">
                {name || "—"}
              </h1>
              <Pill tone={statusTone}>{status || "—"}</Pill>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              {contact_number && (
                <span className="inline-flex items-center gap-1">
                  <FiPhone className="text-slate-400" /> {contact_number}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-slate-400">
                <FiHash /> ID: {party.id || getRowId(party)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* At a glance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Identity" icon={<FiUser />}>
          <Row label="Customer Type" value={s(customerType)} />
          <Row label="Branch" value={s(branchName)} />
          <Row label="Status" value={s(status)} />
        </Card>

        <Card title="Document" icon={<FiFileText />}>
          <Row label="Type" value={s(docType)} />
          <Row label="Document No." value={s(docId)} mono />
        </Card>

        <Card title="Contact" icon={<FiPhone />}>
          <Row label="Phone" value={s(contact_number)} />
          <Row label="WhatsApp" value={s(whatsapp_number)} />
        </Card>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        {isReceiver ? "Delivery Location" : "Additional Info"}
      </h2>

      {/* Details grid: Conditional display based on role */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Location (Receiver Only) */}
        {isReceiver && (
          <Card title="Location" icon={<FiMapPin />} className="md:col-span-1">
            <Row label="Country" value={s(country)} />
            <Row label="State" value={s(state)} />
            <Row label="District" value={s(district)} />
            <Row label="City" value={s(city)} />
            <Row label="Postal Code" value={s(postalCode)} mono />
          </Card>
        )}

        {/* Address (Receiver Only) */}
        {isReceiver && (
          <Card title="Address" icon={<FiHome />} className="md:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-sm text-slate-800">
              {s(address)}
            </div>
          </Card>
        )}

        {/* Timeline / Dates (Display for both, but positioned here) */}
        <Card
          title="Timeline"
          icon={<FiHash />}
          className={isReceiver ? "md:col-span-1" : "md:col-span-3"}
        >
          <Row label="Party ID" value={getRowId(party)} mono />
          <Row
            label="Created"
            value={s(created_at ? new Date(created_at).toLocaleString() : "—")}
          />
          <Row
            label="Updated"
            value={s(updated_at ? new Date(updated_at).toLocaleString() : "—")}
          />
        </Card>
      </div>

      {/* Documents */}
      <div className="mt-8">
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-500">
            <FiFileText />
            <h3 className="text-xs font-semibold uppercase tracking-wide">
              Documents
            </h3>
          </div>

          {Array.isArray(documents) && documents.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {documents.map((url, i) => {
                const ext = (url.split(".").pop() || "").toUpperCase();
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                        <FiFileText />
                      </div>
                      <div className="leading-tight">
                        <div className="font-medium text-slate-800">
                          Document {i + 1}
                        </div>
                        <div className="text-xs text-slate-500 break-all">
                          {url}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill tone="blue">{ext || "FILE"}</Pill>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black"
                      >
                        <FiDownload /> Open
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
              No documents uploaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function PartyList() {
  const navigate = useNavigate();

  // Data State
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState([]);
  const [types, setTypes] = useState([]);

  // Filters & Pagination State
  const [selectedType, setSelectedType] = useState("");
  const [search, setSearch] = useState(""); // <-- search state is here
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState({ last_page: 1, total: 0, from: 0, to: 0 });

  // Edit Modal State
  const [editingPartyId, setEditingPartyId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // View Modal State (New)
  const [viewingParty, setViewingParty] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Delete Modal State
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
    // New: Trim whitespace from the search term
    const trimmedSearch = search.trim();

    try {
      const params = {
        page,
        per_page: perPage,
        search: trimmedSearch || undefined,
        name: trimmedSearch || undefined,
        phone: trimmedSearch || undefined,
        city: trimmedSearch || undefined,
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
        // Server-side pagination and filtering is working
        setParties(list);
        setMeta({
          last_page: backendMeta?.last_page || res.last_page || 1,
          total: backendMeta?.total || res.total || 0,
          from: backendMeta?.from || res.from || 0,
          to: backendMeta?.to || res.to || 0,
        });
      } else {
        // Client-side fallback for filtering and pagination
        if (trimmedSearch) {
          const lowercasedSearch = trimmedSearch.toLowerCase();
          list = list.filter(party => 
            (party.name && party.name.toLowerCase().includes(lowercasedSearch)) ||
            (party.phone && party.phone.includes(lowercasedSearch)) ||
            (party.contact_number && party.contact_number.includes(lowercasedSearch)) ||
            (party.city && party.city.toLowerCase().includes(lowercasedSearch)) ||
            (party.address && party.address.toLowerCase().includes(lowercasedSearch))
          );
        }

        const total = list.length;
        const start = (page - 1) * perPage;
        const end = start + perPage;
        setParties(list.slice(start, end));
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

  useEffect(() => {
    loadParties();
  }, [page, selectedType, perPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadParties();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Handlers
  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingParty(null);
  };

  const handleView = (id) => {
    const partyToView = parties.find((p) => getRowId(p) === id);
    if (partyToView) {
      setViewingParty(partyToView);
      setShowViewModal(true);
    } else {
      toast.error("Party details not found locally.");
    }
  };

  const handleEdit = (id) => {
    setEditingPartyId(id);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingPartyId(null);
    // After closing edit modal, if we came from view modal, close that too
    if (showViewModal) handleCloseViewModal();
  };

  const handleSuccess = () => {
    handleCloseEditModal();
    loadParties();
    toast.success("Party updated successfully.");
  };

  const handlePerPageChange = (e) => {
    setPerPage(Number(e.target.value));
    setPage(1);
  };

  // --- DELETE LOGIC ---
  const handleDeleteClick = (party) => {
    setDeletingParty(party);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingParty(null);
  };

  // ... inside PartyList component ...

  const confirmDelete = async () => {
    if (!deletingParty) return;

    const partyId = getRowId(deletingParty);

    try {
      // 1. Initiate the promise and wrap it with toast.promise
      await toast.promise(
        deleteParty(partyId), // This calls the API service
        {
          loading: `Deleting party ${deletingParty.name}...`,
          success: `Party ${deletingParty.name} deleted successfully!`,
          error: (e) => e?.response?.data?.message || "Failed to delete party.",
        }
      );

      // 2. Only run cleanup/refresh on successful resolution
      handleCloseDeleteModal();
      loadParties(); // Refresh list to remove the deleted party
    } catch (e) {
      // Note: Errors are typically caught and displayed by toast.promise,
      // but the catch block is still needed for any sync errors or final handling.
      console.error("Delete operation failed:", e);
    }
  };
  // --- END DELETE LOGIC ---

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />

      <div className="mx-auto w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Customer Management
            </h1>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Link
                to="/dashboard"
                className="hover:text-indigo-600 flex items-center gap-1"
              >
                <FiHome /> Home
              </Link>
              <span>/</span>
              <span className="text-gray-800">Parties</span>
            </nav>
          </div>

          <Link
            to="/customers/create"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition shadow-sm"
          >
            <FiPlus size={18} /> Add New Party
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm border border-gray-200">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone, or city..."
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative w-full md:w-64">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white pl-10 pr-8 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
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
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th className="p-4 font-semibold">#</th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Phone</th>
                  <th className="p-4 font-semibold">Address</th>
                  <th className="p-4 font-semibold">Type</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <TableSkeleton />
                ) : parties.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      No parties found.
                    </td>
                  </tr>
                ) : (
                  parties.map((party, index) => (
                    <tr
                      key={getRowId(party)}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="p-4">
                        {meta.from
                          ? meta.from + index
                          : (page - 1) * perPage + index + 1}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {party.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {party.email || ""}
                        </div>
                      </td>
                      <td className="p-4">
                        {party.phone || party.contact_number || "—"}
                      </td>
                      <td
                        className="p-4 max-w-xs truncate"
                        title={party.address}
                      >
                        {party.address ||
                          `${party.city || ""}, ${party.country?.name || ""}`}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            String(party.customer_type_id) === "1" ||
                            party.customer_type?.name === "Sender"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {party.customer_type?.name ||
                            (String(party.customer_type_id) === "1"
                              ? "Sender"
                              : "Receiver")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Now calls handleView to open the modal */}
                          <button
                            onClick={() => handleView(getRowId(party))}
                            className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            title="View Details"
                          >
                            <FiEye />
                          </button>
                          <button
                            onClick={() => handleEdit(getRowId(party))}
                            className="rounded p-2 text-indigo-600 hover:bg-indigo-50"
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteClick(party)}
                            className="rounded p-2 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <FiTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer (Pagination) */}
          <div className="flex flex-col md:flex-row items-center justify-between border-t border-gray-200 bg-gray-50 p-4 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={perPage}
                onChange={handlePerPageChange}
                className="rounded border border-gray-300 bg-white py-1 px-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Page <span className="font-medium">{page}</span> of{" "}
                <span className="font-medium">{meta.last_page || 1}</span>
                {meta.total > 0 && (
                  <span className="ml-1">({meta.total} total)</span>
                )}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (meta.last_page || 1) || loading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal (Existing) */}
      {showEditModal && editingPartyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Party
              </h3>
              <button
                onClick={handleCloseEditModal} // Ensure correct close handler
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <EditParty
                partyId={editingPartyId}
                onClose={handleCloseEditModal} // Ensure correct close handler
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal (New) */}
      {showViewModal && viewingParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Party Details
              </h3>

              <button
                onClick={handleCloseViewModal}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Inject ViewParty component here */}
            <ViewParty id={getRowId(viewingParty)} isModalView={true} />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Existing) */}
      {showDeleteModal && deletingParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-red-700">Confirm Deletion</h3>
            <p className="mt-4 text-gray-700">
              Are you sure you want to delete the party:
              <span className="font-semibold text-gray-900 ml-1">
                {deletingParty.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCloseDeleteModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 transition"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
