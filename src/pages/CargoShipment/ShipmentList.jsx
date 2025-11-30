// src/pages/ShipmentView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCargoShipment } from "../../api/shipmentCargo";

/* -------------------------- tiny UI/format helpers -------------------------- */
const cx = (...c) => c.filter(Boolean).join(" ");
const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const formatNum = (v, digits = 2) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : String(v ?? "—");
};

// lightweight skeletons
const Skel = ({ w = "100%", h = 14, rounded = 8, className = "" }) => (
  <span
    className={cx("inline-block bg-slate-200 animate-pulse", className)}
    style={{
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      borderRadius: rounded,
    }}
    aria-hidden="true"
  />
);
const SkelLine = (w) => <Skel w={w} h={12} />;
const SkelChip = () => <Skel w={90} h={22} rounded={999} />;

const Badge = ({ text, color = "indigo" }) => (
  <span
    className={{
      indigo:
        "inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700",
      green:
        "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700",
      amber:
        "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800",
      red:
        "inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700",
      slate:
        "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700",
    }[color] || "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"}
  >
    {text || "—"}
  </span>
);

const statusColor = (s = "") => {
  const v = s.toLowerCase();
  if (v.includes("receive") || v.includes("cleared") || v.includes("deliver")) return "green";
  if (v.includes("hold") || v.includes("wait") || v.includes("pending")) return "amber";
  if (v.includes("cancel") || v.includes("fail")) return "red";
  return "indigo";
};

const Box = ({ label, value, loading }) => (
 <div className="rounded-xl border border-slate-200 bg-white p-4">
  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
  <div className="mt-1 text-sm font-semibold text-slate-900 break-all">
    {loading ? <SkelLine w="70%" /> : (value ?? "—")}
  </div>
</div>

);

/* ---------------------------------- page ----------------------------------- */
export default function ShipmentView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null); // raw shipment
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await getCargoShipment(id);
        const record = res?.data ?? res;
        if (alive) setData(record || null);
      } catch (e) {
        if (alive) {
          setErr(e?.message || "Failed to load shipment");
          setData(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const cargos = Array.isArray(data?.cargos) ? data.cargos : [];
  const totals = useMemo(() => {
    let pieces = 0;
    let weight = 0;
    for (const c of cargos) {
      for (const it of c?.items || []) {
        const p = Number(it?.piece_no ?? it?.pieces ?? it?.qty ?? 0);
        const w = Number(it?.weight ?? it?.weight_kg ?? 0);
        if (Number.isFinite(p)) pieces += p;
        if (Number.isFinite(w)) weight += w;
      }
    }
    return { pieces, weight };
  }, [cargos]);

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">
            {loading ? <Skel w={200} h={24} /> : "Shipment Details"}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/shipments/${id}/deliverylist`)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Delivery List
            </button>
            <button
              onClick={() => navigate(`/shipments/${id}/packinglist`)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Packing List
            </button>
                 <button
              onClick={() => navigate(`/shipments/${id}/loadinglist`)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Loading List
            </button>
            <button
              onClick={() => navigate(`/shipments/${id}/manifest`)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Custom Manifest
            </button>
            <button
              onClick={() => window.history.back()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          </div>
        </div>

        {/* Status / top card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          {loading ? (
            <>
              {/* Top line skeletons */}
              <div className="flex flex-wrap items-center gap-3">
                <Skel w={150} h={28} className="shadow-sm" />
                <Skel w={180} h={16} />
                <div className="ml-auto">
                  <SkelChip />
                </div>
              </div>

              {/* Meta grid skeleton */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                    <Skel w={90} h={10} />
                    <div className="mt-2">
                      <Skel w="70%" h={14} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals skeleton */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                    <Skel w={110} h={10} />
                    <div className="mt-2">
                      <Skel w="40%" h={16} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : err ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{err}</div>
          ) : !data ? (
            <div className="text-slate-600">Shipment not found.</div>
          ) : (
            <>
              {/* Top line: Shipment no + AWB/container + Status */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 font-mono text-sm font-semibold text-white shadow-sm">
                  {data.shipment_number || "—"}
                </div>
                {data.awb_or_container_number && (
                  <div className="text-xs text-slate-600">
                    AWB/Container: <span className="font-medium">{data.awb_or_container_number}</span>
                  </div>
                )}
                <div className="ml-auto">
                  <Badge text={data.shipment_status || "—"} color={statusColor(data.shipment_status || "")} />
                </div>
              </div>

              {/* Meta grid */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Box label="Created On" value={formatDate(data.created_on)} />
                <Box label="Shipping Method" value={data.shipping_method || "—"} />
                <Box label="Route" value={`${data.origin_port ?? "—"} → ${data.destination_port ?? "—"}`} />
                <Box label="Branch" value={data.branch || "—"} />
                <Box label="Created By" value={data.created_by || "—"} />
                <Box label="License Details" value={data.license_details || "—"} />
                <Box label="Exchange Rate" value={formatNum(data.exchange_rate, 4)} />
                <Box label="Details / Remarks" value={data.shipment_details || "—"} />
              </div>

              {/* Totals */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Box label="Total Cargos" value={cargos.length} />
                <Box label="Total Pieces" value={totals.pieces} />
                <Box label="Total Weight (kg)" value={formatNum(totals.weight, 3)} />
              </div>
            </>
          )}
        </div>

        {/* Cargo list with nested items */}
        <div className="mt-6 space-y-6">
          {loading ? (
            // Skeleton cards for cargos
            Array.from({ length: 2 }).map((_, i) => (
              <div key={`skel-cargo-${i}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <SkelChip />
                    <Skel w={180} h={16} />
                  </div>
                  <Skel w={80} h={12} />
                </div>
                <div className="p-5">
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((__, r) => (
                      <Skel key={r} w="100%" h={14} />
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : cargos.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              No cargos found.
            </div>
          ) : (
            cargos.map((cargo, idx) => {
              const items = Array.isArray(cargo.items) ? cargo.items : [];
              return (
                <div key={cargo.id ?? idx} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Badge text={`#${idx + 1}`} color="slate" />
                      <h2 className="text-sm font-semibold text-slate-900">
                        Cargo: <span className="font-mono">{cargo.booking_no || cargo.id}</span>
                      </h2>
                    </div>
                    <div className="text-xs text-slate-500">
                      Items: <span className="font-medium text-slate-700">{items.length}</span>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="p-5 text-sm text-slate-600">No items in this cargo.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Sl No</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Item</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Pieces</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Unit Price</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Total Price</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Weight (kg)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {items.map((it, i) => (
                            <tr key={`${cargo.id}-${i}`} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm text-slate-700">{it.slno ?? i + 1}</td>
                              <td className="px-4 py-2 text-sm text-slate-800">{it.name ?? "—"}</td>
                              <td className="px-4 py-2 text-sm text-slate-700">{it.piece_no ?? it.pieces ?? it.qty ?? "—"}</td>
                              <td className="px-4 py-2 text-sm text-slate-700">{formatNum(it.unit_price, 2)}</td>
                              <td className="px-4 py-2 text-sm text-slate-700">{formatNum(it.total_price, 2)}</td>
                              <td className="px-4 py-2 text-sm text-slate-700">{formatNum(it.weight, 3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
