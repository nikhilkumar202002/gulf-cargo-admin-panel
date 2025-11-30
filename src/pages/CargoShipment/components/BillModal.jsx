// src/pages/InvoiceModal.jsx
import React from "react";
import InvoiceOnly from "../../../components/InvoiceOnly"; // 👈 use InvoiceOnly instead

export default function BillModal({ open, onClose, shipment }) {
  if (!open || !shipment) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 p-4 overflow-auto">
        <div className="mx-auto max-w-6xl bg-white rounded-2xl shadow-2xl">
          {/* Modal header (not printed) */}
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-4 py-2 print:hidden">
            <button
              onClick={onClose}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              ✕ Close
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  if (shipment?.booking_no) {
                    const safe = String(shipment.booking_no).replace(/[\\/:*?"<>|]/g, "-");
                    document.title = safe;
                  }
                  window.print();
                }}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Print / Save PDF
              </button>
            </div>
          </div>

          {/* Body */}
          <InvoiceOnly shipment={shipment} modal /> {/* 👈 replaced InvoiceView */}
        </div>
      </div>
    </div>
  );
}
