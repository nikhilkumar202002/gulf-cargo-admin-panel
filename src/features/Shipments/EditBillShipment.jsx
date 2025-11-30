import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBillShipmentById, updateBillShipment } from "../../services/billShipmentApi";
import { getPhysicalBills } from "../../services/billShipmentApi";
import { getPorts, getShipmentStatuses, getShipmentMethods } from "../../services/coreService";
import { FaArrowLeft, FaSave, FaTrash, FaPlus } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

const fmtDateInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
};

export default function EditShipmentBill() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({});
  const [attachedBills, setAttachedBills] = useState([]);
  const [availableBills, setAvailableBills] = useState([]);
  const [searchBill, setSearchBill] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ports, setPorts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [methods, setMethods] = useState([]);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  /* -------------------- Load Shipment -------------------- */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [portRes, statusRes, methodRes, shipmentRes] = await Promise.all([
          getPorts(),
          getShipmentStatuses(),
          getShipmentMethods(),
          getBillShipmentById(id),
        ]);

        const data = shipmentRes?.data?.data || shipmentRes?.data || shipmentRes;

        setPorts(portRes);
        setStatuses(statusRes);
        setMethods(methodRes);

        setFormData({
          shipment_number: data.shipment_number || "",
          awb_or_container_number: data.awb_or_container_number || "",
          license_details: data.license_details || "",
          exchange_rate: data.exchange_rate || "",
          shipment_details: data.shipment_details || "",
          origin_port_id: data.origin_port?.id ?? data.origin_port_id ?? "",
          destination_port_id: data.destination_port?.id ?? data.destination_port_id ?? "",
          shipping_method_id: data.shipping_method?.id ?? data.shipping_method_id ?? "",
          shipment_status_id: data.shipment_status?.id ?? data.shipment_status_id ?? "",
          branch_name: data.branch?.branch_name || "",
          created_by_name: data.created_by?.name || "",
          created_on: fmtDateInput(data.created_on),
        });

        // Extract custom shipment IDs and fetch all bills, then filter client-side
        const customShipmentIds = (data.custom_shipments || []).map((c) => c.id);
        if (customShipmentIds.length > 0) {
          const allBills = await getPhysicalBills();
          const bills = Array.isArray(allBills) ? allBills.filter((bill) => customShipmentIds.includes(bill.id)) : [];
          setAttachedBills(bills);
        } else {
          setAttachedBills([]);
        }
      } catch (err) {
        console.error("Error loading shipment:", err);
        toast.error("Failed to load shipment details.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  /* -------------------- Search Available Bills -------------------- */
  useEffect(() => {
    const fetchAvailable = async () => {
      if (!searchBill.trim()) {
        setAvailableBills([]);
        return;
      }
      try {
        const res = await getPhysicalBills({ search: searchBill, is_shipment: 0 });
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res)
          ? res
          : [];
        setAvailableBills(list);
      } catch (err) {
        console.error("Error fetching bills:", err);
      }
    };
    fetchAvailable();
  }, [searchBill]);

  /* -------------------- Handlers -------------------- */
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRemoveBill = async (billId) => {
    try {
      const remaining = attachedBills.filter((b) => b.id !== billId);
      await updateBillShipment(id, {
        ...formData,
        custom_shipment_ids: remaining.map((b) => b.id),
      });
      setAttachedBills(remaining);
      toast.success("Bill removed from shipment.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove bill.");
    }
  };

  const handleAddBill = async (billId) => {
    try {
      const payload = {
        ...formData,
        custom_shipment_ids: [...attachedBills.map((b) => b.id), billId],
      };
      await updateBillShipment(id, payload);
      const refreshed = await getBillShipmentById(id);
      const customShipmentIds = (refreshed?.data?.data?.custom_shipments || []).map((c) => c.id);
      if (customShipmentIds.length > 0) {
        const allBills = await getPhysicalBills();
        const bills = Array.isArray(allBills) ? allBills.filter((bill) => customShipmentIds.includes(bill.id)) : [];
        setAttachedBills(bills);
      } else {
        setAttachedBills([]);
      }
      toast.success("Bill added to shipment.");
      setSearchBill("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add bill.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        origin_port_id: parseInt(formData.origin_port_id) || undefined,
        destination_port_id: parseInt(formData.destination_port_id) || undefined,
        shipping_method_id: parseInt(formData.shipping_method_id) || undefined,
        shipment_status_id: parseInt(formData.shipment_status_id) || undefined,
        custom_shipment_ids: attachedBills.map((b) => b.id),
      };
      await updateBillShipment(id, payload);
      toast.success("Shipment updated successfully!");
      setTimeout(() => navigate("/bills-shipments/list"), 1000);
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save shipment.");
    } finally {
      setSaving(false);
    }
  };

  /* -------------------- Pagination -------------------- */
  const totalPages = Math.ceil(attachedBills.length / pageSize);
  const paginated = attachedBills.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  if (loading)
    return (
      <div className="p-8 text-center text-gray-600">Loading shipment details...</div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-700 hover:text-indigo-600"
        >
          <FaArrowLeft /> Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
        >
          <FaSave /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Shipment Form */}
      <div className="rounded-xl border bg-white shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Edit Shipment Details</h2>
        <div className="grid sm:grid-cols-2 gap-5 text-sm">
          <div>
            <label className="block text-gray-600">Shipment Number</label>
            <input
              type="text"
              value={formData.shipment_number || ""}
              onChange={(e) => handleChange("shipment_number", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-gray-600">AWB / Container Number</label>
            <input
              type="text"
              value={formData.awb_or_container_number || ""}
              onChange={(e) => handleChange("awb_or_container_number", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-gray-600">Origin Port</label>
            <select
              value={formData.origin_port_id || ""}
              onChange={(e) => handleChange("origin_port_id", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Select Origin</option>
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-600">Destination Port</label>
            <select
              value={formData.destination_port_id || ""}
              onChange={(e) => handleChange("destination_port_id", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Select Destination</option>
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-600">Shipping Method</label>
            <select
              value={formData.shipping_method_id || ""}
              onChange={(e) => handleChange("shipping_method_id", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Select Method</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-600">Shipment Status</label>
            <select
              value={formData.shipment_status_id || ""}
              onChange={(e) => handleChange("shipment_status_id", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Select Status</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-600">License Details</label>
            <input
              type="text"
              value={formData.license_details || ""}
              onChange={(e) => handleChange("license_details", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-gray-600">Exchange Rate</label>
            <input
              type="number"
              step="0.01"
              value={formData.exchange_rate || ""}
              onChange={(e) => handleChange("exchange_rate", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-gray-600">Shipment Details / Remarks</label>
            <textarea
              value={formData.shipment_details || ""}
              onChange={(e) => handleChange("shipment_details", e.target.value)}
              rows={3}
              className="border rounded-lg px-3 py-2 w-full"
            ></textarea>
          </div>

          <div>
            <label className="block text-gray-600">Branch</label>
            <input
              type="text"
              value={formData.branch_name || ""}
              readOnly
              className="border rounded-lg px-3 py-2 w-full bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-gray-600">Created By</label>
            <input
              type="text"
              value={formData.created_by_name || ""}
              readOnly
              className="border rounded-lg px-3 py-2 w-full bg-gray-50 text-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Attached Bills */}
      <div className="rounded-xl border bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Bills Under This Shipment ({attachedBills.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 border">SL No</th>
                <th className="p-2 border">Bill No</th>
                <th className="p-2 border">Pcs</th>
                <th className="p-2 border">Weight</th>
                <th className="p-2 border">Destination</th>
                <th className="p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((b, i) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td className="p-2 border">{b.invoice_no}</td>
                  <td className="p-2 border">{b.pcs}</td>
                  <td className="p-2 border">{b.weight}</td>
                  <td className="p-2 border">{b.des}</td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleRemoveBill(b.id)}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      <FaTrash /> Remove
                    </button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 p-4">
                    No bills found under this shipment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {attachedBills.length > pageSize && (
          <div className="flex justify-between items-center mt-4 text-sm">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border rounded"
            >
              Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border rounded"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add Bill */}
      <div className="rounded-xl border bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Add Bill to Shipment</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search Bill by Number..."
            value={searchBill}
            onChange={(e) => setSearchBill(e.target.value)}
            className="border rounded-lg px-3 py-2 flex-1"
          />
        </div>

        {availableBills.length > 0 && (
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 border">Bill No</th>
                <th className="p-2 border">Pcs</th>
                <th className="p-2 border">Weight</th>
                <th className="p-2 border">Destination</th>
                <th className="p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {availableBills.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{b.invoice_no}</td>
                  <td className="p-2 border">{b.pcs}</td>
                  <td className="p-2 border">{b.weight}</td>
                  <td className="p-2 border">{b.des}</td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleAddBill(b.id)}
                      className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                    >
                      <FaPlus /> Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
