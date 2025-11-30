import React, { useEffect, useMemo, useState } from "react";
import { getInvoiceNumberingById, updateInvoiceNumbering } from "../../../api/invoiceNumberApi";
import { getAllBranches } from "../../../api/branchApi"; // same helper used in Create modal
import { toast } from "react-hot-toast";
import "../InvoicePrefixStyles.css";

const toInt = (v) => (v ? 1 : 0);

// tolerant unwrappers for various backend envelopes
const unwrapItem = (res) =>
  res?.data?.invoice_numbering ?? res?.invoice_numbering ?? res?.data ?? res ?? null;

const unwrapBranches = (res) =>
  Array.isArray(res) ? res
  : Array.isArray(res?.data) ? res.data
  : Array.isArray(res?.branches) ? res.branches
  : Array.isArray(res?.data?.branches) ? res.data.branches
  : [];

/* -------------------- SKELETON UI -------------------- */
const Skel = ({ w = 120, h = 12, r = 6, className = "" }) => (
  <span
    className={`ipx-skel ${className}`}
    style={{ width: w, height: h, borderRadius: r }}
    aria-hidden="true"
  />
);

const FieldSkeleton = ({ labelW = 80, inputH = 36 }) => (
  <label className="ipx-label">
    <Skel w={labelW} />
    <div style={{ marginTop: 6 }}>
      <Skel w={"100%"} h={inputH} r={10} />
    </div>
  </label>
);

const FormSkeleton = () => (
  <>
    <FieldSkeleton labelW={64} inputH={36} />
    <FieldSkeleton labelW={56} inputH={36} />
    <FieldSkeleton labelW={60} inputH={36} />
    <div className="ipx-actions" style={{ marginTop: 6, gap: 8 }}>
      <Skel w={88} h={36} r={10} />
      <Skel w={128} h={36} r={10} />
    </div>
  </>
);
/* ------------------ /SKELETON UI END ------------------ */

export default function EditInvoicePrefixModal({
  id,            // number | string
  isOpen,        // boolean
  onClose,       // () => void
  onSaved,       // (updatedItem) => void
}) {
  const [row, setRow] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // form state
  const [branchId, setBranchId] = useState("");
  const [prefix, setPrefix] = useState("");
  const [statusVal, setStatusVal] = useState("1");

  const canSubmit = useMemo(
    () => !!branchId && prefix.trim().length > 0 && !saving && !loading && !err,
    [branchId, prefix, saving, loading, err]
  );

  // open -> fetch item + branches
  useEffect(() => {
    if (!isOpen || !id) return;
    let alive = true;

    (async () => {
      setErr("");
      setLoading(true);
      try {
        const res = await getInvoiceNumberingById(id);
        const item = unwrapItem(res);
        if (!alive) return;
        setRow(item);
        // hydrate form
        setBranchId(String(item?.branch_id ?? ""));
        setPrefix(String(item?.prefix ?? "").toUpperCase());
        const sNum = Number(
          item?.status === "Active" ? 1 :
          item?.status === "Inactive" ? 0 :
          item?.status
        );
        setStatusVal(sNum === 1 ? "1" : "0");
      } catch (e) {
        if (alive) {
          setRow(null);
          setErr(e?.response?.data?.message || e?.message || "Failed to load prefix.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    (async () => {
      setLoadingBranches(true);
      try {
        const br = await getAllBranches({ status: 1 });
        if (!alive) return;
        setBranches(unwrapBranches(br));
      } catch (_) {
        if (alive) setBranches([]);
      } finally {
        if (alive) setLoadingBranches(false);
      }
    })();

    return () => { alive = false; };
  }, [isOpen, id]);

  const labelOfBranch = (b) =>
    b?.name || b?.branch_name || b?.label || `Branch #${b?.id}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setErr("");
    try {
      const payload = {
        branch_id: Number(branchId),
        prefix: prefix.toUpperCase().trim(),
        status: Number(statusVal),
      };
      const updated = await toast.promise(
       updateInvoiceNumbering(id, payload),
       {
         loading: "Saving changes…",
         success: "Invoice prefix updated",
         error: (err) =>
           err?.response?.data?.message ||
           err?.message ||
           "Failed to update prefix",
       }
       );
      onSaved?.(unwrapItem(updated) || { id, ...payload });
      onClose?.();
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Failed to update prefix.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const showSkeleton = loading || (row && loadingBranches && branches.length === 0);

  return (
    <div className="ipx-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="ipx-modal" role="dialog" aria-modal="true">
        <div className="ipx-modal-header">
          <h3>Edit Invoice Prefix</h3>
          <button className="ipx-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="ipx-form" onSubmit={handleSubmit}>
          {showSkeleton ? (
            <FormSkeleton />
          ) : err ? (
            <>
              <div className="ipx-error">{err}</div>
              <div className="ipx-actions" style={{ marginTop: 6 }}>
                <button type="button" className="ipx-btn ghost" onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Branch */}
              <label className="ipx-label">
                <span>Branch</span>
                <select
                  className="ipx-input"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={loadingBranches || saving}
                  required
                >
                  <option value="">{loadingBranches ? "Loading branches…" : "Select branch…"}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {labelOfBranch(b)}
                    </option>
                  ))}
                </select>
              </label>

              {/* Prefix */}
              <label className="ipx-label">
                <span>Prefix</span>
                <input
                  type="text"
                  className="ipx-input"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  maxLength={12}
                  required
                  disabled={saving}
                />
                <small className="ipx-help">Saved as uppercase (e.g., HL40).</small>
              </label>

              {/* Status */}
              <label className="ipx-label">
                <span>Status</span>
                <select
                  className="ipx-input"
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  disabled={saving}
                  required
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>

              <div className="ipx-actions" style={{ marginTop: 6 }}>
                <button type="button" className="ipx-btn ghost" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="ipx-btn primary" disabled={!canSubmit}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
