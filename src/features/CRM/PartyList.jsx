import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  FiPlus, 
  FiHome, 
  FiEye, 
  FiEdit, 
  FiSearch, 
  FiFilter 
} from "react-icons/fi";
import { Toaster, toast } from "react-hot-toast";

// --- SERVICES ---
import { getParties, getPartiesByCustomerType } from "../../services/partyService";
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
const getRowId = (x) => String(x?.id ?? x?.party_id ?? x?.partyId ?? x?.uuid ?? x?._id ?? "");

const Skel = ({ w = "100%", h = "20px" }) => (
  <div className="animate-pulse bg-gray-200 rounded" style={{ width: w, height: h }}></div>
);

const TableSkeleton = () => (
  <>
    {[1, 2, 3, 4, 5].map((i) => (
      <tr key={i} className="border-b border-gray-100">
        <td className="p-4"><Skel w="40px" /></td>
        <td className="p-4"><Skel w="120px" /></td>
        <td className="p-4"><Skel w="100px" /></td>
        <td className="p-4"><Skel w="150px" /></td>
        <td className="p-4"><Skel w="80px" /></td>
        <td className="p-4"><Skel w="80px" /></td>
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
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10); 
  const [meta, setMeta] = useState({ last_page: 1, total: 0, from: 0, to: 0 });
  
  // Edit Modal State
  const [editingPartyId, setEditingPartyId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

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
    try {
      const params = { 
        page, 
        per_page: perPage, 
        search: search || undefined 
      };

      let res;
      if (selectedType) {
        res = await getPartiesByCustomerType(selectedType, params);
      } else {
        res = await getParties(params);
      }

      const list = normalizeList(res?.items || res);
      const backendMeta = res?.meta || res?.pagination;
      const hasServerPagination = backendMeta || (res?.current_page && res?.last_page);

      if (hasServerPagination) {
        setParties(list);
        setMeta({
          last_page: backendMeta?.last_page || res.last_page || 1,
          total: backendMeta?.total || res.total || 0,
          from: backendMeta?.from || res.from || 0,
          to: backendMeta?.to || res.to || 0
        });
      } else {
        // Client-side fallback
        const total = list.length;
        const start = (page - 1) * perPage;
        const end = start + perPage;
        setParties(list.slice(start, end));
        setMeta({
          last_page: Math.ceil(total / perPage) || 1,
          total: total,
          from: start + 1,
          to: Math.min(end, total)
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
  const handleEdit = (id) => {
    setEditingPartyId(id);
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingPartyId(null);
  };

  const handleSuccess = () => {
    handleCloseModal();
    loadParties();
    toast.success("Party updated successfully.");
  };

  const handlePerPageChange = (e) => {
    setPerPage(Number(e.target.value));
    setPage(1);
  };

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />
      
      <div className="mx-auto w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Link to="/dashboard" className="hover:text-indigo-600 flex items-center gap-1">
                <FiHome /> Home
              </Link>
              <span>/</span>
              <span className="text-gray-800">Parties</span>
            </nav>
          </div>
          
          {/* ✅ UPDATED LINK HERE */}
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
                onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
              >
                <option value="">All Types</option>
                {types.map(t => (
                  <option key={getId(t)} value={getId(t)}>{t.name || t.title}</option>
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
                    <tr key={getRowId(party)} className="hover:bg-gray-50 transition">
                      <td className="p-4">
                        {meta.from ? meta.from + index : (page - 1) * perPage + index + 1}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{party.name}</div>
                        <div className="text-xs text-gray-400">{party.email || ""}</div>
                      </td>
                      <td className="p-4">{party.phone || party.contact_number || "—"}</td>
                      <td className="p-4 max-w-xs truncate" title={party.address}>
                        {party.address || `${party.city || ""}, ${party.country?.name || ""}`}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          String(party.customer_type_id) === "1" || party.customer_type?.name === "Sender"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {party.customer_type?.name || (String(party.customer_type_id) === "1" ? "Sender" : "Receiver")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            to={`/crm/view-party/${getRowId(party)}`}
                            className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            title="View Details"
                          >
                            <FiEye />
                          </Link>
                          <button 
                            onClick={() => handleEdit(getRowId(party))}
                            className="rounded p-2 text-indigo-600 hover:bg-indigo-50"
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
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
                Page <span className="font-medium">{page}</span> of <span className="font-medium">{meta.last_page || 1}</span>
                {meta.total > 0 && <span className="ml-1">({meta.total} total)</span>}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
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

      {/* Edit Modal */}
      {showEditModal && editingPartyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Party</h3>
              <button 
                onClick={handleCloseModal}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <EditParty 
                partyId={editingPartyId}
                onClose={handleCloseModal}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}