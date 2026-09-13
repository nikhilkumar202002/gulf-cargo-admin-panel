// src/features/Shipments/BillshipmentSingle.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getBillShipmentById, getBillShipments } from "../../services/billShipmentApi";
import { FaArrowLeft } from "react-icons/fa";

/* --- Status Helpers --- */
const statusMap = {
  1: "Shipment received",
  2: "Shipment booked",
  3: "Shipment forwarded",
  4: "Shipment arrived",
  5: "Waiting for clearance",
  6: "Shipment on hold",
  7: "Shipment cleared",
  8: "Delivery arranged",
  9: "Shipment out for delivery",
  10: "Not Delivered",
  11: "Pending",
  12: "More Tracking",
  13: "Enquiry collected",
  14: "Transfer",
  15: "DELIVERED",
  16: "REACHED WAREHOUSE",
  17: "IN TRANSIT",
  18: "ARIVAL FOR CLEARANCE", // Kept exact spelling from JSON
  19: "CUSTOMS CLEARED",
  20: "BOOKING IN PROGRESS",
  21: "DELIVERY IN TRANSIT",
  22: "ARRIVED AT PORT",
};
const formatStatus = (status) => {
  const value = status?.name ?? status?.id ?? status;
  return statusMap[value] || String(value ?? "—");
};
const getStatusStyle = (status) => {
  const s = formatStatus(status).toLowerCase();
  if (s.includes("waiting") || s.includes("hold") || s.includes("not delivered")) return "bg-red-100 text-red-800 border-red-300";
  if (s.includes("delivered") || s.includes("cleared")) return "bg-green-100 text-green-800 border-green-300";
  if (s.includes("forwarded") || s.includes("arrived") || s.includes("out")) return "bg-blue-100 text-blue-800 border-blue-300";
  return "bg-amber-100 text-amber-800 border-amber-300";
};

const hasBillDetails = (bill) =>
  Boolean(String(bill?.invoice_no ?? bill?.bill_no ?? "").trim()) &&
  bill?.pcs != null && bill?.weight != null;

const hasFullBills = (shipment) =>
  Array.isArray(shipment?.custom_shipments) &&
  shipment.custom_shipments.every(hasBillDetails);

const matchesAttachedIds = (detail, candidate) => {
  const attached = detail?.custom_shipments;
  if (!Array.isArray(attached)) return true;
  const candidateBills = candidate?.custom_shipments || [];
  if (attached.length !== candidateBills.length) return false;
  const candidateIds = new Set(candidateBills.map((bill) => String(bill.id)));
  return attached.every((bill) => candidateIds.has(String(bill.custom_shipment_id ?? bill.bill_id ?? bill.id)));
};

const findShipmentWithBills = async (shipmentId) => {
  const params = { per_page: 25 };
  const firstPage = await getBillShipments({ ...params, page: 1 });
  const findShipment = (rows) => rows.find((row) => String(row.id) === String(shipmentId));
  const firstMatch = findShipment(firstPage);
  if (firstMatch) return firstMatch;

  const lastPage = Math.max(1, Number(firstPage.pagination?.last_page) || 1);
  for (let page = 2; page <= lastPage; page += 4) {
    const pages = await Promise.all(
      Array.from({ length: Math.min(4, lastPage - page + 1) }, (_, index) =>
        getBillShipments({ ...params, page: page + index })
      )
    );
    const match = pages.map(findShipment).find(Boolean);
    if (match) return match;
  }
  return null;
};

export default function BillshipmentSingle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const passedShipment = location.state?.shipment;

  const [shipment, setShipment] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Pagination */
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const sRes = await getBillShipmentById(id);
        const sData = sRes?.data?.data || sRes?.data || sRes;
        if (!sData || typeof sData !== "object") throw new Error("Shipment not found");
        let complete = sData;
        if (!hasFullBills(sData)) {
          if (String(passedShipment?.id) === String(id) &&
              hasFullBills(passedShipment) && matchesAttachedIds(sData, passedShipment)) {
            complete = { ...sData, custom_shipments: passedShipment.custom_shipments };
          } else {
            const fromList = await findShipmentWithBills(id);
            if (!fromList || !hasFullBills(fromList)) {
              throw new Error("Failed to load the attached bill details.");
            }
            complete = fromList;
          }
        }
        if (!active) return;
        setShipment(complete);
        setBills(complete.custom_shipments);
        setPage(1);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load shipment");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [id, passedShipment]);

  const totalPages = Math.ceil(bills.length / pageSize) || 1;
  const pagedBills = useMemo(() => {
    const start = (page - 1) * pageSize;
    return bills.slice(start, start + pageSize);
  }, [page, bills]);

  // --- Calculate Total Boxes ---
  const totalBoxes = useMemo(() => {
    return bills.reduce((sum, b) => sum + (Number(b.pcs) || 0), 0);
  }, [bills]);

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="w-full mx-auto space-y-5">

      {/* --- TOP HIGHLIGHT PANEL --- */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-2xl shadow-xl p-8">

        <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white flex items-center gap-2 mb-5">
          <FaArrowLeft /> Back
        </button>

        {/* Shipment Number Highlight */}
        <div className="text-4xl font-bold mb-4 tracking-tight">
          Shipment&nbsp; 
          <span className="text-amber-400">
            #{shipment.shipment_number || shipment.id}
          </span>
        </div>

        {/* Container / AWB Number */}
        <div className="text-xl font-semibold flex gap-2 items-center">
          <span className="px-4 py-2 bg-white/10 rounded-lg border border-white/20">
            AWB / Container:{" "}
            <span className="text-amber-300 font-bold">
              {shipment.awb_or_container_number || "—"}
            </span>
          </span>

          {/* Status */}
          <span
            className={`px-4 py-2 rounded-full text-sm font-bold border ml-auto ${getStatusStyle(
              shipment.status
            )}`}
          >
            {formatStatus(shipment.status)}
          </span>
        </div>
      </div>

      {/* --- DETAILS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 shadow-lg rounded-2xl border">
        <Detail label="Origin" value={shipment.origin_port?.name || shipment.origin_port} />
        <Detail label="Destination" value={shipment.destination_port?.name || shipment.destination_port} />
        <Detail label="Shipping Method" value={shipment.shipping_method?.name || shipment.shipping_method} />
        <Detail label="Branch" value={shipment.branch?.branch_name || shipment.branch_name} />
      </div>

      {/* --- PHYSICAL BILLS TABLE --- */}
      <div className="bg-white border rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Physical Bills</h2>
          
          <div className="flex gap-2">
            <span className="px-4 py-1.5 bg-white border rounded-full text-gray-700 text-sm">
                Total Bills: <strong>{bills.length}</strong>
            </span>
            <span className="px-4 py-1.5 bg-white border rounded-full text-gray-700 text-sm">
                Total Boxes: <strong>{totalBoxes}</strong>
            </span>
          </div>
        </div>

        <table className="min-w-full table-auto text-sm">
          <thead className="bg-gray-100 text-gray-700 text-xs uppercase">
            <tr>
              <Th>SL</Th>
              <Th>Invoice No</Th>
              <Th>Pcs</Th>
              <Th>Weight</Th>
              <Th>Destination</Th>
              <Th>Method</Th>
              <Th>Is Shipment</Th>
              <Th>Status</Th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {pagedBills.map((b, i) => (
              <tr key={b.id ?? i} className="hover:bg-gray-50">
                <Td>{(page - 1) * pageSize + i + 1}</Td>
                <Td>{b.invoice_no || b.bill_no || "—"}</Td>
                <Td>{b.pcs || "—"}</Td>
                <Td>{b.weight || "—"}</Td>
                <Td>{b.destination?.name || b.destination || b.des || "—"}</Td>
                <Td>{b.shipment_method?.name || b.shipment_method}</Td>
                <Td>{Number(b.is_shipment) === 1 ? "Yes" : "No"}</Td>
                <Td>
                  <span
                    className={`px-3 py-1 text-xs rounded-full border ${getStatusStyle(
                      b.status
                    )}`}
                  >
                    {formatStatus(b.status)}
                  </span>
                </Td>
              </tr>
            ))}

            {pagedBills.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">
                  No physical bills found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn">
              Prev
            </button>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="btn">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- SMALL COMPONENTS --- */
const Detail = ({ label, value }) => (
  <div>
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-lg font-semibold text-gray-900">{value || "—"}</div>
  </div>
);

const Th = ({ children }) => <th className="px-4 py-3 text-left">{children}</th>;
const Td = ({ children }) => <td className="px-4 py-3">{children}</td>;
