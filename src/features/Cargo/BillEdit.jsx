// src/pages/PhysicalBills/BillEdit.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCustomShipmentById, updatePhysicalBill } from "../../api/billApi";
import { Toaster, toast } from "react-hot-toast";
import { FiSave } from "react-icons/fi";

function BillEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bill_no: "",
    pcs: "",
    weight: "",
    shipment_method: "",
    destination: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await getCustomShipmentById(id);
        const data = res?.data || res;
        setForm({
          bill_no: data?.bill_no || "",
          pcs: data?.pcs || "",
          weight: data?.weight || "",
          shipment_method: data?.shipment_method || "",
          destination: data?.destination || "",
        });
      } catch (err) {
        toast.error("Failed to load bill details");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePhysicalBill(id, form);
      toast.success("Bill updated successfully");
      navigate("/bills"); // redirect back to list
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to update bill";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500">
        Loading bill details…
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 font-[Inter]">
      <Toaster position="top-right" />
      <h2 className="text-2xl font-semibold text-slate-900 mb-6">Edit Bill</h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Bill No
          </label>
          <input
            type="text"
            name="bill_no"
            value={form.bill_no}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Pcs
            </label>
            <input
              type="number"
              name="pcs"
              value={form.pcs}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              name="weight"
              value={form.weight}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Shipment Method
          </label>
          <input
            type="text"
            name="shipment_method"
            value={form.shipment_method}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Destination
          </label>
          <input
            type="text"
            name="destination"
            value={form.destination}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-emerald-500 text-white px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg transition disabled:opacity-60"
          >
            <FiSave className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default BillEdit;
