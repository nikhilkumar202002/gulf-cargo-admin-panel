import React, { useState } from "react";
import { createDocumentType } from "../../../services/coreService";
import { toast } from "react-hot-toast";

export default function CreateDocument({ onCreated, onClose }) {
  const [form, setForm] = useState({ document_name: "", status: "1" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  /* ------------------ Validation ------------------ */
  const validate = () => {
    const e = {};
    if (!form.document_name.trim()) e.document_name = "Document name is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ------------------ Submit ------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return toast.error("Please fix the errors.");

    setLoading(true);
    try {
      const payload = {
        document_name: form.document_name.trim(),
        status: Number(form.status),
      };

      const res = await createDocumentType(payload);

      // Check for backend success flag if your API returns one
      if (res && res.success === false) {
         throw new Error(res.message || "Failed to create.");
      }

      toast.success("Document type created successfully!");
      onCreated?.(); // Refresh the list
      
      // Reset form
      setForm({ document_name: "", status: "1" });
      
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err.message || "Failed to create document type.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <h2 className="text-lg font-semibold text-gray-800">New Document Type</h2>

      {/* NAME */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Document Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Passport, Visa"
          value={form.document_name}
          onChange={(e) => setForm({ ...form, document_name: e.target.value })}
          className={`w-full rounded-xl px-3 py-2 text-sm shadow-sm border ${
            errors.document_name ? "border-red-500" : "border-gray-300"
          } focus:ring-indigo-500 focus:border-indigo-500`}
        />
        {errors.document_name && (
          <p className="text-xs text-red-600 mt-1">{errors.document_name}</p>
        )}
      </div>

      {/* STATUS */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex justify-end gap-3 pt-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 text-gray-700 transition"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? "Saving…" : "Create"}
        </button>
      </div>
    </form>
  );
}