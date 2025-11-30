import React, { useState } from "react";
import { createDeliveryType } from "../../../api/deliveryType";
import { toast } from "react-hot-toast";

export default function CreateDeliveryType({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!name.trim()) {
      setErr("Name is required.");
      return;
    }

    try {
      setSubmitting(true);
       const payload = { name: name.trim(), status: Number(status) };
     if (description.trim()) payload.description = description.trim();

     const tId = toast.loading("Creating delivery type…");
      const res = await createDeliveryType(payload);
      if (res?.success) {
         toast.success("Delivery type created.", { id: tId });
        onCreated?.(res.data);
        onClose?.();
      } else {
        const msg = res?.message || "Failed to create delivery type.";
        setErr(msg);
        toast.error(msg, { id: tId });
      }
    } catch (e2) {
      const msg = "Failed to create delivery type.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {err}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Name</label>
        <input
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
          placeholder="e.g., Door to door"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea
          className="min-h-[88px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
          placeholder="Optional"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Status</label>
       <select
   className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
   value={status}
   onChange={(e) => setStatus(Number(e.target.value))}
 >
   <option value={1}>Active</option>
   <option value={0}>Inactive</option>
 </select>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}
