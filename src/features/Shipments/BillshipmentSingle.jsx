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
  if (s.includes("waiting") || s.includes("hold") || s.includes("not delivered")) return "border-rose-200 bg-rose-50 text-rose-700";
  if (s.includes("delivered") || s.includes("cleared")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s.includes("forwarded") || s.includes("arrived") || s.includes("out")) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
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

  if (loading) {
    return <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading shipment...</div>;
  }
  if (error) {
    return (
      <div className="mx-auto max-w-7xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm" role="alert">
        <p className="text-rose-700">{error}</p>
        <button type="button" onClick={() => navigate(-1)} className="mt-4 text-sm font-medium text-slate-700 underline hover:text-slate-900">Back to shipments</button>
      </div>
    );
  }

  const showingFrom = bills.length ? (page - 1) * pageSize + 1 : 0;
  const showingTo = bills.length ? Math.min(page * pageSize, bills.length) : 0;

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-5 text-slate-800 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          <FaArrowLeft aria-hidden="true" className="h-3 w-3" /> Back to shipments
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Physical shipment</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Shipment <span className="text-sky-700">#{shipment.shipment_number || shipment.id}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500">Shipment details and attached physical bills</p>
          </div>
          <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusStyle(shipment.status)}`}>
            {formatStatus(shipment.status)}
          </span>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">AWB / Container</span>
          <p className="mt-1 break-all text-base font-semibold text-slate-900">{shipment.awb_or_container_number || "—"}</p>
        </div>
      </header>

      <section aria-labelledby="shipment-details-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 id="shipment-details-title" className="text-lg font-semibold text-slate-900">Shipment details</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Detail label="Origin" value={shipment.origin_port?.name || shipment.origin_port} />
          <Detail label="Destination" value={shipment.destination_port?.name || shipment.destination_port} />
          <Detail label="Shipping method" value={shipment.shipping_method?.name || shipment.shipping_method} />
          <Detail label="Branch" value={shipment.branch?.name || shipment.branch?.branch_name || shipment.branch_name} />
        </dl>
      </section>

      <section aria-labelledby="physical-bills-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <h2 id="physical-bills-title" className="text-lg font-semibold text-slate-900">Physical bills</h2>
            <p className="mt-1 text-sm text-slate-500">Bills attached to this shipment</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">Total bills <strong className="ml-1 text-slate-900">{bills.length}</strong></span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">Total boxes <strong className="ml-1 text-slate-900">{totalBoxes}</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <Th>SL</Th>
                <Th>Invoice no</Th>
                <Th className="text-right">Pcs</Th>
                <Th className="text-right">Weight</Th>
                <Th>Destination</Th>
                <Th>Method</Th>
                <Th>Is shipment</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedBills.map((b, i) => (
                <tr key={b.id ?? i} className="transition-colors hover:bg-slate-50/70">
                  <Td className="text-slate-500">{(page - 1) * pageSize + i + 1}</Td>
                  <Td className="font-medium text-slate-900">{b.invoice_no || b.bill_no || "—"}</Td>
                  <Td className="text-right tabular-nums">{b.pcs ?? "—"}</Td>
                  <Td className="text-right tabular-nums">{b.weight ?? "—"}</Td>
                  <Td>{b.destination?.name || b.destination || b.des || "—"}</Td>
                  <Td>{b.shipment_method?.name || b.shipment_method || "—"}</Td>
                  <Td>{Number(b.is_shipment) === 1 ? "Yes" : "No"}</Td>
                  <Td>
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusStyle(b.status)}`}>
                      {formatStatus(b.status)}
                    </span>
                  </Td>
                </tr>
              ))}
              {pagedBills.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">No physical bills found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 sm:px-6">
          <span>Showing <strong className="font-medium text-slate-900">{showingFrom}–{showingTo}</strong> of <strong className="font-medium text-slate-900">{bills.length}</strong> bills</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
            <span className="min-w-20 text-center tabular-nums">Page {page} of {totalPages}</span>
            <button type="button" disabled={page === totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </div>
      </section>
    </main>
  );
}

const Detail = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm font-semibold text-slate-900">{value || "—"}</dd>
  </div>
);

const Th = ({ children, className = "" }) => <th scope="col" className={`whitespace-nowrap px-5 py-3 ${className}`}>{children}</th>;
const Td = ({ children, className = "" }) => <td className={`whitespace-nowrap px-5 py-3.5 text-slate-700 ${className}`}>{children}</td>;
