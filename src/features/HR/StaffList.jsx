import React, { useEffect, useMemo, useState, useCallback } from "react";
import { FaUsers } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { MdClose } from "react-icons/md";
import "../Styles/Styles.css";
import { listStaffs, deleteStaff } from "../../services/staffService";
import { Toaster, toast } from "react-hot-toast";
import { FaEye } from "react-icons/fa";
import { FaEdit } from "react-icons/fa";
import { MdOutlineDeleteForever } from "react-icons/md";
import "./StaffStyles.css";

const PAGE_SIZE = 10;

const safeLower = (v) => (typeof v === "string" ? v.toLowerCase() : "");
const cn = (...parts) => parts.filter(Boolean).join(" ");

/* ------------ Skeleton helpers ------------- */
const Skel = ({ w = 100, h = 14, rounded = 8, className = "" }) => (
  <span
    className={`skel ${className}`}
    style={{
      display: "inline-block",
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      borderRadius: rounded,
    }}
    aria-hidden="true"
  />
);
const SkelBtn = ({ w = 120 }) => <Skel w={w} h={36} rounded={10} />;
const SkelInput = () => <Skel w={224} h={40} rounded={10} />;
const SkelPill = () => <Skel w={64} h={22} rounded={999} />;
const SkelRow = ({ idx }) => (
  <tr className={idx % 2 ? "bg-white" : "bg-gray-50/30"}>
    <td className="px-5 py-3"><Skel w={24} /></td>
    <td className="px-5 py-3">
      <div className="space-y-2">
        <Skel w="60%" h={16} />
        <Skel w="40%" h={12} />
      </div>
    </td>
    <td className="px-5 py-3"><Skel w="40%" h={14} /></td>
    <td className="px-5 py-3"><SkelPill /></td>
  </tr>
);

const StaffList = () => {
  const [filter, setFilter] = useState({ name: "", email: "", status: "" });
  const [filterInput, setFilterInput] = useState({ name: "", email: "", status: "" });
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState("");
  const [dropdownId, setDropdownId] = useState(null);
  const [page, setPage] = useState(1);
  const [serverMeta, setServerMeta] = useState(null);
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);

  // map any backend shape to UI-safe fields
// StaffPanel.jsx

const mapStaff = (s, idx) => {
  const statusRaw =
    s.status ?? s.is_active ?? s.active ?? (typeof s.status === "string" ? s.status : undefined);
  const isActive =
    statusRaw === 1 || statusRaw === true || safeLower(String(statusRaw)) === "active";
  
  return {
    // CHANGE THIS LINE: Remove '?? idx'. 
    // If ID is missing, we want to know (it will appear as undefined), rather than linking to user 0 or 1.
    id: s.id ?? s.staff_id ?? s._id, 
    
    name: s.name || [s.first_name, s.last_name].filter(Boolean).join(" ") || s.username || "—",
    email: s.email || s.user_email || "—",
    role: (s.role && (s.role.name || s.role.title)) || s.role_name || s.role || s.role_id || "—",
    status: isActive ? "Active" : "Inactive",
  };
};

  const fetchData = useCallback(async (pageNum, f) => {
    if (!serverMeta) setIsLoading(true);
   else setIsFetching(true);
    setError("");
    try {
      const statusFlag =
      f?.status ? (f.status === "Active" ? 1 : 0) : undefined;
      const params = {
        page: pageNum,
        
        ...(f?.name ? { name: f.name } : {}),
        ...(f?.email ? { email: f.email } : {}),
              ...(statusFlag !== undefined ? { status: statusFlag, is_active: statusFlag } : {}),
       // optional: some backends support a generic q
     ...(f?.name && f?.email ? { q: `${f.name} ${f.email}` } : {}),
        
      };
      const { items, meta } = await listStaffs(params);
      const normalized = (Array.isArray(items) ? items : []).map(mapStaff);
      setStaff(normalized);
      setServerMeta(meta || null);
    } catch (e) {
      setError(e?.message || "Failed to load staff.");
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page, filter);
  }, [page, filter, fetchData]);

   useEffect(() => {
   const t = setTimeout(() => {
     setPage(1);           // reset on new applied filters
     setFilter(filterInput);
   }, 400);
   return () => clearTimeout(t);
 }, [filterInput]);

  // Close dropdown on outside click & ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-wrapper")) setDropdownId(null);
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setDropdownId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const filteredStaff = useMemo(() => {
    const n = safeLower(filter.name);
    const e = safeLower(filter.email);
    return staff.filter((u) => {
      const nameOk = n ? safeLower(u.name).includes(n) : true;
      const emailOk = e ? safeLower(u.email).includes(e) : true;
      const statusOk = filter.status ? u.status === filter.status : true;
      return nameOk && emailOk && statusOk;
    });
  }, [staff, filter]);

  const pageSafe = serverMeta?.current_page || page || 1;
  const totalPages = serverMeta?.last_page || 1;
  const perPage = serverMeta?.per_page || PAGE_SIZE;
  const total = serverMeta?.total ?? staff.length; // fallback if meta missing
  const startIdx = total ? (pageSafe - 1) * perPage : 0;
  const pageRows = filteredStaff; // server already sent just this page

  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  const visiblePages = useMemo(() => {
    const span = 2;
    const out = [];
    const from = Math.max(1, pageSafe - span);
    const to = Math.min(totalPages, pageSafe + span);
    for (let i = from; i <= to; i++) out.push(i);
    if (!out.includes(1)) out.unshift(1);
    if (!out.includes(totalPages)) out.push(totalPages);
    return out;
  }, [pageSafe, totalPages]);

   const handleClear = () => {
   setFilterInput({ name: "", email: "", status: "" });
   setFilter({ name: "", email: "", status: "" });
   setPage(1);
 }

 const handleView = (id) => {
  if (!id) return;
  navigate(`/hr&staff/staff/${id}`);
};

const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this staff member? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      // 1. Pass 'id' directly, not as an object
      const p = deleteStaff(id);

      await toast.promise(p, {
        loading: "Deleting user…",
        success: "User deleted successfully.",
        // 2. check err.response.data.message to show the backend validation message
        error: (err) => 
          err?.response?.data?.message || 
          err?.message || 
          "Failed to delete user.",
      });

      // Update UI only if successful
      setStaff((prev) => prev.filter((s) => s.id !== id));
      setServerMeta((m) => (m ? { ...m, total: Math.max(0, (m.total || 1) - 1) } : m));
    } catch (e) {
      // The toast handles the error display, so we just catch to prevent crash
      console.error("Deletion failed:", e);
    } finally {
      setDeletingId(null);
    }
  };


  return (
    <div aria-busy={isLoading}>
      <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="staff-panel-heading flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
            <FaUsers />
          </span>
          {isLoading ? <Skel w={200} h={24} /> : "All Staff Members"}
          {!isLoading && typeof total === "number" && (
            <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {total} total
            </span>
          )}
        </h2>
        {isLoading ? (
          <SkelBtn w={150} />
        ) : (
          <button
            onClick={() => navigate("/hr&staff/createstaffs")}
            className="rounded-lg bg-green-600 px-5 py-2 text-white shadow transition hover:bg-green-700"
          >
            + Create Staff
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur">
        {isLoading ? (
          <div className="flex flex-wrap items-center gap-4">
            <SkelInput />
            <SkelInput />
            <Skel w={176} h={40} rounded={10} />
            <SkelBtn w={100} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <input
              type="text"
              placeholder="Search by name"
              value={filterInput.name}
              onChange={(e) => setFilterInput((p) => ({ ...p, name: e.target.value }))}
              className="h-10 rounded-lg border border-gray-300 px-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            />
            <input
              type="text"
              placeholder="Filter by email"
              value={filterInput.email}
              onChange={(e) => setFilterInput((p) => ({ ...p, email: e.target.value }))}
              className="h-10 rounded-lg border border-gray-300 px-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            />
            <select
              value={filterInput.status}
              onChange={(e) => setFilterInput((p) => ({ ...p, status: e.target.value }))}
              className="h-10 rounded-lg border border-gray-300 px-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">All status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button
              onClick={handleClear}
              className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#ED2624] px-4 text-white transition hover:bg-[#d32724]"
            >
              <MdClose /> Clear
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && !isLoading && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
              <tr className="text-[11px] uppercase tracking-wide text-gray-600">
                <th className="px-5 py-3 font-semibold">#</th>
                <th className="px-5 py-3 font-semibold">Member</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => <SkelRow key={`sk-${i}`} idx={i} />)
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center">
                    <div className="mx-auto w-fit rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-gray-600">
                      No staff found for the current filters.
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((user, idx) => (
                  <tr
                    key={user.id ?? `${startIdx}-${idx}`}
                    className="group hover:bg-blue-50/30"
                  >
                    <td className="px-5 py-3 align-middle text-sm text-gray-800">
                      {startIdx + idx + 1}
                    </td>

                    <td className="px-5 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        {/* Faux avatar from initials */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-sm font-semibold text-blue-700 ring-1 ring-inset ring-blue-300/50">
                          {String(user.name || "U")
                            .trim()
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 leading-tight">
                            {user.name}
                          </div>
                          <a
                            href={`mailto:${user.email}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {user.email}
                          </a>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3 align-middle">
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
                        {user.role}
                      </span>
                    </td>

                    <td className="px-5 py-3 align-middle">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                          user.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-rose-50 text-rose-700 ring-rose-200"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            user.status === "Active" ? "bg-emerald-500" : "bg-rose-500"
                          )}
                        />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 align-middle flex gap-2  ">
<div className="flex items-center gap-2">
  {/* View */}
<span
  onClick={() => handleView(user.id)}
  className="inline-flex h-8 w-8 items-center justify-center rounded-full
             bg-blue-50 text-blue-700 border border-blue-200
             hover:bg-blue-100 hover:border-blue-300
             focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200
             transition-colors cursor-pointer"
  title="View"
  role="button"
  tabIndex={0}
  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleView(user.id)}
>
  <FaEye />
</span>

  {/* Edit */}
  <span
  onClick={() => navigate(`/hr&staff/staff/${user.id}/edit`)}
    className="inline-flex h-8 w-8 items-center justify-center rounded-full
               bg-emerald-50 text-emerald-700 border border-emerald-200
               hover:bg-emerald-100 hover:border-emerald-300
               focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200
               transition-colors cursor-pointer"
    title="Edit"
  >
    <FaEdit />
  </span>

  {/* Delete */}
 <span
  onClick={() => (deletingId ? null : handleDelete(user.id))}
  title={deletingId === user.id ? "Deleting..." : "Delete"}
  className={cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-full border cursor-pointer transition",
    "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300",
    deletingId === user.id && "opacity-60 pointer-events-none"
  )}
  aria-disabled={deletingId === user.id}
>
  {deletingId === user.id ? (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  ) : (
    <MdOutlineDeleteForever />
  )}
</span>


</div>

                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: pagination summary + controls */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 p-4 md:flex-row">
          <div className="text-sm text-gray-600">
         {pageRows.length ? (
   <>
     Showing <span className="font-medium">{startIdx + 1}</span>–
     <span className="font-medium">{startIdx + pageRows.length}</span> of{" "}
     <span className="font-medium">{total}</span>
   </>
 ) : "No results"}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={goFirst}
              disabled={pageSafe === 1 || isLoading}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                pageSafe === 1 || isLoading
                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
              aria-label="First page"
            >
              « First
            </button>
            <button
              onClick={goPrev}
              disabled={pageSafe === 1 || isLoading}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                pageSafe === 1 || isLoading
                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
              aria-label="Previous page"
            >
              ‹ Prev
            </button>

            {isLoading ? (
              <>
                <Skel w={36} h={32} rounded={8} />
                <Skel w={36} h={32} rounded={8} />
                <Skel w={36} h={32} rounded={8} />
              </>
            ) : (
              visiblePages.map((p, i) => {
                const isCurrent = p === pageSafe;
                const prevP = visiblePages[i - 1];
                const needsEllipsis = prevP && p - prevP > 1;
                return (
                  <React.Fragment key={p}>
                    {needsEllipsis && <span className="px-1 text-gray-400">…</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={cn(
                        "min-w-[2.2rem] rounded-md border px-3 py-1.5 text-sm transition",
                        isCurrent
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      )}
                      aria-current={isCurrent ? "page" : undefined}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })
            )}

            <button
              onClick={goNext}
              disabled={pageSafe === totalPages || isLoading}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                pageSafe === totalPages || isLoading
                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
              aria-label="Next page"
            >
              Next ›
            </button>
            <button
              onClick={goLast}
              disabled={pageSafe === totalPages || isLoading}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                pageSafe === totalPages || isLoading
                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
              aria-label="Last page"
            >
              Last »
            </button>
          </div>
        </div>
      </div>

      {/* Shimmer CSS; move to a global css if you prefer */}
      <style>{`
        .skel {
          background: #e5e7eb; /* gray-200 */
          position: relative;
          overflow: hidden;
        }
        .skel::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            rgba(229,231,235,0) 0%,
            rgba(255,255,255,0.75) 50%,
            rgba(229,231,235,0) 100%
          );
          animation: skel-shimmer 1.2s infinite;
        }
        @keyframes skel-shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default StaffList;
