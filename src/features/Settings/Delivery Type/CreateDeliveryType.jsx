import React, { useState } from "react";
import { createDeliveryType } from "../../../services/coreService";
import { toast } from "react-hot-toast";

export default function CreateDeliveryType({ onCreated, onClose }) {
  const [form, setForm] = useState({ name: "", status: "1" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  /* ------------------ Validation ------------------ */
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!["0", "1"].includes(form.status)) e.status = "Invalid status.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ------------------ Submit Handler ------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return toast.error("Fix the errors and try again.");

    setLoading(true);
    try {
      await createDeliveryType({
        name: form.name.trim(),
        status: Number(form.status),
      });

      toast.success("Delivery type created successfully!");
      onCreated?.();
      onClose?.();

      setForm({ name: "", status: "1" });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create delivery type.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-5">
        Add New Delivery Type
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Delivery Type Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Type Name
          </label>

          <input
            type="text"
            placeholder="Enter delivery type name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`w-full rounded-xl px-3 py-2 text-sm shadow-sm border ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>

          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700"
          >
            {loading ? "Saving…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
