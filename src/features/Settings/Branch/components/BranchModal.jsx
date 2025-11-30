import React from "react";
import { IoClose } from "react-icons/io5";

/**
 * BranchModal
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - data: object | null  // branch payload or API-created record
 */
export default function BranchModal({ open, onClose, data }) {
  if (!open) return null;

  const Row = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-3 py-2">
      <div className="col-span-1 text-sm font-medium text-slate-600">{label}</div>
      <div className="col-span-2 text-sm text-slate-800 break-words">{value || "—"}</div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-[1001] w-[min(720px,92vw)] overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-800">
            ✅ Branch created successfully
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
            aria-label="Close"
            title="Close"
          >
            <IoClose size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {!data ? (
            <p className="text-sm text-slate-600">No data available.</p>
          ) : (
            <>
              <Row label="Branch Name" value={data.branch_name} />
              <Row label="Branch Code" value={data.branch_code} />
              <Row label="Location" value={data.branch_location} />
              <Row label="Address" value={data.branch_address} />
              <Row label="Email" value={data.branch_email} />
              <Row label="Contact Number" value={data.branch_contact_number} />
              <Row label="Alternative Number" value={data.branch_alternative_number} />
              <Row label="Website" value={data.branch_website} />
              <Row label="Status" value={String(data.status) === "1" || data.status === "Active" ? "Active" : "Inactive"} />
              <Row label="Created By" value={data.created_by} />
              <Row label="Created By Email" value={data.created_by_email} />
              {data.id ? <Row label="ID" value={String(data.id)} /> : null}
            </>
          )}
        </div>

        {/* Footer */}
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
