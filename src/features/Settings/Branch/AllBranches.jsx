import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiEye, FiEdit2, FiTrash2, FiAlertTriangle, FiX } from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";

// --- NEW SERVICE IMPORTS ---
import { getBranches, deleteBranch } from "../../../services/coreService";

/* ---------------- tiny helpers ---------------- */
const cx = (...c) => c.filter(Boolean).join(" ");
const slno = (rowIndex, meta) => (meta?.per_page || 0) * ((meta?.current_page || 1) - 1) + rowIndex + 1;

const Skel = ({ w = "100%", h = 14, rounded = 8, className = "" }) => (
  <span
    className={cx("inline-block bg-slate-200 animate-pulse", className)}
    style={{ width: typeof w === "number" ? `${w}px` : w, height: typeof h === "number" ? `${h}px` : h, borderRadius: rounded }}
    aria-hidden="true"
  />
);

const SkelRow = () => (
  <tr className="border-b">
    <td className="p-3"><Skel h={32} w={60} /></td>
    <td className="p-3"><Skel h={32} w={80} /></td>
    <td className="p-3"><Skel h={32} w={120} /></td>
    <td className="p-3"><Skel /></td>
    <td className="p-3"><Skel w={80} /></td>
    <td className="p-3"><Skel w={160} /></td>
    <td className="p-3"><Skel w={130} /></td>
    <td className="p-3"><Skel w={80} /></td>
    <td className="p-3"><Skel w={140} /></td>
    <td className="p-3"><Skel w={160} /></td>
  </tr>
);

function getPhones(b = {}) {
  const out = [];
  if (Array.isArray(b.branch_contact_numbers)) {
    for (const n of b.branch_contact_numbers) if (n && String(n).trim()) out.push(String(n).trim());
  }
  const primary = b.branch_contact_number ?? b.contact ?? "";
  if (typeof primary === "string" && primary.trim()) {
    out.push(...primary.split(/[,\|/;\s]+/g).map((t) => t.trim()).filter(Boolean));
  }
  if (b.branch_alternative_number) out.push(String(b.branch_alternative_number).trim());
  return Array.from(new Set(out.map(n => n.replace(/\s+/g, ""))));
}

export default function AllBranches() {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [branches, setBranches] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 10, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");

/* In AllBranches.jsx */

async function loadPage({ pageArg = page, perPageArg = rowsPerPage } = {}) {
  setLoading(true);
  setErr("");
  try {
    const result = await getBranches({ page: pageArg, per_page: perPageArg });
    
    if (result.items && result.meta) {
      // 1. Valid Server-side pagination
      setBranches(result.items);
      setMeta(result.meta);
    } else if (Array.isArray(result)) {
      // 2. Array Response Logic
      
      // FIX: Only slice client-side if the result is larger than the page size.
      // If result.length <= perPageArg, assume backend already returned just the specific page.
      if (result.length > perPageArg) {
        const start = (pageArg - 1) * perPageArg;
        const pageItems = result.slice(start, start + perPageArg);
        setBranches(pageItems);
        setMeta({
          current_page: pageArg,
          per_page: perPageArg,
          total: result.length,
          last_page: Math.max(1, Math.ceil(result.length / perPageArg)),
        });
      } else {
        // Assume backend handled pagination but returned raw array (no meta)
        setBranches(result);
        
        // We have to guess the meta here because the backend didn't give it to us
        setMeta({
          current_page: pageArg,
          per_page: perPageArg,
          // If we got a full page, assume there might be more. If less, we are at the end.
          total: result.length === perPageArg ? (pageArg + 1) * perPageArg : pageArg * perPageArg, 
          last_page: result.length < perPageArg ? pageArg : pageArg + 1,
        });
      }
    } else {
      setBranches([]);
    }
  } catch (e) {
    setErr(e?.message || "Failed to load branches");
    setBranches([]);
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    loadPage({ pageArg: page, perPageArg: rowsPerPage });
  }, [page, rowsPerPage]);

  const filtered = useMemo(() => {
    const t = (q || "").trim().toLowerCase();
    if (!t) return branches;
    return branches.filter((b) => {
      const hay = `${b.id ?? ""} ${b.branch_name ?? ""} ${b.branch_code ?? ""} ${b.branch_location ?? ""} ${b.branch_email ?? ""} ${b.branch_contact_number ?? ""}`.toLowerCase();
      return hay.includes(t);
    });
  }, [q, branches]);

  const showingFrom = filtered.length ? meta.per_page * (meta.current_page - 1) + 1 : 0;
  const showingTo = meta.per_page * (meta.current_page - 1) + filtered.length;

  const openDeleteModal = (branch) => {
    setDeleteTarget(branch);
    setDeleteInput("");
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteInput("");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const expectedName = deleteTarget.branch_name || "DELETE";
    if (deleteInput !== expectedName) {
      toast.error("Validation failed. Name mismatch.");
      return;
    }

    const currentFilteredCount = filtered.length;
    const branchId = deleteTarget.id;
    closeDeleteModal();

    // Use deleteBranch from service
    const deletePromise = deleteBranch(branchId)
      .then(async () => {
        const willBeEmpty = currentFilteredCount === 1 && meta.current_page > 1;
        const nextPage = willBeEmpty ? Math.max(1, meta.current_page - 1) : meta.current_page;
        if (page !== nextPage) setPage(nextPage);
        else await loadPage({ pageArg: nextPage, perPageArg: rowsPerPage });
      });

    toast.promise(deletePromise, {
      loading: 'Deleting branch...',
      success: 'Branch deleted successfully',
      error: (err) => `Error: ${err?.response?.data?.message || err?.message || 'Could not delete'}`
    });
  };

  return (
    <div className="min-h-screen flex items-start justify-center">
      <Toaster position="top-right" />

      {/* DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FiAlertTriangle className="text-red-500" /> Confirm Deletion
              </h3>
              <button onClick={closeDeleteModal} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Are you sure you want to delete <span className="font-bold text-gray-900">{deleteTarget.branch_name}</span>?</p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type <span className="text-blue-600 select-all">"{deleteTarget.branch_name || "DELETE"}"</span> to confirm</label>
                <input type="text" value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} placeholder={deleteTarget.branch_name || "DELETE"} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all" autoFocus />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button onClick={closeDeleteModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} disabled={deleteInput !== (deleteTarget.branch_name || "DELETE")} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">Delete Branch</button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-white rounded-2xl shadow-sm">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">All Branches</h2>
            <p className="text-sm text-gray-500">Manage your branches</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => { setQ(e.target.value); }} placeholder="Search…" className="pl-9 pr-3 py-2 w-72 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/10" />
            </div>
            <Link to="/branches/add" className="inline-flex items-center px-4 py-2 rounded-lg bg-black text-white hover:opacity-90">+ Add Branch</Link>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="mt-6 hidden md:block">
          <div className="overflow-hidden border rounded-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-3 font-medium w-20">SL No</th>
                    <th className="text-left p-3 font-medium">Logo</th>
                    <th className="text-left p-3 font-medium">Branch Name</th>
                    <th className="text-left p-3 font-medium">Code</th>
                    <th className="text-left p-3 font-medium">Location</th>
                    <th className="text-left p-3 font-medium">Contact</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading && <><SkelRow /><SkelRow /><SkelRow /></>}
                  {!loading && filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-gray-500">No branches found.</td></tr>}
                  {!loading && filtered.map((b, idx) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="p-3 whitespace-nowrap">{slno(idx, meta)}</td>
                      <td className="p-3">
                        {b.logo_url ? <img src={b.logo_url} alt="logo" className="h-10 w-10 rounded-md object-cover border" /> : <div className="h-10 w-10 rounded-md bg-gray-100 border" />}
                      </td>
                      <td className="p-3 max-w-[260px]">
                        <Link to={`/branches/${b.id}`} className="font-medium truncate text-blue-700 hover:underline">{b.branch_name || "-"}</Link>
                        {b.branch_name_ar && <div className="text-xs text-gray-500 truncate">{b.branch_name_ar}</div>}
                      </td>
                      <td className="p-3 whitespace-nowrap">{b.branch_code || "-"}</td>
                      <td className="p-3 max-w-[280px]"><div className="truncate">{b.branch_location || "-"}</div></td>
                      <td className="p-3 whitespace-nowrap">{getPhones(b).join(", ") || "-"}</td>
                      <td className="p-3">
                        <span className={cx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", (b.status === "Active" || b.status === 1) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700")}>
                          {b.status ?? "—"}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link to={`/branch/viewbranch/${b.id}`} className="px-2 py-1.5 rounded border hover:bg-gray-50 text-sm"><FiEye className="text-gray-700" /></Link>
                          <Link to={`/branches/edit/${b.id}`} className="px-2 py-1.5 rounded border hover:bg-gray-50 text-sm"><FiEdit2 className="text-gray-700" /></Link>
                          <button onClick={() => openDeleteModal(b)} className="px-2 py-1.5 rounded border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm" disabled={loading}><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-600">Showing {showingFrom}–{showingTo} of {meta.total}</div>
          <div className="flex items-center gap-3">
            <select className="border rounded-lg px-2 py-1" value={rowsPerPage} onChange={(e) => { setPage(1); setRowsPerPage(Number(e.target.value)); }} disabled={loading}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <div className="ml-2 flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || meta.current_page <= 1}>← Prev</button>
              <span className="text-sm text-gray-700">Page {meta.current_page} / {meta.last_page}</span>
              <button className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50" onClick={() => setPage((p) => Math.min(meta.last_page || 1, p + 1))} disabled={loading || meta.current_page >= meta.last_page}>Next →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}