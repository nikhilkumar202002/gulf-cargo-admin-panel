import React, { useState } from "react";
import { createPaymentMethod } from "../../../services/coreService";
import { toast } from "react-hot-toast";

export default function CreatePaymentType({ onSuccess, onClose }) {
  const [form, setForm] = useState({ name: "", status: "1" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!["0", "1"].includes(form.status)) e.status = "Invalid status.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return toast.error("Fix errors before submitting.");

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        status: Number(form.status),
      };

      await createPaymentMethod(payload);

      toast.success("Payment method created successfully!");
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Add New Payment Type
      </h2>

      {/* Name Field */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Payment Type Name
        </label>
        <input
          type="text"
          className={`w-full rounded-xl px-4 py-2.5 text-sm border
            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            ${errors.name ? "border-red-500" : "border-gray-300"}`}
          placeholder="Enter payment method name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
      </div>

      {/* Status Field */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          className="w-full rounded-xl px-4 py-2.5 text-sm border border-gray-300
            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm 
            hover:bg-gray-50 transition"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium
            hover:bg-indigo-700 transition disabled:opacity-60"
        >
          {loading ? "Saving…" : "Create"}
        </button>
      </div>
    </form>
  );
}
