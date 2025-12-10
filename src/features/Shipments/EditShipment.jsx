import React, { useEffect, useState } from "react";
import { getBillShipmentById, updateBillShipment,getPhysicalBills} from "../../services/billShipmentApi";
import { getPorts, getShipmentStatuses, getActiveShipmentMethods } from "../../services/coreService";
import { FaSave, FaTrash, FaPlus, FaTimes } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

const fmtDateInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
};

// Helper: Match a name to an ID
const findIdByName = (list, name) => {
  if (!name || !list) return "";
  const str = String(name).trim().toLowerCase();
  const found = list.find((item) => String(item.name).trim().toLowerCase() === str);
  return found ? found.id : "";
};

export default function EditShipmentModal({ shipmentId, isOpen, onClose, onSuccess }) {
  // Form State
  const [formData, setFormData] = useState({
    shipment_number: "",
    awb_or_container_number: "",
    origin_port_id: "",
    destination_port_id: "",
    shipping_method_id: "",
    shipment_status_id: "",
    license_details: "",
    exchange_rate: "",
    shipment_details: "",
    branch_name: "",
    created_by_name: "",
    created_on: "",
  });

  // Bills State
  const [attachedBills, setAttachedBills] = useState([]); 
  const [availableBills, setAvailableBills] = useState([]); 
  const [searchBill, setSearchBill] = useState("");
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5; // Reduced page size for modal view

  // Dropdown Data
  const [ports, setPorts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [methods, setMethods] = useState([]);

  /* -------------------- 1. Load Data -------------------- */
  useEffect(() => {
    if (!isOpen || !shipmentId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [portRes, statusRes, methodRes, shipmentRes] = await Promise.all([
          getPorts(),
          getShipmentStatuses(),
          getActiveShipmentMethods(),
          getBillShipmentById(shipmentId),
        ]);

        const data = shipmentRes?.data?.data || shipmentRes?.data || shipmentRes;
        
        // Normalize lookup lists
        const portList = Array.isArray(portRes) ? portRes : (portRes?.data || []);
        const statusList = Array.isArray(statusRes) ? statusRes : (statusRes?.data || []);
        const methodList = Array.isArray(methodRes) ? methodRes : (methodRes?.data || []);

        setPorts(portList);
        setStatuses(statusList);
        setMethods(methodList);

        // Map Data to Form
        const originId = typeof data.origin_port === 'object' ? data.origin_port?.id : findIdByName(portList, data.origin_port);
        const destId = typeof data.destination_port === 'object' ? data.destination_port?.id : findIdByName(portList, data.destination_port);
        const methodId = typeof data.shipping_method === 'object' ? data.shipping_method?.id : findIdByName(methodList, data.shipping_method);
        const statusId = typeof data.status === 'object' ? data.status?.id : findIdByName(statusList, data.status || data.shipment_status);

        setFormData({
          shipment_number: data.shipment_number || "",
          awb_or_container_number: data.awb_or_container_number || "",
          license_details: data.license_details || "",
          exchange_rate: data.exchange_rate || "",
          shipment_details: data.shipment_details || "",
          origin_port_id: originId || "",
          destination_port_id: destId || "",
          shipping_method_id: methodId || "",
          shipment_status_id: statusId || "",
          branch_name: data.branch_name || data.branch?.branch_name || "",
          created_by_name: data.created_by_name || data.created_by?.name || "",
          created_on: fmtDateInput(data.created_on),
        });

        // Load Attached Bills
        const existingRefIds = (data.custom_shipments || []).map(c => Number(c.id));
        if (existingRefIds.length > 0) {
            const allAssigned = await getPhysicalBills({ limit: 5000 }, true); 
            const safeList = Array.isArray(allAssigned) ? allAssigned : (allAssigned?.data || []);
            const enrichedBills = safeList.filter(b => existingRefIds.includes(Number(b.id)));
            setAttachedBills(enrichedBills);
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
  }, [shipmentId, isOpen]);

  /* -------------------- 2. Search Bills -------------------- */
  useEffect(() => {
    if (!isOpen) return;
    const fetchAvailable = async () => {
      if (!searchBill.trim()) {
        setAvailableBills([]);
        return;
      }
      try {
        const res = await getPhysicalBills({ search: searchBill }, false); 
        const list = Array.isArray(res) ? res : (res?.data?.data || []);
        setAvailableBills(list);
      } catch (err) {
        console.error("Error fetching bills:", err);
      }
    };
    const timeoutId = setTimeout(() => fetchAvailable(), 500);
    return () => clearTimeout(timeoutId);
  }, [searchBill, isOpen]);

  /* -------------------- Handlers -------------------- */
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRemoveBill = (billId) => {
    // No window.confirm for faster UI in modal, user can just Cancel if mistake
    setAttachedBills((prev) => prev.filter((b) => b.id !== billId));
  };

  const handleAddBill = (bill) => {
    if (attachedBills.some((b) => b.id === bill.id)) {
      toast.error("Bill is already in this shipment");
      return;
    }
    setAttachedBills((prev) => [...prev, bill]);
    setSearchBill(""); 
    setAvailableBills([]);
    toast.success("Bill added");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        shipment_number: formData.shipment_number,
        awb_or_container_number: formData.awb_or_container_number,
        license_details: formData.license_details,
        exchange_rate: formData.exchange_rate,
        shipment_details: formData.shipment_details,
        origin_port_id: Number(formData.origin_port_id) || null, 
        destination_port_id: Number(formData.destination_port_id) || null,
        shipping_method_id: Number(formData.shipping_method_id) || null,
        shipment_status_id: Number(formData.shipment_status_id) || null,
        custom_shipment_ids: attachedBills.map((b) => Number(b.id)),
      };

      await updateBillShipment(shipmentId, payload);
      toast.success("Shipment updated successfully!");

      // Close modal and refresh parent list
      if (onSuccess) onSuccess(); 
      if (onClose) onClose();

    } catch (err) {
      console.error("Save error details:", err);
      const validationErrors = err?.response?.data?.errors;
      const serverMsg = err?.response?.data?.message;
      
      if (validationErrors) {
        Object.values(validationErrors).forEach((errorArray) => {
           errorArray.forEach((msg) => toast.error(msg));
        });
      } else {
        toast.error(serverMsg || "Failed to update shipment.");
      }
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(attachedBills.length / pageSize));
  const paginatedBills = attachedBills.slice((page - 1) * pageSize, page * pageSize);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        <Toaster position="top-center" />

        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            Edit Shipment #{formData.shipment_number || shipmentId}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {loading ? (
             <div className="py-20 text-center text-gray-500">Loading shipment data...</div>
          ) : (
            <>
              {/* Form Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
                <div>
                    <label className="block text-gray-600 font-medium mb-1">Shipment Number</label>
                    <input type="text" value={formData.shipment_number} onChange={(e) => handleChange("shipment_number", e.target.value)} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-indigo-100 outline-none" />
                </div>
                <div>
                    <label className="block text-gray-600 font-medium mb-1">AWB / Container</label>
                    <input type="text" value={formData.awb_or_container_number} onChange={(e) => handleChange("awb_or_container_number", e.target.value)} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-indigo-100 outline-none" />
                </div>
                <div>
                    <label className="block text-gray-600 font-medium mb-1">Origin</label>
                    <select value={formData.origin_port_id} onChange={(e) => handleChange("origin_port_id", e.target.value)} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="">Select Origin</option>
                    {ports.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-gray-600 font-medium mb-1">Destination</label>
                    <select value={formData.destination_port_id} onChange={(e) => handleChange("destination_port_id", e.target.value)} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="">Select Destination</option>
                    {ports.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-gray-600 font-medium mb-1">Method</label>
                    <select value={formData.shipping_method_id} onChange={(e) => handleChange("shipping_method_id", e.target.value)} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="">Select Method</option>
                    {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-gray-600 font-medium mb-1">Status</label>
                    <select value={formData.shipment_status_id} onChange={(e) => handleChange("shipment_status_id", e.target.value)} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="">Select Status</option>
                    {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-gray-600 font-medium mb-1">License Details</label>
                    <input type="text" value={formData.license_details} onChange={(e) => handleChange("license_details", e.target.value)} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-indigo-100 outline-none" />
                </div>
                <div>
                    <label className="block text-gray-600 font-medium mb-1">Exchange Rate</label>
                    <input type="number" step="0.01" value={formData.exchange_rate} onChange={(e) => handleChange("exchange_rate", e.target.value)} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-indigo-100 outline-none" />
                </div>
                <div className="lg:col-span-3">
                    <label className="block text-gray-600 font-medium mb-1">Details / Remarks</label>
                    <textarea value={formData.shipment_details} onChange={(e) => handleChange("shipment_details", e.target.value)} rows={2} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-indigo-100 outline-none"></textarea>
                </div>
              </div>

              {/* Bills Section */}
              <div className="grid lg:grid-cols-2 gap-6 mt-6 border-t pt-6">
                
                {/* 1. Add Bills Column */}
                <div className="border rounded-xl p-4 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm">Add New Bills</h3>
                    <div className="relative mb-3">
                        <input type="text" placeholder="Search unassigned bill no..." value={searchBill} onChange={(e) => setSearchBill(e.target.value)} className="border rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {availableBills.length === 0 && searchBill && <div className="text-xs text-gray-500">No results found.</div>}
                        {availableBills.map((b) => (
                            <div key={b.id} className="flex items-center justify-between p-2 bg-white border rounded shadow-sm text-sm">
                                <div>
                                    <div className="font-medium">{b.invoice_no || b.bill_no}</div>
                                    <div className="text-xs text-gray-500">{b.des} · {b.pcs} pcs</div>
                                </div>
                                <button onClick={() => handleAddBill(b)} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"><FaPlus /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Attached Bills Column */}
                <div className="border rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-gray-800 text-sm">Attached Bills ({attachedBills.length})</h3>
                        {attachedBills.length > pageSize && (
                            <div className="flex gap-1">
                                <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-2 py-0.5 border rounded text-xs hover:bg-gray-100 disabled:opacity-50">Prev</button>
                                <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-2 py-0.5 border rounded text-xs hover:bg-gray-100 disabled:opacity-50">Next</button>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {paginatedBills.map((b) => (
                            <div key={b.id} className="flex items-center justify-between p-2 bg-gray-50 border rounded text-sm">
                                <div>
                                    <span className="font-medium text-gray-900">{b.invoice_no || b.bill_no || "—"}</span>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span className="text-gray-600">{b.des || "No Dest"}</span>
                                </div>
                                <button onClick={() => handleRemoveBill(b.id)} className="text-rose-500 hover:text-rose-700 p-1"><FaTrash size={12} /></button>
                            </div>
                        ))}
                        {attachedBills.length === 0 && <div className="text-center text-gray-400 py-8 text-sm">No bills attached.</div>}
                    </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-100 font-medium transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium shadow-sm disabled:opacity-50 transition flex items-center gap-2"
          >
            <FaSave /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}