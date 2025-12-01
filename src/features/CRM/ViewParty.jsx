// src/pages/PartyView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPartyByIdFlexible } from "../../services/partyService";
import {
  FiPhone,
  FiMapPin,
  FiHome,
  FiFileText,
  FiDownload,
  FiHash,
  FiUser,
  FiCalendar,
  FiClock,
} from "react-icons/fi";
// Removed: import EditParties from "./EditParties";

// --- Utility Functions (Kept as is) ---
const s = (v, fallback = "—") => (v === null || v === undefined || String(v).trim() === "" ? fallback : String(v));

const pick = (obj, keys, fallback = "—") => {
  for (const k of keys) {
    const path = String(k).split(".");
    let cur = obj;
    for (const p of path) cur = cur?.[p];
    if (cur !== undefined && cur !== null && String(cur).trim() !== "") return cur;
  }
  return fallback;
};
// --- Utility Functions End ---

// --- Components (Kept as is) ---

const Pill = ({ children, tone = "slate" }) => {
  const tones = {
    green: "bg-emerald-100 text-emerald-800 ring-emerald-200", // Brighter background
    red: "bg-rose-100 text-rose-800 ring-rose-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-blue-100 text-blue-800 ring-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
        tones[tone] || tones.slate
      }`}
    >
      {children}
    </span>
  );
};

const Card = ({ title, icon, children, className = "", headerContent = null, subTitle = null }) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
    <div className="flex items-start justify-between p-4 pb-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide">{title}</h3>
          {subTitle && <p className="text-xs font-normal capitalize text-slate-400">{subTitle}</p>}
        </div>
      </div>
      {headerContent}
    </div>
    <div className="space-y-3 p-4 pt-0 text-sm">{children}</div>
  </div>
);

const Row = ({ label, value, mono = false, align = "right", icon: Icon = null }) => {
  const alignCls =
    align === "left" ? "justify-start text-left" : align === "center" ? "justify-center text-center" : "justify-between text-right";
  const labelCls = Icon ? "flex items-center gap-2" : "shrink-0";

  return (
    <div className="flex items-start gap-3">
      <span className={`min-w-[110px] text-slate-500 ${labelCls}`}>
        {Icon && <Icon className="h-4 w-4 text-slate-400" />} {label}
      </span>
      <span
        className={[
          "min-w-0 flex-1 font-medium text-slate-800",
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
    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-xl font-bold text-white shadow-lg ring-2 ring-indigo-300">
      {initials}
    </div>
  );
};
// --- Components End ---


// --- Main Component ---
export default function ViewParty({ id: modalId, isModalView = false }) {
  const params = useParams();
  const id = modalId || params.id;

  // const navigate = useNavigate(); // Removed since Back button is gone
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState("");
  const [party, setParty] = useState(null);
  // Removed: const [showEditModal, setShowEditModal] = useState(false);

  // Function to fetch and set party data
  const fetchParty = async () => {
    setIsLoading(true);
    setErr("");
    try {
      const res = await getPartyByIdFlexible(id);
      const obj = res?.data ?? res;
      setParty(obj || null);
    } catch (e) {
      setErr(e?.message || "Failed to load party.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParty();
  }, [id]);

  const statusTone = useMemo(() => {
    const s = String(party?.status || "").toLowerCase();
    return s === "active" ? "green" : s === "inactive" ? "red" : "slate";
  }, [party]);

  // --- Loading/Error/Not Found States ---
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-2 bg-slate-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
          Error: {err}
        </div>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm">
          No party found with ID: {id}.
        </div>
      </div>
    );
  }
  // --- End States ---

  // --- Data Extraction ---
  const {
    name = "—",
    contact_number = "",
    whatsapp_number = "",
    status = "unknown",
    address = "",
    created_at = "",
    updated_at = "",
  } = party;

  const branchName = pick(party, ["branch.name", "branch_name"], "—");
  const branchId = pick(party, ["branch.id", "branch_id"], "—");
  const customerType = pick(party, ["customer_type.customer_type", "customer_type.name", "customer_type"], "—");
  const customerTypeId = pick(party, ["customer_type.id", "customer_type_id"], "—");
  const docType = pick(party, ["document_type.document_type", "document_type.name", "document_type"], "—");
  const docTypeId = pick(party, ["document_type.id", "document_type_id"], "—");
  const docId = pick(party, ["document_id"], "—");
  const country = pick(party, ["country.name", "country"], "—");
  const state = pick(party, ["state.name", "state"], "—");
  const district = pick(party, ["district.name", "district"], "—");
  const city = pick(party, ["city"], "—");
  const postalCode = pick(party, ["postal_code", "pincode"], "—");
  const documents = Array.isArray(party.documents) ? party.documents : [];
  // --- End Data Extraction ---

  return (
    <section className="p-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-xl">
        {/* Header and Actions */}
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={name} />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{name || "Unnamed Party"}</h1>
                <Pill tone={statusTone}>{status || "—"}</Pill>

                {/* Removed: Edit Button */}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                {contact_number && (
                  <span className="inline-flex items-center gap-1">
                    <FiPhone className="text-slate-400" /> {contact_number}
                  </span>
                )}
                {whatsapp_number && (
                  <span className="inline-flex items-center gap-1">
                    <FiPhone className="text-slate-400" /> WhatsApp: {whatsapp_number}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <FiHash /> ID: {party.id}
                </span>
              </div>
            </div>
          </div>

          {/* Removed: Back Button */}
        </div>

        {/* Details Grid */}
        <div className="grid gap-6 p-6 lg:grid-cols-3">
          {/* Identity Card (Card 1) */}
          <Card title="Core Identity" icon={<FiUser />} className="lg:col-span-1">
            <Row label="Customer Type" value={s(customerType)} />
            <Row label="Type ID" value={s(customerTypeId)} mono />
            <Row label="Branch" value={s(branchName)} />
            <Row label="Branch ID" value={s(branchId)} mono />
          </Card>

          {/* Document Card (Card 2) */}
          <Card title="Identification Document" icon={<FiFileText />} className="lg:col-span-1">
            <Row label="Type" value={s(docType)} />
            <Row label="Type ID" value={s(docTypeId)} mono />
            <Row label="Document No." value={s(docId)} mono />
          </Card>

          {/* Timeline Card (Card 3) - Enhanced Style */}
          <Card title="Timeline" icon={<FiClock />} className="lg:col-span-1">
            <div className="rounded-lg bg-slate-50 p-3">
              <Row
                label="Created At"
                value={s(created_at ? new Date(created_at).toLocaleString() : "—")}
                icon={FiCalendar}
                align="left"
              />
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <Row
                label="Updated At"
                value={s(updated_at ? new Date(updated_at).toLocaleString() : "—")}
                icon={FiCalendar}
                align="left"
              />
            </div>
          </Card>
        </div>

        {/* Contact and Address Grid (Merged and Detailed) */}
        <div className="grid gap-6 p-6 pt-0 md:grid-cols-2 lg:grid-cols-3">
          {/* Contact Details (Card 4) */}
          <Card title="Contact Details" icon={<FiPhone />} className="md:col-span-1">
            <Row label="Phone" value={contact_number} icon={FiPhone} align="left" />
            <Row label="WhatsApp" value={whatsapp_number} icon={FiPhone} align="left" />
            <div className="pt-2 text-xs text-slate-500">
              Note: International format (E.164) is recommended.
            </div>
          </Card>

          {/* Location Details (Card 5) */}
          <Card title="Geographic Location" icon={<FiMapPin />} className="md:col-span-1">
            <Row label="Country" value={s(country)} />
            <Row label="State" value={s(state)} />
            <Row label="District" value={s(district)} />
            <Row label="City" value={s(city)} />
            <Row label="Postal Code" value={s(postalCode)} mono />
          </Card>

          {/* Full Address (Card 6) */}
          <Card title="Full Address" icon={<FiHome />} className="md:col-span-2 lg:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-800 whitespace-pre-wrap">
              {address || "—"}
            </div>
          </Card>
        </div>

        {/* Documents Table (Enhanced Document View) */}
        <div className="p-6 pt-0">
          <Card title="Uploaded Files" icon={<FiFileText />} className="w-full">
            {Array.isArray(documents) && documents.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        File
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        URL / Path
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {documents.map((url, i) => {
                      const filename = url.split("/").pop() || `Document ${i + 1}`;
                      const ext = (url.split(".").pop() || "").toUpperCase();

                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">
                              {`Document ${i + 1}`}
                            </div>
                            <div className="text-xs text-slate-500">{filename}</div>
                          </td>
                          <td className="px-6 py-4 break-all text-xs text-slate-600 max-w-xs">
                            {url}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Pill tone="blue">{ext || "FILE"}</Pill>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition"
                            >
                              <FiDownload /> Open
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
                <FiFileText className="mx-auto h-6 w-6 mb-2" />
                No documents uploaded for this party.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Removed: Edit Modal JSX */}
    </section>
  );
}