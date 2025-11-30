import React from "react";
import { IoClose } from "react-icons/io5";

/**
 * Expects a "display" user object with:
 *  id, name, email, contact_number, status, appointment_date,
 *  role: { id, name }, branch: { id, name },
 *  visa: { type_id, type_name, expiry, status },
 *  documents: { document_type_id, document_type_name, document_number, files[] },
 *  profile_pic
 */
export default function StaffModal({ open, onClose, data }) {
  if (!open) return null;

  const Row = ({ label, value, children }) => (
    <div className="grid grid-cols-3 gap-3 py-2">
      <div className="col-span-1 text-sm font-medium text-slate-600">{label}</div>
      <div className="col-span-2 text-sm text-slate-800 break-words">
        {children ?? (value ?? "—")}
      </div>
    </div>
  );

  const Pill = ({ v, activeBg = "emerald" }) => {
    const active =
      String(v).toLowerCase() === "active" ||
      String(v) === "1" || // string '1'
      v === 1 || // number 1
      String(v).toLowerCase() === "true";
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1
        ${active ? `bg-${activeBg}-50 text-${activeBg}-700 ring-${activeBg}-200`
                 : "bg-rose-50 text-rose-700 ring-rose-200"}`}
      >
        {active ? "Active" : "Inactive"}
      </span>
    );
  };

  const docs = data?.documents || {};
  const files = Array.isArray(docs.files) ? docs.files : [];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Card */}
      <div className="relative z-[1001] w-[min(780px,92vw)] overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-800">✅ Staff registered</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
            aria-label="Close"
            title="Close"
          >
            <IoClose size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {!data ? (
            <p className="text-sm text-slate-600">No data available.</p>
          ) : (
            <>
              {/* Primary */}
              <Row label="Name" value={data.name} />
              <Row label="Email" value={data.email} />
              <Row label="Contact" value={data.contact_full} />
              <Row label="Status"><Pill v={data.status} activeBg="emerald" /></Row>

              {/* Role / Branch */}
              <Row label="Role" value={data.role?.name} />
              <Row label="Branch" value={data.branch?.name} />

              {/* Employment / Visa */}
              <Row label="Appointment Date" value={data.appointment_date} />
              <Row label="Visa Type" value={data.visa?.type_name} />
              <Row label="Visa Expiry" value={data.visa?.expiry} />
              <Row label="Visa Status"><Pill v={data.visa?.status} activeBg="sky" /></Row>

              {/* Documents */}
              <Row label="Document Type" value={docs.document_type_name} />
              <Row label="Document Number" value={docs.document_number} />
              {files.length > 0 && (
                <Row label="Files">
                  <ul className="list-disc space-y-1 pl-5">
                    {files.map((url, i) => (
                      <li key={i}>
                        <a
                          className="text-sm text-sky-700 underline underline-offset-2 break-all"
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {url.split("/").pop() || `Document ${i + 1}`}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Row>
              )}

              {/* Profile Photo */}
              {data.profile_pic && (
                <Row label="Profile Photo">
                  <img
                    src={data.profile_pic}
                    alt="Profile"
                    className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                </Row>
              )}

              {/* ID */}
              {data.id && <Row label="User ID" value={String(data.id)} />}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
