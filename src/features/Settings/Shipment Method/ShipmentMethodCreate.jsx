import React, { useState } from "react";
import { createShipmentMethod } from "../../../services/coreService";
import toast from "react-hot-toast";

export default function ShipmentMethodCreate({ onSuccess }) {

  const [name, setName] = useState("");
  const [status, setStatus] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [touchedName, setTouchedName] = useState(false);
  const [msg, setMsg] = useState({ text: "", variant: "" });

  const reset = () => {
    setName("");
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
      setMsg({ text: "Method name is required.", variant: "error" });
      return;
    }

    try {
      setSubmitting(true);

      await createShipmentMethod({
        name: trimmedName,
        status: Number(status)
      });

      toast.success(`Shipment Method "${trimmedName}" created successfully!`);

      onSuccess();          // close modal + refresh list (handled by parent)

    } catch (err) {
      const errors = err?.response?.data?.errors || {};
      const details = Object.entries(errors)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
        .join(" ");

      toast.error("Failed to create shipment method");

      setMsg({
        text:
          (err?.response?.data?.message ||
            err?.message ||
            "Failed to create shipment method.") +
          (details ? ` ${details}` : ""),
        variant: "error",
      });

    } finally {
      setSubmitting(false);
    }
  };

  const nameError = touchedName && !name.trim();

  return (
    <section className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Shipment Method</h2>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-900">
            Method Name <span className="text-red-500">*</span>
          </label>

          <input
            type="text"
            className={`mt-2 block w-full rounded-xl border px-3.5 py-2.5 shadow-sm
            ${nameError ? "border-red-400" : "border-gray-300"}
             focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="e.g., Air Freight"
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
                  : "bg-white text-gray-700 ring-gray-300"}`}
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
                  : "bg-white text-gray-700 ring-gray-300"}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${status === "0" ? "bg-red-500" : "bg-gray-300"}`} />
              Inactive
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={reset}
            disabled={submitting}
            className="rounded-xl border px-4 py-2.5 text-sm hover:bg-gray-50"
          >
            Reset
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create Method"}
          </button>
        </div>

        {msg.text && msg.variant === "error" && (
          <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-800 ring-1 ring-red-200">
            {msg.text}
          </div>
        )}
      </form>
    </section>
  );
}
