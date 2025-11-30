import React, { useState } from "react";
import { createVisaType } from "../../../services/coreService";
import { toast } from "react-hot-toast";

export default function CreateVisaType({ onSuccess, onClose }) {
  const [form, setForm] = useState({
    type_name: "",
    status: "1",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  /* ------------------ VALIDATION ------------------ */
  const validate = () => {
    const e = {};
    if (!form.type_name.trim()) e.type_name = "Visa type name is required.";
    if (!["0", "1"].includes(form.status)) e.status = "Invalid status.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ------------------ SUBMIT ------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return toast.error("Fix the errors and try again.");

    setLoading(true);
    try {
      const payload = {
        type_name: form.type_name.trim(),
        status: Number(form.status),
      };

      await createVisaType(payload);

      toast.success("Visa Type Created!");
      onSuccess(); // Close modal + refresh list
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create.");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ UI ------------------ */
  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Add Visa Type</h2>

      {/* TYPE NAME */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">Visa Type Name</label>
        <input
          type="text"
          className={`w-full rounded-xl border px-3 py-2 text-sm ${
            errors.type_name ? "border-red-500" : "border-gray-300"
          }`}
          value={form.type_name}
          onChange={(e) => setForm({ ...form, type_name: e.target.value })}
        />
        {errors.type_name && (
          <p className="text-xs text-red-600">{errors.type_name}</p>
        )}
      </div>

      {/* STATUS */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">Status</label>
        <select
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Create"}
        </button>
      </div>
    </form>
  );
}
