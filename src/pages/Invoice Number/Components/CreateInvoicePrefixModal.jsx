import React, { useEffect, useMemo, useRef, useState } from "react";
import "../InvoicePrefixStyles.css";
import { createInvoiceNumbering } from "../../../api/invoiceNumberApi";
import { getAllBranches } from "../../../api/branchApi"; // see stub below // see stub below
import { toast } from "react-hot-toast";

const toInt = (v) => (v ? 1 : 0);

export default function CreateInvoicePrefixModal({
  isOpen,
  onClose,
  onCreated, // (created) => void
}) {
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [branchId, setBranchId] = useState("");
  const [prefix, setPrefix] = useState("");
  const [active, setActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const dialogRef = useRef(null);

  // Fetch active branches for dropdown
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    (async () => {
      setLoadingBranches(true);
      setError("");
      try {
        const res = await getAllBranches({ status: 1 });
        // tolerate various shapes: {data:[]}, {branches:[]}, []
        const list =
          Array.isArray(res) ? res :
          Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.branches) ? res.branches :
          Array.isArray(res?.data?.branches) ? res.data.branches : [];
        if (alive) setBranches(list);
      } catch (e) {
        if (alive) {
          setBranches([]);
          setError("Failed to load branches.");
        }
      } finally {
        if (alive) setLoadingBranches(false);
      }
    })();
    return () => { alive = false; };
  }, [isOpen]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setBranchId("");
      setPrefix("");
      setActive(true);
      setError("");
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const canSubmit = useMemo(
    () => !!branchId && prefix.trim().length > 0 && !submitting,
    [branchId, prefix, submitting]
  );

  const labelOfBranch = (b) =>
    b?.name || b?.branch_name || b?.label || `Branch #${b?.id}`;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        branch_id: Number(branchId),
        prefix: prefix.toUpperCase().trim(),
        status: toInt(active),
      };
      const created = await toast.promise(
        createInvoiceNumbering(payload),
        {
          loading: "Creating prefix…",
          success: "Invoice prefix created",
          error: (err) =>
            err?.response?.data?.message ||
            err?.message ||
            "Failed to create prefix",
        }
      );
      onCreated?.(created); // refresh parent list
      onClose?.();   
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Failed to create prefix.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ipx-modal-overlay" onClick={handleOverlayClick}>
      <div className="ipx-modal" role="dialog" aria-modal="true" ref={dialogRef}>
        <div className="ipx-modal-header">
          <h3>Create Invoice Prefix</h3>
          <button className="ipx-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="ipx-form">
          {/* Branch */}
          <label className="ipx-label">
            <span>Branch</span>
            <select
              className="ipx-input"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={loadingBranches || submitting}
              required
            >
              <option value="">Select branch…</option>
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
              placeholder="e.g., HL40"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              maxLength={12}
              required
              disabled={submitting}
            />
            <small className="ipx-help">Letters/numbers only. Will be saved in uppercase.</small>
          </label>

          {/* Status */}
          <label className="ipx-switch">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={submitting}
            />
            <span>Active</span>
          </label>

          {error ? <div className="ipx-error">{error}</div> : null}

          <div className="ipx-actions">
            <button type="button" className="ipx-btn ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="ipx-btn primary" disabled={!canSubmit}>
              {submitting ? "Saving…" : "Create Prefix"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
