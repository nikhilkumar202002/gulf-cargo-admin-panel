import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getBranchByIdSmart } from "../../api/branchApi";
import Avatar from "../../components/Avatar";
import { FiArrowLeft } from "react-icons/fi";
import { FaExternalLinkAlt, FaGlobe, FaMapMarkerAlt, FaPhoneAlt } from "react-icons/fa";
import "../styles.css";
import "./BranchStyles.css";

/* ---------------- helpers ---------------- */
const Skel = ({ w = 120, h = 14, r = 8, className = "" }) => (
  <span
    className={`skel ${className}`}
    style={{
      display: "inline-block",
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      borderRadius: r,
    }}
    aria-hidden="true"
  />
);
const decodeHtml = (s) => String(s || "").replace(/&amp;/g, "&");
const isActiveStatus = (v) => {
  if (v === 1 || v === "1" || v === true) return true;
  if (typeof v === "string") return v.toLowerCase() === "active";
  return false;
};

/* ---------------- start_number finder (tolerant + deep) ---------------- */
const digitStr = (v) => String(v ?? "").replace(/\D+/g, "");

/** Recursively search for a 6-digit-ish start number across nested objects */
const findStartNumberDeep = (obj, depth = 0) => {
  if (!obj || typeof obj !== "object" || depth > 4) return "";

  // 1) explicit favorites first
  const explicitPaths = [
    "start_number",
    "startNumber",
    "invoice_start_number",
    "invoiceStartNumber",
    "invoice_start",
    "invoiceStart",
    "startNo",
    "start_no",
  ];
  for (const k of explicitPaths) {
    if (k in obj) {
      const ds = digitStr(obj[k]);
      if (ds) return ds.slice(0, 6);
    }
  }

  // 2) common containers
  const containers = ["invoice", "invoices", "settings", "meta", "data", "attributes"];
  for (const c of containers) {
    if (obj[c]) {
      const ds = findStartNumberDeep(obj[c], depth + 1);
      if (ds) return ds;
    }
  }

  // 3) heuristic on keys
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "object" && v) {
      const ds = findStartNumberDeep(v, depth + 1);
      if (ds) return ds;
    } else {
      if (/(start).*(invoice|number)|(invoice).*(start)/i.test(k)) {
        const ds = digitStr(v);
        if (ds) return ds.slice(0, 6);
      }
    }
  }
  return "";
};

const pickStartNumber = (b) => {
  return findStartNumberDeep(b) || "";
};

export default function ViewBranch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const b = await getBranchByIdSmart(id);
        if (alive) setBranch(b);
      } catch (e) {
        if (alive) {
          const code = e?.response?.status;
          setError(
            code === 404
              ? "Branch not found (404)."
              : e?.response?.data?.message || "Failed to load branch."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const isActive = isActiveStatus(branch?.status);
  const startNumber = pickStartNumber(branch);

  return (
    <section className="vb-wrap">
      {/* Top bar */}
      <div className="vb-head">
        <button className="vb-back" onClick={() => navigate(-1)}>
          <FiArrowLeft size={18} /> Back
        </button>
        <div className="grow" />
        <Link to="/branches" className="ipx-btn ghost sm">
          All Branches
        </Link>
      </div>

      {error && <div className="vb-card vb-error">{error}</div>}

      {/* Main card */}
      <div className="vb-card vb-card-elev" aria-busy={loading}>
        {/* Identity row */}
        <div className="flex items-center gap-4 mb-4">
          {loading ? (
            <Skel w={120} h={64} r={12} />
          ) : (
            <Avatar
              url={branch?.logo_url}
              name={branch?.branch_name}
              width={120}
              height={64}
            />
          )}
          <div className="min-w-0">
            {loading ? (
              <>
                <Skel w={260} h={22} r={8} />
                <div className="mt-2 flex items-center gap-2">
                  <Skel w={80} h={22} r={999} />
                  <Skel w={130} h={18} r={8} />
                </div>
              </>
            ) : (
              <>
                <h3 className="vb-branch-name m-0">
                  {branch?.branch_name || "—"}
                </h3>
                <div className="vb-badges mt-1 flex items-center gap-2">
                  <span className={`ipx-pill ${isActive ? "ok" : "muted"}`}>
                    {isActive ? "Active" : "Inactive"}
                  </span>
                  {branch?.branch_code && (
                    <span className="vb-code-chip">Code: {branch.branch_code}</span>
                  )}
                  {branch?.branch_location && (
                    <span className="vb-code-chip">
                      <FaMapMarkerAlt /> {branch.branch_location}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="vb-grid">
          {/* Identity */}
          <div className="vb-block">
            <h4 className="vb-title">Identity</h4>
            <KV
              k="Arabic Name"
              v={loading ? <Skel w="60%" /> : branch?.branch_name_ar || "—"}
            />
            <KV
              k="Address"
              v={
                loading ? (
                  <>
                    <Skel w="80%" />
                    <Skel w="50%" />
                  </>
                ) : (
                  decodeHtml(branch?.branch_address) || "—"
                )
              }
            />
          </div>

          {/* Contacts */}
          <div className="vb-block">
            <h4 className="vb-title">Contacts</h4>
            <KV
              k="Primary Phone"
              v={
                loading ? (
                  <Skel w="40%" />
                ) : (
                  <span className="flex items-center gap-2">
                    <FaPhoneAlt className="opacity-70" />
                    {branch?.branch_contact_number || "—"}
                  </span>
                )
              }
            />
            <KV
              k="Alternate Phone"
              v={loading ? <Skel w="40%" /> : branch?.branch_alternative_number || "—"}
            />
            <KV
              k="Email"
              v={loading ? <Skel w="60%" /> : branch?.branch_email || "—"}
            />
            {/* NEW: Start Number */}
            <KV
              k="Invoice starting (6 digits)"
              v={loading ? <Skel w="30%" /> : startNumber || "—"}
            />
          </div>

          {/* Web */}
          <div className="vb-block">
            <h4 className="vb-title">Web</h4>
            <KV
              k="Website"
              v={
                loading ? (
                  <Skel w="70%" />
                ) : branch?.branch_website ? (
                  <a
                    className="vb-link inline-flex items-center gap-2"
                    href={branch.branch_website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaGlobe /> {branch.branch_website}{" "}
                    <FaExternalLinkAlt className="opacity-70" />
                  </a>
                ) : (
                  "—"
                )
              }
            />
          </div>

          {/* Meta */}
          <div className="vb-block">
            <h4 className="vb-title">Created By</h4>
            <KV k="Name" v={loading ? <Skel w="40%" /> : branch?.created_by || "—"} />
            <KV
              k="Email"
              v={loading ? <Skel w="60%" /> : branch?.created_by_email || "—"}
            />
          </div>
        </div>
      </div>

      <style>{`
        .skel{background:#e5e7eb;position:relative;overflow:hidden}
        .skel::after{content:"";position:absolute;inset:0;transform:translateX(-100%);
          background:linear-gradient(90deg, rgba(229,231,235,0) 0%, rgba(255,255,255,.75) 50%, rgba(229,231,235,0) 100%);
          animation:skel-shimmer 1.2s infinite}
        @keyframes skel-shimmer{100%{transform:translateX(100%)}}

        .vb-card-elev{border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.06)}
        .vb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}
        @media (max-width: 900px){ .vb-grid{grid-template-columns:1fr} }

        .vb-block{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px}
        .vb-title{font-size:.95rem;font-weight:700;margin:0 0 10px 0}

        .vb-kv{display:grid;grid-template-columns:160px 1fr;gap:10px;padding:8px 0;border-top:1px dashed #e5e7eb}
        .vb-kv:first-of-type{border-top:0}
        .vb-k{color:#64748b;font-size:.85rem}
        .vb-v{color:#0f172a}

        .vb-branch-name{font-size:1.25rem;font-weight:700}
        .vb-code-chip{background:#EEF2FF;color:#3730A3;padding:.125rem .5rem;border-radius:999px;font-size:.75rem;display:inline-flex;align-items:center;gap:.375rem}
        .vb-link{color:#1f6feb;text-decoration:none}
        .vb-link:hover{ text-decoration:underline }
      `}</style>
    </section>
  );
}

function KV({ k, v }) {
  return (
    <div className="vb-kv">
      <div className="vb-k">{k}</div>
      <div className="vb-v">{v}</div>
    </div>
  );
}
