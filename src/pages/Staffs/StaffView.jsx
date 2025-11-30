// src/pages/StaffView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStaff } from "../../api/accountApi";

const safe = (v, d = "—") => (v === null || v === undefined || v === "" ? d : v);
const isActive = (v) => v === 1 || v === true || String(v).toLowerCase() === "active";

/** Normalize backend response to a consistent UI shape */
const normalize = (raw = {}) => {
  const u = raw.user || raw;
  const roleName = u?.role?.name ?? u?.role_name ?? u?.role ?? u?.role_id ?? "—";
  const branchName =
    u?.branch?.name ?? u?.branch_name ?? (typeof u?.branch === "string" ? u?.branch : "—");
  const visaObj = u?.visa || {};
  const docObj = u?.documents || {};

  return {
    id: u?.id ?? u?.staff_id ?? null,
    name: (u?.name ?? [u?.first_name, u?.last_name].filter(Boolean).join(" ")) || "—",
    email: u?.email ?? "—",
    phone: u?.contact_number ?? u?.phone ?? "—",
    avatar: u?.profile_pic ?? "",
    status: isActive(u?.status ?? u?.is_active ?? u?.active) ? "Active" : "Inactive",
    appointmentDate: u?.appointment_date ?? u?.joined_at ?? u?.hired_at ?? null,
    role: roleName,
    branch: branchName,
    visa: {
      typeId: visaObj?.type_id ?? null,
      typeName: visaObj?.type_name ?? "—",
      expiry: visaObj?.expiry ?? null,
      status: isActive(visaObj?.status) ? "Active" : (visaObj?.status || "—"),
    },
    documents: {
      typeId: docObj?.document_type_id ?? null,
      typeName: docObj?.document_type_name ?? "—",
      number: docObj?.document_number ?? "—",
      files: Array.isArray(docObj?.files) ? docObj.files : [],
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
        const res = await getStaff(id);
        const payload = res?.data ?? res; // accept {data:{...}} or {...}
        const norm = normalize(payload);
        if (!cancelled) setData(norm);
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
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {err}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          ⬅ Back
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
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-5 animate-pulse rounded bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-red-600">
        Staff not found.
        <div className="mt-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            ⬅ Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span role="img" aria-label="person">👤</span>
            Staff Details
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              ⬅ Back
            </button>
            {/* Optional Edit */}
            {/* <button
              onClick={() => navigate(`/hr&staff/edit/${data.id}`)}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              ✏️ Edit
            </button> */}
          </div>
        </div>

        {/* Profile row */}
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="h-24 w-24 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
            {data.avatar ? (
              <img
                src={data.avatar}
                alt={data.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 font-bold text-blue-800">
                {String(data.name || "U")
                  .trim()
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="text-lg font-semibold text-gray-900">{safe(data.name)}</div>
            <div className="mt-0.5 text-sm text-gray-600">
              <a className="text-blue-600 hover:underline" href={`mailto:${data.email}`}>
                {safe(data.email)}
              </a>
              <span className="mx-2 text-gray-300">•</span>
              <span>{safe(data.phone)}</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> {safe(data.role)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> {safe(data.branch)}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                  data.status === "Active"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-rose-50 text-rose-700 ring-rose-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    data.status === "Active" ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {safe(data.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Sections */}
        <Section title="General">
          <Info label="Staff ID" value={safe(data.id)} />
          <Info label="Date of Appointment" value={safe(data.appointmentDate)} />
        </Section>

        <Section title="Visa">
          <Info label="Type" value={safe(data.visa.typeName)} />
          <Info label="Expiry" value={safe(data.visa.expiry)} />
          <Info label="Status" value={safe(data.visa.status)} />
        </Section>

        <Section title="Documents">
          <Info label="Type" value={safe(data.documents.typeName)} />
          <Info label="Number" value={safe(data.documents.number)} />
          <div className="sm:col-span-2">
            <div className="text-sm text-gray-500">Files</div>
            {data.documents.files.length ? (
              <ul className="ml-5 mt-1 list-disc space-y-1 text-sm">
                {data.documents.files.map((url, i) => (
                  <li key={i}>
                    <a
                      className="text-blue-600 hover:underline"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View file {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-900">—</div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ----------------- small UI helpers (Tailwind) ----------------- */

function Section({ title, children }) {
  return (
    <div className="mt-6">
      <div className="mb-3 text-sm font-semibold text-gray-800">{title}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}
