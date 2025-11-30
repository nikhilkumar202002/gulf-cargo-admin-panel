import React, { useState } from "react";
import { createPort } from "../../../services/coreService";
import toast from "react-hot-toast";

export default function PortCreate({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [touchedName, setTouchedName] = useState(false);
  const [msg, setMsg] = useState({ text: "", variant: "" });

  const reset = () => {
    setName("");
    setCode("");
    setStatus("1");
    setTouchedName(false);
    setMsg({ text: "", variant: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: "", variant: "" });
    setTouchedName(true);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setMsg({ text: "Port name is required.", variant: "error" });
      return;
    }

    const payload = {
      name: trimmedName,
      ...(code.trim() ? { code: code.trim() } : {}),
      status: Number(status),
    };

    try {
      setSubmitting(true);
      await createPort(payload);

      toast.success(`Port "${trimmedName}" created successfully!`);

      if (onSuccess) onSuccess(); // refresh list
      if (onClose) onClose();     // close modal

    } catch (err) {
      const errors = err?.response?.data?.errors || err?.data?.errors || {};
      const details = Object.entries(errors)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
        .join(" ");

      setMsg({
        text:
          (err?.response?.data?.message ||
            err?.message ||
            "Failed to create port.") +
          (details ? ` ${details}` : ""),
        variant: "error",
      });

      toast.error("Failed to create port.");

    } finally {
      setSubmitting(false);
    }
  };

  const nameError = touchedName && !name.trim();

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Port</h2>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Port Name */}
        <div>
          <label className="block text-sm font-medium text-gray-900">
            Port Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`mt-2 block w-full rounded-xl border px-3.5 py-2.5 shadow-sm text-gray-900 placeholder:text-gray-400
              ${nameError ? "border-red-400" : "border-gray-300"}
              focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="e.g., Cochin"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouchedName(true)}
          />
          {nameError && (
            <p className="mt-1 text-xs text-red-600">Name is required.</p>
          )}
        </div>

        {/* Status */}
        <div>
          <span className="block text-sm font-medium text-gray-900">Status</span>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStatus("1")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ring-1
                ${status === "1"
                  ? "bg-green-50 text-green-700 ring-green-200"
                  : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${status === "1" ? "bg-green-500" : "bg-gray-300"}`} />
              Active
            </button>

            <button
              type="button"
              onClick={() => setStatus("0")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ring-1
                ${status === "0"
                  ? "bg-red-50 text-red-700 ring-red-200"
                  : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${status === "0" ? "bg-red-500" : "bg-gray-300"}`} />
              Inactive
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            disabled={submitting}
            className="rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Reset
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create Port"}
          </button>
        </div>

        {/* Error Message */}
        {msg.text && msg.variant === "error" && (
          <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-800 ring-1 ring-red-200">
            {msg.text}
          </div>
        )}
      </form>
    </div>
  );
}
