import { useEffect } from "react";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";

export default function UnsavedChangesDialog({ open, onStay, onLeave }) {
  const { registerEscape } = useKeyboardShortcuts();

  useEffect(() => {
    if (!open) return undefined;
    return registerEscape(() => {
      onStay();
      return true;
    }, 100);
  }, [open, onStay, registerEscape]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
      >
        <h2 id="unsaved-changes-title" className="text-lg font-semibold text-slate-900">
          Unsaved changes
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          You have unsaved changes. Are you sure you want to leave this page?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onStay}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
