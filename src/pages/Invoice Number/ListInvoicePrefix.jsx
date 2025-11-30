import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./InvoicePrefixStyles.css";
import {
  getInvoiceNumberings,
  deleteInvoiceNumbering,
} from "../../api/invoiceNumberApi";
import CreateInvoicePrefixModal from "./Components/CreateInvoicePrefixModal";
import PrevixInvoiceView from "./Components/PrevixInvoiceView";
import EditInvoicePrefixModal from "./Components/EditInvoicePrefixModal";
import { Toaster } from "react-hot-toast";

const pageSize = 10;

// Coerce any backend status shape to 1 or 0
const normStatus = (s) => {
  if (s === 1 || s === "1" || s === true) return 1;
  if (typeof s === "string") {
    const v = s.trim().toLowerCase();
    if (v === "active" || v === "enabled" || v === "true") return 1;
  }
  return 0; // treat everything else as inactive
};

const StatusPill = ({ v }) => {
  const s = normStatus(v);
  return (
    <span className={`ipx-pill ${s === 1 ? "ok" : "muted"}`}>
      {s === 1 ? "Active" : "Inactive"}
    </span>
  );
};

/* -------------------- SKELETON UI -------------------- */
const Skel = ({ w = 100, h = 12, r = 6, className = "" }) => (
  <span
    className={`ipx-skel ${className}`}
    style={{ width: w, height: h, borderRadius: r }}
    aria-hidden="true"
  />
);

const HeadSkeleton = () => (
  <div className="ipx-head">
    <div>
      <Skel w={180} h={22} />
      <div style={{ marginTop: 6 }}>
        <Skel w={260} h={12} />
      </div>
    </div>
    <div className="ipx-head-actions">
      <Skel w={110} h={36} r={10} />
    </div>
  </div>
);

const ControlsSkeleton = () => (
  <div className="ipx-controls">
    <div className="ipx-search">
      <Skel w={260} h={36} r={10} />
    </div>
    <div className="ipx-filter">
      <Skel w={120} h={12} />
      <div style={{ marginTop: 6 }}>
        <Skel w={160} h={36} r={10} />
      </div>
    </div>
  </div>
);

// matches 6 columns: ID, Branch, Branch ID, Prefix, Status, Actions
const TableSkeleton = ({ rows = 8 }) => (
  <div className="ipx-table-wrap ipx-table-elevated">
    <table className="ipx-table ipx-table-compact ipx-table-sticky">
      <thead>
        <tr>
          <th className="w-80">ID</th>
          <th>Branch</th>
          <th className="w-140 ipx-col-hide-sm">Branch ID</th>
          <th className="w-140">Prefix</th>
          <th className="w-120">Status</th>
          <th className="w-160 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={`skel-${i}`}>
            <td><Skel w={40} /></td>
            <td><Skel w={180} /></td>
            <td className="ipx-col-hide-sm"><Skel w={80} /></td>
            <td><Skel w={90} h={18} /></td>
            <td><Skel w={72} h={22} r={999} /></td>
            <td className="ipx-actions-cell">
              <div className="ipx-actions-inline">
                <Skel w={52} h={28} r={8} />
                <Skel w={52} h={28} r={8} />
                <Skel w={64} h={28} r={8} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={6}>
            <div className="ipx-pagination">
              <Skel w={120} />
              <div className="ipx-pager" style={{ gap: 8 }}>
                <Skel w={68} h={28} r={8} />
                <Skel w={100} h={20} r={6} />
                <Skel w={68} h={28} r={8} />
              </div>
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
);
/* ------------------ /SKELETON UI END ------------------ */

export default function ListInvoicePrefix({
  onView,   // (item) => void
  onEdit,   // (item) => void
  onCreate, // () => void
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // UI state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // "all" | "1" | "0"
  const [page, setPage] = useState(1);

  // delete modal
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (status === "1" || status === "0") params.status = status;
      const res = await getInvoiceNumberings(params);
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.invoice_numberings)
        ? res.invoice_numberings
        : Array.isArray(res?.data?.invoice_numberings)
        ? res.data.invoice_numberings
        : [];
      setRows(list.map((r) => ({ ...r, status: normStatus(r.status) })));
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load invoice prefixes."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // simple client filter + paginate
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!needle) return true;
      const hay = `${r?.prefix ?? ""} ${r?.branch_name ?? ""} ${String(
        r?.branch_id ?? ""
      )}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [pageCount, page]);

  const confirmDelete = (row) => setToDelete(row);
  const closeConfirm = () => setToDelete(null);

  const doDelete = async () => {
    if (!toDelete?.id) return;
    setDeleting(true);
    try {
      await deleteInvoiceNumbering(toDelete.id);
      setRows((old) => old.filter((r) => r.id !== toDelete.id));
      closeConfirm();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="ipx-wrap">
      {/* Header */}
      {loading ? <HeadSkeleton /> : (
      <div className="ipx-head ipx-head-bar">
  <div className="ipx-brand">
    <h2 className="ipx-title">Invoice Prefixes</h2>
    <p className="ipx-sub">Manage invoice numbering prefixes by branch.</p>
  </div>

  <div className="ipx-toolbar">
    <div className="ipx-field grow">
      <input
        className="ipx-input ipx-input-lg"
        type="search"
        placeholder="Search by prefix or branch…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
      />
    </div>

    <div className="ipx-field">
      <label className="ipx-label small">Status</label>
      <select
        className="ipx-input"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
      >
        <option value="all">All</option>
        <option value="1">Active</option>
        <option value="0">Inactive</option>
      </select>
    </div>

    <button className="ipx-btn primary ipx-btn-cta" onClick={() => setCreateOpen(true)}>
      + New Prefix
    </button>
  </div>
</div>

      )}

      {/* Body */}
      <div className="ipx-card">
        {loading ? (
          <TableSkeleton rows={pageSize} />
        ) : err ? (
          <div className="ipx-error">{err}</div>
        ) : filtered.length === 0 ? (
          <div className="ipx-empty">No prefixes found.</div>
        ) : (
          <div className="ipx-table-wrap ipx-table-elevated">
            <table className="ipx-table ipx-table-compact ipx-table-hover ipx-table-sticky">
              <thead>
                <tr>
                  <th className="w-80">ID</th>
                  <th>Branch</th>
                  <th className="w-140 ipx-col-hide-sm">Branch ID</th>
                  <th className="w-140">Prefix</th>
                  <th className="w-120">Status</th>
                  <th className="w-160 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.branch_name ?? `Branch #${r.branch_id ?? "-"}`}</td>
                    <td className="ipx-col-hide-sm">{r.branch_id ?? "-"}</td>
                    <td><code className="ipx-code">{r.prefix}</code></td>
                    <td><StatusPill v={r.status} /></td>
                    <td className="ipx-actions-cell">
                      <div className="ipx-actions-inline">
                        <button
                          className="ipx-btn ghost sm"
                          onClick={() => {
                            if (onView) return onView(r);
                            setViewId(r.id);
                            setViewOpen(true);
                          }}
                          title="View"
                        >
                          View
                        </button>
                        <button
                          className="ipx-btn sm"
                          onClick={() => { setEditId(r.id); setEditOpen(true); }}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          className="ipx-btn danger sm"
                          onClick={() => confirmDelete(r)}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6}>
                    <div className="ipx-pagination">
                      <div className="ipx-results-count">
                        {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                      </div>
                      <div className="ipx-pager">
                        <button
                          className="ipx-btn ghost sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                        >
                          ← Prev
                        </button>
                        <span className="ipx-page-indicator">
                          Page {page} / {pageCount}
                        </span>
                        <button
                          className="ipx-btn ghost sm"
                          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                          disabled={page >= pageCount}
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {toDelete && (
        <div
          className="ipx-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeConfirm()}
        >
          <div className="ipx-modal" role="dialog" aria-modal="true">
            <div className="ipx-modal-header">
              <h3>Delete Prefix</h3>
              <button className="ipx-close" onClick={closeConfirm}>×</button>
            </div>
            <div className="ipx-form" style={{ paddingTop: 8 }}>
              <p>
                Are you sure you want to delete prefix{" "}
                <strong>{toDelete.prefix}</strong> for{" "}
                <em>{toDelete.branch_name ?? `Branch #${toDelete.branch_id}`}</em>?
              </p>
              <div className="ipx-actions" style={{ marginTop: 12 }}>
                <button className="ipx-btn ghost" onClick={closeConfirm} disabled={deleting}>
                  Cancel
                </button>
                <button className="ipx-btn danger" onClick={doDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      
      <CreateInvoicePrefixModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          fetchList(); // refresh the table after successful creation
        }}
      />

      <PrevixInvoiceView
        id={viewId}
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        onEdit={(item) => {
          setViewOpen(false);
          onEdit?.(item);
        }}
      />

      <EditInvoicePrefixModal
        id={editId}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          fetchList(); // refresh the grid
        }}
      />
    </div>
  );
}
