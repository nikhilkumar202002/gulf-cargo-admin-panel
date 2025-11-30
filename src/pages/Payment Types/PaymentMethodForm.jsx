// PaymentMethodForm.jsx
import React, { useState } from "react";
import { createPaymentMethod } from "../api/paymentMethod"; // adjust path if needed
import toast, { Toaster } from "react-hot-toast";

export default function PaymentMethodForm({ onCreated }) {
  const [form, setForm] = useState({ name: "", status: "1" }); // "1" = Active, "0" = Inactive
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    else if (form.name.trim().length < 2) e.name = "Name must be at least 2 chars.";
    if (!["0", "1"].includes(form.status)) e.status = "Pick Active or Inactive.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Fix the errors and try again.");
      return;
    }
    setLoading(true);
    try {
      const payload = { name: form.name.trim(), status: Number(form.status) };
      const resp = await createPaymentMethod(payload);
      toast.success("Payment method created.");
      setForm({ name: "", status: "1" });
      if (onCreated) onCreated(resp);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create payment method.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow p-5">
      <Toaster position="top-right" />
      <h2 className="text-lg font-semibold mb-4">Create Payment Method</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="pm-name">
            Name <span className="text-red-600">*</span>
          </label>
          <input
            id="pm-name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g., Cash, Credit Card, UPI"
            className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${
              errors.name ? "border-red-500 ring-red-200" : "border-gray-300 focus:ring-blue-200"
            }`}
            disabled={loading}
            autoComplete="off"
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="pm-status">
            Status
          </label>
          <select
            id="pm-status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${
              errors.status ? "border-red-500 ring-red-200" : "border-gray-300 focus:ring-blue-200"
            }`}
            disabled={loading}
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
          {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Saving..." : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm({ name: "", status: "1" });
              setErrors({});
            }}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
