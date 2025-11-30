import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBillShipmentById } from "../../api/billShipmentApi";
import { getPhysicalBills } from "../../api/billApi";
import { FaArrowLeft } from "react-icons/fa";

/* --- Status Mapping Helper --- */
const formatStatus = (status) => {
  const map = {
    1: "Pending",
    2: "Packed",
    3: "Dispatched",
    4: "In Transit",
    5: "Arrived",
    6: "Customs Hold",
    7: "Released",
    8: "Out for Delivery",
    9: "Delivered",
    10: "Returned",
    11: "Cancelled",
    16: "Delivered",
  };
  if (!status) return "—";
  const key = Number(status);
  return map[key] || status;
};

/* --- Status Color Helper --- */
const getStatusStyle = (status) => {
  const v = String(formatStatus(status)).toLowerCase();
  if (v.includes("deliver")) return "bg-emerald-100 text-emerald-800";
  if (v.includes("pending") || v.includes("packed")) return "bg-amber-100 text-amber-800";
  if (v.includes("cancel") || v.includes("return")) return "bg-rose-100 text-rose-800";
  if (v.includes("transit") || v.includes("dispatched")) return "bg-blue-100 text-blue-800";
  if (v.includes("customs") || v.includes("hold")) return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-700";
};

export default function BillshipmentSingle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchShipmentAndBills = async () => {
      setLoading(true);
      setError("");

      try {
        // 1️⃣ Fetch shipment details
        const shipmentRes = await getBillShipmentById(id);
        const shipmentData = shipmentRes?.data?.data || shipmentRes?.data || shipmentRes;
        setShipment(shipmentData);

        // 2️⃣ Extract custom shipment IDs
        const ids = (shipmentData?.custom_shipments || []).map((c) => c.id);
        if (ids.length === 0) {
          setBills([]);
          setLoading(false);
          return;
        }

        // 3️⃣ Fetch physical bills for those IDs
        const allBills = await getPhysicalBills({ ids: ids.join(",") });
        setBills(allBills || []);
      } catch (e) {
        console.error("[UI] Failed to load shipment or bills", e);
        setError("Failed to load shipment or bills.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchShipmentAndBills();
  }, [id]);

  const totalPages = Math.max(1, Math.ceil(bills.length / pageSize));
  const pagedBills = useMemo(() => {
    const start = (page - 1) * pageSize;
    return bills.slice(start, start + pageSize);
  }, [bills, page]);

  if (loading)
    return <div className="p-8 text-gray-600 text-center">Loading shipment and bills...</div>;

  if (error)
    return <div className="p-8 text-red-600 text-center">{error}</div>;

  if (!shipment)
    return <div className="p-8 text-gray-500 text-center">Shipment not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-5 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors"
        >
          <FaArrowLeft /> Back
        </button>
        <h1 className="text-2xl font-semibold text-gray-800">
          Shipment #{shipment.id}
        </h1>
      </div>

      {/* --- Shipment Details --- */}
      <div className="rounded-xl border bg-white shadow-sm p-5 space-y-2 text-sm">
        <div><b>Shipment No:</b> {shipment.shipment_number || "—"}</div>
        <div><b>AWB / Container:</b> {shipment.awb_or_container_number || "—"}</div>
        <div><b>Origin:</b> {shipment.origin_port || "—"}</div>
        <div><b>Destination:</b> {shipment.destination_port || "—"}</div>
        <div><b>Shipping Method:</b> {shipment.shipping_method || "—"}</div>
        <div><b>Branch:</b> {shipment.branch_name || "—"}</div>
        <div><b>Status:</b> {shipment.status || "—"}</div>
      </div>

      {/* --- Physical Bills Table --- */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700">Physical Bills</h2>
          <div className="text-sm text-gray-600">Total: {bills.length}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 border text-left">SL No</th>
                <th className="p-3 border text-left">Invoice No</th>
                <th className="p-3 border text-left">Pcs</th>
                <th className="p-3 border text-left">Weight (kg)</th>
                <th className="p-3 border text-left">Destination</th>
                <th className="p-3 border text-left">Shipment Method</th>
                <th className="p-3 border text-left">Is Shipment</th>
                <th className="p-3 border text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedBills.map((bill, index) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="p-3 border">{(page - 1) * pageSize + index + 1}</td>
                  <td className="p-3 border">{bill.invoice_no || "—"}</td>
                  <td className="p-3 border">{bill.pcs || "—"}</td>
                  <td className="p-3 border">{bill.weight || "—"}</td>
                  <td className="p-3 border">{bill.des || "—"}</td>
                  <td className="p-3 border">{bill.shipment_method || "—"}</td>
                  <td className="p-3 border">{bill.is_shipment === "1" ? "Yes" : "No"}</td>
                  <td className="p-3 border">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusStyle(
                        bill.status
                      )}`}
                    >
                      {formatStatus(bill.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {pagedBills.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-500">
                    No physical bills found for this shipment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {bills.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm">
            <div>
              Page {page} of {totalPages} · Rows: {bills.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <button
                className="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
