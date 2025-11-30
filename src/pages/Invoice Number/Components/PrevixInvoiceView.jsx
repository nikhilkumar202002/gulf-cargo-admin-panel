import React, { useEffect, useMemo, useState } from "react";
import { getInvoiceNumberingById } from "../../../api/invoiceNumberApi";
import "../InvoicePrefixStyles.css";

// normalize any backend status to 1/0
const normStatus = (s) => {
  if (s === 1 || s === "1" || s === true) return 1;
  if (typeof s === "string") {
    const v = s.trim().toLowerCase();
    if (v === "active" || v === "enabled" || v === "true") return 1;
  }
  return 0;
};

// tolerant unwrap
const unwrapItem = (res) =>
  res?.data?.invoice_numbering ??
  res?.invoice_numbering ??
  res?.data?.data ??
  res?.data ??
  res ?? null;

/* -------------------- SKELETON UI -------------------- */
const Skel = ({ w = 120, h = 12, r = 6, className = "" }) => (
  <span
    className={`ipx-skel ${className}`}
    style={{ width: w, height: h, borderRadius: r }}
    aria-hidden="true"
  />
);

const ViewSkeleton = () => (
  <>
    <div className="ipx-view-grid">
      <div className="ipx-view-row">
        <div className="ipx-view-label"><Skel w={64} /></div>
        <div className="ipx-view-value"><Skel w={180} /></div>
      </div>

      <div className="ipx-view-row">
        <div className="ipx-view-label"><Skel w={60} /></div>
        <div className="ipx-view-value"><Skel w={120} h={18} /></div>
      </div>

      <div className="ipx-view-row">
        <div className="ipx-view-label"><Skel w={64} /></div>
        <div className="ipx-view-value"><Skel w={80} h={22} r={999} /></div>
      </div>

      <div className="ipx-view-row">
        <div className="ipx-view-label"><Skel w={70} /></div>
        <div className="ipx-view-value"><Skel w={160} /></div>
      </div>

      <div className="ipx-view-row">
        <div className="ipx-view-label"><Skel w={70} /></div>
        <div className="ipx-view-value"><Skel w={160} /></div>
      </div>
    </div>

    <div className="ipx-actions" style={{ marginTop: 12, gap: 8 }}>
      <Skel w={72} h={36} r={10} />
      <Skel w={72} h={36} r={10} />
    </div>
  </>
);
/* ------------------ /SKELETON UI END ------------------ */

export default function PrevixInvoiceView({ id, isOpen, onClose, onEdit }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isOpen || !id) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        // client-side timeout so UI never hangs forever
        const timeout = new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Request timed out")), 8000)
        );
        const res = await Promise.race([getInvoiceNumberingById(id), timeout]);
        const it = unwrapItem(res);
        if (!it) throw new Error("No data found for this ID.");
        if (alive) setRow({ ...it, status: normStatus(it.status) });
      } catch (e) {
        if (alive) {
          setRow(null);
          const apiMsg = e?.response?.data?.message;
          const code = e?.response?.status;
          setErr(apiMsg || (code ? `Request failed (${code})` : e?.message) || "Failed to load prefix.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [id, isOpen, reloadKey]);

  const statusPill = useMemo(() => {
    const s = normStatus(row?.status);
    return (
      <span className={`ipx-pill ${s === 1 ? "ok" : "muted"}`}>
        {s === 1 ? "Active" : "Inactive"}
      </span>
    );
  }, [row]);

  if (!isOpen) return null;

  return (
    <div
      className="ipx-modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="ipx-modal" role="dialog" aria-modal="true">
        <div className="ipx-modal-header">
          <h3>Invoice Prefix Details</h3>
          <button className="ipx-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="ipx-form" style={{ paddingTop: 8 }}>
          {loading ? (
            <ViewSkeleton />
          ) : err ? (
            <div className="ipx-error">
              {err}
              <div style={{ marginTop: 10 }}>
                <button className="ipx-btn ghost sm" onClick={() => setReloadKey(k => k + 1)}>
                  Retry
                </button>
              </div>
            </div>
          ) : !row ? (
            <div className="ipx-empty">No data.</div>
          ) : (
            <>
              <div className="ipx-view-grid">
                <div className="ipx-view-row">
                  <div className="ipx-view-label">Branch</div>
                  <div className="ipx-view-value">{row.branch_name ?? `#${row.branch_id ?? "-"}`}</div>
                </div>

                <div className="ipx-view-row">
                  <div className="ipx-view-label">Prefix</div>
                  <div className="ipx-view-value"><code className="ipx-code">{row.prefix}</code></div>
                </div>

                <div className="ipx-view-row">
                  <div className="ipx-view-label">Status</div>
                  <div className="ipx-view-value">{statusPill}</div>
                </div>

                {row.created_at && (
                  <div className="ipx-view-row">
                    <div className="ipx-view-label">Created</div>
                    <div className="ipx-view-value">{row.created_at}</div>
                  </div>
                )}
                {row.updated_at && (
                  <div className="ipx-view-row">
                    <div className="ipx-view-label">Updated</div>
                    <div className="ipx-view-value">{row.updated_at}</div>
                  </div>
                )}
              </div>

              <div className="ipx-actions" style={{ marginTop: 12 }}>
                {row && onEdit && (
                  <button className="ipx-btn" onClick={() => onEdit(row)}>
                    Edit
                  </button>
                )}
                <button className="ipx-btn ghost" onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
