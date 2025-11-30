import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { getCustomShipmentById } from "../../api/billApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { IoMdArrowBack } from "react-icons/io";
import "./PhysicalBill.css";

const toneFromStatus = (txt) => {
  if (!txt) return "slate";
  if (/delivered|booked|completed|cleared|arrived|forwarded|out for delivery/i.test(txt)) return "emerald";
  if (/enquiry|pending|filed|transit|processing|waiting/i.test(txt)) return "amber";
  if (/cancel|error|failed|rejected|hold|not delivered/i.test(txt)) return "rose";
  return "slate";
};

export default function SingleBill() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [row, setRow] = useState(state?.row || null);
  const [loading, setLoading] = useState(!state?.row);
  const [error, setError] = useState("");

  // Shipment status master
  const [statusList, setStatusList] = useState([]);      // [{id,name,status}, ...]
  const [statusLoading, setStatusLoading] = useState(true);

  const str = (v) => (v == null ? "" : String(v));
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // Build id->name map from API list
  const statusMap = useMemo(() => {
    const m = new Map();
    for (const s of statusList || []) {
      if (s?.id != null && s?.name) m.set(String(s.id), String(s.name));
    }
    return m;
  }, [statusList]);

  const statusLabel = (r) => {
    // Prefer mapped label by numeric id
    const rawId = str(r?.status).trim(); // e.g. "3"
    if (rawId && statusMap.has(rawId)) return statusMap.get(rawId);

    // Fallback to any textual status fields present in the record
    const direct = str(r?.status_name || r?.current_status || r?.state).trim();
    if (direct) return direct;

    // Last resort: show the raw value
    return rawId || "—";
  };

  const fmtDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return str(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Fetch bill
  useEffect(() => {
    if (row) return;
    (async () => {
      if (!id) {
        setError("No bill identifier provided.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await getCustomShipmentById(id);
        const data =
          res?.data?.data && typeof res.data.data === "object"
            ? res.data.data
            : res?.data ?? res;
        if (!data) {
          setRow(null);
          toast.error("Bill not found.");
        } else {
          setRow(data);
        }
      } catch (e) {
        setError(
          e?.response?.data?.message || e?.message || "Failed to load the bill. Try again."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [id, row]);

  // Fetch active shipment statuses (id -> name)
  useEffect(() => {
    (async () => {
      try {
        setStatusLoading(true);
        const list = await getActiveShipmentStatuses(); // returns array; handles {data:{data:[]}} shapes
        setStatusList(Array.isArray(list) ? list : []);
      } catch (e) {
        // Silent fail; we still render raw status id
      } finally {
        setStatusLoading(false);
      }
    })();
  }, []);

  const view = useMemo(() => {
    if (!row) return null;
    const invoice_no = str(row.invoice_no) || "—";
    const pcs = (toNum(row.pcs) ?? str(row.pcs)) || "—";
    const weight = (toNum(row.weight) ?? str(row.weight)) || "—";
    const destination = str(row.des || row.destination) || "—";
    const method = str(row.shipment_method || row.method) || "—";
    const isShipment = str(row.is_shipment) === "1" ? "Yes" : "No";
    const status = statusLabel(row);
    const created = fmtDateTime(row.created_at);
    const updated = fmtDateTime(row.updated_at);
    return { invoice_no, pcs, weight, destination, method, isShipment, status, created, updated };
  }, [row, statusMap]); // depend on statusMap so label updates when master loads

  const tone = toneFromStatus(view?.status);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 font-[Inter,ui-sans-serif]">
      <Toaster position="top-right" />

      {/* Actions / Breadcrumb */}
      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-slate-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link to="/dashboard" className="hover:underline hover:text-slate-700">Dashboard</Link></li>
            <li>/</li>
            <li><Link to="/physical-bills" className="hover:underline hover:text-slate-700">Bills</Link></li>
            <li>/</li>
            <li className="text-slate-700 font-medium">{view?.invoice_no ?? "Bill"}</li>
          </ol>
        </nav>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              navigator.clipboard.writeText(view?.invoice_no || "")
                .then(() => toast.success("Bill number copied"))
                .catch(() => {})
            }
            className="single-bill-copy"
          >
            Copy Bill No
          </button>
    
          <button
            onClick={() => navigate(-1)}
            className="single-bill-back flex items-center justify-center gap-2"
          >
            <IoMdArrowBack/>Back
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="animate-pulse space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 w-full max-w-[560px] rounded bg-slate-200" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          {error}
        </div>
      ) : !row ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          No data found.
        </div>
      ) : (
        <>
          {/* Header Card */}
          <div className="card mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900">
                  Invoice / Bill No: {view.invoice_no}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Created: <span className="text-slate-700">{view.created}</span>
                  {" · "}
                  Updated: <span className="text-slate-700">{view.updated}</span>
                </p>
              </div>
              <span
                className={
                  "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium " +
                  (tone === "emerald"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : tone === "amber"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : tone === "rose"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-slate-50 text-slate-700")
                }
                title={statusLoading ? "Loading status…" : undefined}
              >
                {view.status}{statusLoading ? " (…)" : ""}
              </span>
            </div>
          </div>

          {/* Two-column Detail Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Shipment</h2>
              <table className="mt-4 w-full text-left text-sm">
                <tbody>
                  <tr className="border-t border-slate-100">
                    <th className="w-44 bg-slate-50 px-4 py-3 text-slate-600">Shipment Method</th>
                    <td className="px-4 py-3 text-slate-800">{view.method}</td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <th className="bg-slate-50 px-4 py-3 text-slate-600">Is Shipment</th>
                    <td className="px-4 py-3 text-slate-800">{view.isShipment}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Routing</h2>
              <table className="mt-4 w-full text-left text-sm">
                <tbody>
                  <tr className="border-t border-slate-100">
                    <th className="w-44 bg-slate-50 px-4 py-3 text-slate-600">Destination</th>
                    <td className="px-4 py-3 text-slate-800">{view.destination}</td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <th className="bg-slate-50 px-4 py-3 text-slate-600">Pieces (Pcs)</th>
                    <td className="px-4 py-3 text-slate-800">{view.pcs}</td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <th className="bg-slate-50 px-4 py-3 text-slate-600">Weight (kg)</th>
                    <td className="px-4 py-3 text-slate-800">{view.weight}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Compact summary table */}
          <div className="card mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Summary
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-6 py-3">Invoice / Bill No</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Shipment Method</th>
                    <th className="px-6 py-3">Destination</th>
                    <th className="px-6 py-3">Pcs</th>
                    <th className="px-6 py-3">Weight (kg)</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-6 py-3 font-medium text-slate-900">{view.invoice_no}</td>
                    <td className="px-6 py-3">{view.status}</td>
                    <td className="px-6 py-3">{view.method}</td>
                    <td className="px-6 py-3">{view.destination}</td>
                    <td className="px-6 py-3">{view.pcs}</td>
                    <td className="px-6 py-3">{view.weight}</td>
                    <td className="px-6 py-3">{view.created}</td>
                    <td className="px-6 py-3">{view.updated}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
