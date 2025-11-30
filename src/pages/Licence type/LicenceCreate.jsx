import React, { useState } from "react";
import { createLicenseType } from "../../api/licenceType"; // adjust import path if needed

function LicenceCreate({ onSuccess, onClose }) {
  const [form, setForm] = useState({
    type_name: "",
    status: 1, // default active
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const created = await createLicenseType({
        type_name: form.type_name,
        status: Number(form.status),
      });
      if (onSuccess) onSuccess(created);
      if (onClose) onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to add license type");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl">
      <h2 className="text-xl font-semibold mb-4">Add License Type</h2>
      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type Name</label>
          <input
            type="text"
            name="type_name"
            value={form.type_name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
            placeholder="Enter license type (e.g. Morning Shift)"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          >
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LicenceCreate;
