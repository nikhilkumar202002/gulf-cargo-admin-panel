import React, { useState } from "react";
import { createShipmentMethod } from "../../api/shipmentMethodApi";
import { useNavigate } from "react-router-dom";

export default function ShipmentMethodCreate() {
  const navigate = useNavigate();

  // form state
  const [name, setName] = useState("");
  const [status, setStatus] = useState("1");

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [touchedName, setTouchedName] = useState(false);
  const [msg, setMsg] = useState({ text: "", variant: "" }); // keep for local validation/errors

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

    const payload = {
      name: trimmedName,
      status: status === "" ? 1 : Number(status), // backend expects 0/1
    };

    try {
      setSubmitting(true);
      // NO TOKEN PASSED
      await createShipmentMethod(payload);

      navigate("/shipmentmethod/view", {
        state: {
          toast: {
            type: "success",
            title: "Shipment method created",
            message: `“${trimmedName}” was added successfully.`,
          },
        },
      });
    } catch (err) {
      const errors = err?.response?.data?.errors || err?.data?.errors || {};
      const details = Object.entries(errors)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
        .join(" ");
      setMsg({
        text:
          (err?.response?.data?.message || err?.message || "Failed to create shipment method.") +
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
      {/* Page header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Create Shipment Method</h1>
            <p className="text-sm text-gray-500 mt-1">
              Define a new method (e.g., <span className="font-medium">Air</span>,{" "}
              <span className="font-medium">Sea</span>).
            </p>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-2xl">
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="sm-name" className="block text-sm font-medium text-gray-900">
                Method Name <span className="text-red-500">*</span>
              </label>
              <input
                id="sm-name"
                type="text"
                className={`mt-2 block w-full rounded-xl border px-3.5 py-2.5 shadow-sm text-gray-900 placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  ${nameError ? "border-red-400" : "border-gray-300"}`}
                placeholder="e.g., Air Freight"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouchedName(true)}
                aria-invalid={nameError || undefined}
                aria-describedby={nameError ? "sm-name-error" : undefined}
                required
              />
              <div className="mt-1 flex items-center justify-between">
                {nameError && (
                  <p id="sm-name-error" className="text-xs text-red-600">
                    Name is required.
                  </p>
                )}
              </div>
            </div>

            {/* Status toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                    aria-pressed={status === "1"}
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
                    aria-pressed={status === "0"}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${status === "0" ? "bg-red-500" : "bg-gray-300"}`} />
                    Inactive
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={reset}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm
                           hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 104 12z" />
                    </svg>
                    Creating…
                  </>
                ) : (
                  "Create Method"
                )}
              </button>
            </div>

            {/* Local error message */}
            {msg.text && msg.variant === "error" && (
              <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-800 ring-1 ring-red-200">
                {msg.text}
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
