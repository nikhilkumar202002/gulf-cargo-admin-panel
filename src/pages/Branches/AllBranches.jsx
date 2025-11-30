// src/pages/Branches/AllBranches.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as branchApi from "../../api/branchApi"; 
import { FiSearch, FiEye, FiEdit2, FiTrash2, FiAlertTriangle, FiX } from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast"; // 1. Import Toast

/* ---------------- tiny helpers ---------------- */
const cx = (...c) => c.filter(Boolean).join(" ");

/* ----------- serial no helper ----------- */
const slno = (rowIndex, meta) =>
  (meta?.per_page || 0) * ((meta?.current_page || 1) - 1) + rowIndex + 1;

const Skel = ({ w = "100%", h = 14, rounded = 8, className = "" }) => (
  <span
    className={cx("inline-block bg-slate-200 animate-pulse", className)}
    style={{
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      borderRadius: rounded,
    }}
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

/* ----------- phones normalizer ----------- */
function getPhones(b = {}) {
  const out = [];
  if (Array.isArray(b.branch_contact_numbers)) {
    for (const n of b.branch_contact_numbers) {
      if (n && String(n).trim()) out.push(String(n).trim());
    }
  }
  const primary = b.branch_contact_number ?? b.contact ?? "";
  if (typeof primary === "string" && primary.trim()) {
    const parts = primary.split(/[,\|/;\s]+/g).map((t) => t.trim()).filter(Boolean);
    out.push(...parts);
  }
  if (b.branch_alternative_number) {
    out.push(String(b.branch_alternative_number).trim());
  }
  const seen = new Set();
  const uniq = [];
  for (const n of out) {
    const k = n.replace(/\s+/g, "");
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(n);
    }
  }
  return uniq;
}

/* ----------- normalize API shapes ----------- */
function normalizePagedResponse(raw) {
  if (raw && Array.isArray(raw.items) && raw.meta) {
    const { items, meta } = raw;
    return {
      items,
      meta: {
        current_page: meta.current_page ?? 1,
        per_page: meta.per_page ?? items.length,
        total: meta.total ?? items.length,
        last_page: meta.last_page ?? 1,
      },
    };
  }
  if (Array.isArray(raw)) {
    return {
      items: raw,
      meta: { current_page: 1, per_page: raw.length, total: raw.length, last_page: 1 },
    };
  }
  const data = raw?.data;
  if (data?.data && Array.isArray(data.data)) {
    return {
      items: data.data,
      meta: {
        current_page: data.current_page ?? 1,
        per_page: data.per_page ?? data.data.length,
        total: data.total ?? data.data.length,
        last_page: data.last_page ?? 1,
      },
    };
  }
  return { items: [], meta: { current_page: 1, per_page: 0, total: 0, last_page: 1 } };
}

export default function AllBranches() {
  /* -------- server paging state -------- */
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* -------- ui data -------- */
  const [branches, setBranches] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 10, total: 0, last_page: 1 });

  /* -------- UX -------- */
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  /* -------- DELETE MODAL STATE -------- */
  const [deleteTarget, setDeleteTarget] = useState(null); // The branch object to delete
  const [deleteInput, setDeleteInput] = useState(""); // The user typed confirmation

  async function loadPage({ pageArg = page, perPageArg = rowsPerPage } = {}) {
    setLoading(true);
    setErr("");
    try {
      let result;
      if (typeof branchApi.getAllBranchesPaged === "function") {
        result = await branchApi.getAllBranchesPaged({ page: pageArg, per_page: perPageArg });
      } else if (typeof branchApi.getAllBranches === "function") {
        const all = await branchApi.getAllBranches({ per_page: 1000 });
        const start = (pageArg - 1) * perPageArg;
        const pageItems = (Array.isArray(all) ? all : []).slice(start, start + perPageArg);
        result = {
          items: pageItems,
          meta: {
            current_page: pageArg,
            per_page: perPageArg,
            total: Array.isArray(all) ? all.length : 0,
            last_page: Math.max(1, Math.ceil((Array.isArray(all) ? all.length : 0) / perPageArg)),
          },
        };
      } else {
        throw new Error("branchApi helper not found.");
      }
      const { items, meta } = normalizePagedResponse(result);
      setBranches(Array.isArray(items) ? items : []);
      setMeta(meta);
    } catch (e) {
      setErr(e?.message || "Failed to load branches");
      setBranches([]);
      setMeta({ current_page: 1, per_page: rowsPerPage, total: 0, last_page: 1 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage({ pageArg: page, perPageArg: rowsPerPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  /* -------- search over current page -------- */
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

  /* ---------------- API Helpers ---------------- */
  async function doDeleteApi(id) {
    if (typeof branchApi.deleteBranch === "function") return branchApi.deleteBranch(id);
    if (typeof branchApi.removeBranch === "function") return branchApi.removeBranch(id);
    if (typeof branchApi.destroyBranch === "function") return branchApi.destroyBranch(id);
    throw new Error("No delete function exported from branchApi.");
  }

  /* ---------------- Delete Logic (New) ---------------- */
  
  // 1. Open the modal
  const openDeleteModal = (branch) => {
    setDeleteTarget(branch);
    setDeleteInput("");
  };

  // 2. Close the modal
  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteInput("");
  };

  // 3. Execute Delete with Toast
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    // Safety check just in case disabled button was bypassed
    const expectedName = deleteTarget.branch_name || "DELETE";
    if (deleteInput !== expectedName) {
        toast.error("Validation failed. Name mismatch.");
        return;
    }

    const currentFilteredCount = filtered.length;
    const branchId = deleteTarget.id;

    // Close modal immediately or keep open with loading state? 
    // Usually better to keep UI responsive. Let's use toast.promise
    
    closeDeleteModal(); // Close modal first

    const deletePromise = doDeleteApi(branchId)
      .then(async () => {
        // Handle pagination logic after successful delete
        const willBeEmpty = currentFilteredCount === 1 && meta.current_page > 1;
        const nextPage = willBeEmpty ? Math.max(1, meta.current_page - 1) : meta.current_page;
        
        // Optimistic UI update or Refetch
        if (page !== nextPage) {
            setPage(nextPage); // This triggers useEffect
        } else {
            await loadPage({ pageArg: nextPage, perPageArg: rowsPerPage });
        }
      });

    toast.promise(deletePromise, {
      loading: 'Deleting branch...',
      success: 'Branch deleted successfully',
      error: (err) => `Error: ${err?.response?.data?.message || err?.message || 'Could not delete'}`
    });
  };

  return (
    <div className="min-h-screen flex items-start justify-center">
      {/* Toast Container */}
      <Toaster position="top-right" />

      {/* ---------------- DELETE MODAL ---------------- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden transform transition-all scale-100">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FiAlertTriangle className="text-red-500" />
                Confirm Deletion
              </h3>
              <button onClick={closeDeleteModal} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete the branch <span className="font-bold text-gray-900">{deleteTarget.branch_name}</span>?
                This action cannot be undone.
              </p>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type <span className="text-blue-600 select-all">"{deleteTarget.branch_name || "DELETE"}"</span> to confirm
                </label>
                <input 
                  type="text" 
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={deleteTarget.branch_name || "DELETE"}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={closeDeleteModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={deleteInput !== (deleteTarget.branch_name || "DELETE")}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Delete Branch
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ---------------- END MODAL ---------------- */}


      <div className="w-full max-w-7xl bg-white rounded-2xl shadow-sm">
        {/* Header */}  
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">All Branches</h2>
            <p className="text-sm text-gray-500">Manage your branches across regions</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); }}
                placeholder="Search (id, name, code, location, email)…"
                className="pl-9 pr-3 py-2 w-72 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              />
            </div>

            <Link
              to="/branches/add"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-black text-white hover:opacity-90"
            >
              + Add Branch
            </Link>
          </div>
        </div>

        {/* Mobile: Card list (≤ md) */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:hidden">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Skel w={48} h={48} rounded={12} />
                <div className="flex-1">
                  <Skel w="70%" h={16} />
                  <div className="mt-2"><Skel w="45%" h={12} /></div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Skel h={12} />
                <Skel h={12} />
                <Skel h={12} />
                <Skel h={12} />
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="p-6 text-center text-gray-500 border rounded-xl">
              {err ? `Error: ${err}` : "No branches found on this page."}
            </div>
          )}

          {!loading && filtered.map((b, idx) => {
            const phones = getPhones(b);
            return (
              <div key={b.id} className="border rounded-xl p-4 hover:shadow-sm transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    SL No: {slno(idx, meta)}
                  </span>
                  <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    ID: {b.id ?? "—"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {b.logo_url ? (
                    <img
                      src={b.logo_url}
                      alt={b.branch_name || "logo"}
                      className="h-12 w-12 rounded-lg object-cover border"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gray-100 border" />
                  )}
                  <div className="min-w-0">
                    <Link to={`/branches/${b.id}`} className="font-semibold truncate text-blue-700 hover:underline">
                      {b.branch_name || "-"}
                    </Link>
                    {b.branch_name_ar ? (
                      <div className="text-xs text-gray-500 truncate">{b.branch_name_ar}</div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                  {/* ... Existing Mobile Fields ... */}
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-24 shrink-0">Code</span>
                    <span className="font-medium">{b.branch_code || "-"}</span>
                  </div>
                  {/* ... other fields ... */}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    to={`/branch/viewbranch/${b.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border hover:bg-gray-50 text-sm"
                  >
                    <FiEye className="text-gray-700" />
                    <span>View</span>
                  </Link>
                  <Link
                    to={`/branches/edit/${b.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border hover:bg-gray-50 text-sm"
                  >
                    <FiEdit2 className="text-gray-700" />
                    <span>Edit</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => openDeleteModal(b)} // CHANGED HERE
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm disabled:opacity-50"
                    disabled={loading}
                  >
                    <FiTrash2 />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Responsive table (≥ md) */}
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
                  {loading && (
                    <>
                      <SkelRow /><SkelRow /><SkelRow /><SkelRow /><SkelRow />
                    </>
                  )}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-gray-500">
                        {err ? `Error: ${err}` : "No branches found on this page."}
                      </td>
                    </tr>
                  )}

                  {!loading && filtered.map((b, idx) => {
                    const phones = getPhones(b);
                    return (
                      <tr key={b.id} className="hover:bg-gray-50">

                        <td className="p-3 whitespace-nowrap">{slno(idx, meta)}</td>
                        <td className="p-3">
                          {b.logo_url ? (
                            <img
                              src={b.logo_url}
                              alt={b.branch_name || "logo"}
                              className="h-10 w-10 rounded-md object-cover border"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-gray-100 border" />
                          )}
                        </td>

                        <td className="p-3 max-w-[260px]">
                          <Link
                            to={`/branches/${b.id}`}
                            className="font-medium truncate text-blue-700 hover:underline"
                            title={b.branch_name || ""}
                          >
                            {b.branch_name || "-"}
                          </Link>
                          {b.branch_name_ar ? (
                            <div className="text-xs text-gray-500 truncate" title={b.branch_name_ar}>{b.branch_name_ar}</div>
                          ) : null}
                        </td>

                        <td className="p-3 whitespace-nowrap">{b.branch_code || "-"}</td>

                        <td className="p-3 max-w-[280px]">
                          <div className="truncate" title={b.branch_location || ""}>{b.branch_location || "-"}</div>
                          {b.branch_address ? (
                            <div className="text-xs text-gray-500 truncate" title={b.branch_address}>{b.branch_address}</div>
                          ) : null}
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          {phones.length
                            ? (
                              <div className="flex flex-col gap-0.5">
                                {phones.map((p, i) => (
                                  <a
                                    key={i}
                                    href={`tel:${p.replace(/\s+/g, "")}`}
                                    className="hover:underline"
                                    title={p}
                                  >
                                    {p}
                                  </a>
                                ))}
                              </div>
                            )
                            : "-"}
                        </td>

                        <td className="p-3">
                          <span
                            className={cx(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                              (b.status === "Active" || b.status === 1 || b.status === "1") ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            )}
                          >
                            {b.status ?? "—"}
                          </span>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/branch/viewbranch/${b.id}`}
                              className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded border hover:bg-gray-50 text-sm"
                            >
                              <FiEye className="text-gray-700" />
                            </Link>

                            <Link
                              to={`/branches/edit/${b.id}`}
                              className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded border hover:bg-gray-50 text-sm"
                            >
                              <FiEdit2 className="text-gray-700" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(b)} // CHANGED HERE
                              className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm disabled:opacity-50"
                              disabled={loading}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer / Pagination */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{showingFrom}</span>–<span className="font-medium">{showingTo}</span> of{" "}
            <span className="font-medium">{meta.total}</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Rows per page</label>
            <select
              className="border rounded-lg px-2 py-1"
              value={rowsPerPage}
              onChange={(e) => { setPage(1); setRowsPerPage(Number(e.target.value)); }}
              disabled={loading}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <div className="ml-2 flex items-center gap-2">
              <button
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || meta.current_page <= 1}
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-700">
                Page <span className="font-medium">{meta.current_page}</span> / {meta.last_page}
              </span>
              <button
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(meta.last_page || 1, p + 1))}
                disabled={loading || meta.current_page >= (meta.last_page || 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}