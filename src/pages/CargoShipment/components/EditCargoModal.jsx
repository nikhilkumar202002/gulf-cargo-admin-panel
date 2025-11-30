import React from "react";
import EditCargo from "../EditCargo";
import { Dialog, Transition } from '@headlessui/react';

export default function EditCargoModal({ open, onClose, cargoId, onSaved }) {
  if (!open || !cargoId) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 p-4 overflow-auto">
        <div className="mx-auto max-w-6xl bg-white rounded-2xl shadow-2xl">
          {/* Modal header */}
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-4 py-2">
            <button
              onClick={onClose}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              ✕ Close
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            <EditCargo
              cargoId={cargoId} 
            isModal={true} 
            onCancel={onClose}
            onSaved={onSaved}
            />
          </div>
        </div>
      </div>
    </div>
  );
}