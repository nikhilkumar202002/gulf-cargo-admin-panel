import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStaffById } from "../../services/staffService";
import { FiArrowLeft } from "react-icons/fi";

// --- Helpers ---
const safe = (v, d = "—") => (v === null || v === undefined || v === "" ? d : v);

// ✅ FIXED: Safe Date Formatter
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  
  // If it's already in DD-MM-YYYY format (e.g., "12-10-2024"), just return it
  if (String(dateStr).match(/^\d{2}-\d{2}-\d{4}$/)) {
    return dateStr;
  }

  // Otherwise, try to parse standard ISO dates (YYYY-MM-DD)
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString();
};

const normalize = (raw = {}) => {
  const u = raw.user || raw;

  return {
    id: u?.id ?? null,
    name: u?.name ?? "—",
    email: u?.email ?? "—",
    phone: u?.contact_number ?? u?.phone ?? "—",
    avatar: u?.profile_pic ?? "",
    status: u?.status ?? "Inactive",
    appointmentDate: formatDate(u?.appointment_date),
    role: u?.role?.name ?? "—",
    branch: u?.branch?.name ?? "—",
    
    visa: {
      typeName: u?.visa?.type_name ?? "—",
      expiry: formatDate(u?.visa?.expiry), // Apply here too
      status: u?.visa?.status ?? "—",
    },

    documents: {
      typeName: u?.documents?.document_type_name ?? "—",
      number: u?.documents?.document_number ?? "—",
      files: Array.isArray(u?.documents?.files) ? u.documents.files : [],
    },
  };
};

export default function StaffView() {
  const { id: routeId } = useParams();
  const id = useMemo(() => (routeId ? String(routeId) : ""), [routeId]);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await getStaffById(id);
        if (!cancelled) {
          const norm = normalize(res);
          setData(norm);
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load staff details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (err) {
    return (
      <div className="p-6">
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {err}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <FiArrowLeft /> Back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="mb-6 flex items-center gap-4">
            <div className="h-24 w-24 animate-pulse rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="mb-2 h-6 w-56 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-72 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-gray-500">Staff not found.</div>;

  const isActive = String(data.status).toLowerCase() === "active";

  return (
    <div className="p-6">
      {/* Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Staff Profile
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <FiArrowLeft /> Back
            </button>

          </div>
        </div>

        {/* Profile Row */}
        <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center border-b border-gray-100 pb-8">
          <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-full border-4 border-white shadow-md bg-gray-100">
            {data.avatar ? (
              <img
                src={data.avatar}
                alt={data.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 font-bold text-indigo-700 text-3xl">
                {String(data.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{safe(data.name)}</h1>
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-rose-50 text-rose-700 border border-rose-100"
                    }`}
                >
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                    {safe(data.status)}
                </span>
            </div>
            
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                 📧 <a href={`mailto:${data.email}`} className="hover:text-indigo-600 hover:underline">{safe(data.email)}</a>
              </span>
              <span className="flex items-center gap-2">
                 📱 {safe(data.phone)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                Role: {safe(data.role)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-100">
                Branch: {safe(data.branch)}
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-2">
            
            {/* Left Column: General & Visa */}
            <div className="space-y-8">
                <Section title="General Information">
                    <Info label="Staff ID" value={safe(data.id)} />
                    <Info label="Appointment Date" value={safe(data.appointmentDate)} />
                </Section>

                <Section title="Visa Details">
                    <Info label="Visa Type" value={safe(data.visa.typeName)} />
                    <Info label="Expiry Date" value={safe(data.visa.expiry)} />
                    <Info label="Visa Status" value={safe(data.visa.status)} />
                </Section>
            </div>

            {/* Right Column: Documents */}
            <div className="space-y-8">
                <Section title="Identity Document">
                    <Info label="Document Type" value={safe(data.documents.typeName)} />
                    <Info label="Document Number" value={safe(data.documents.number)} />
                    
                    <div className="mt-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Attached Files</div>
                        {data.documents.files.length > 0 ? (
                            <ul className="space-y-2">
                                {data.documents.files.map((url, i) => (
                                    <li key={i}>
                                        <a 
                                            href={url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="group flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition"
                                        >
                                            <div className="h-8 w-8 flex items-center justify-center bg-gray-100 rounded group-hover:bg-white text-gray-500">📄</div>
                                            <div className="text-sm font-medium text-indigo-700 group-hover:underline">
                                                View Document {i + 1}
                                            </div>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm text-gray-400 italic">No files attached</div>
                        )}
                    </div>
                </Section>
            </div>

        </div>
      </div>
    </div>
  );
}

/* --- UI Components --- */

function Section({ title, children }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">{title}</h3>
      <div className="grid grid-cols-1 gap-4">{children}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}