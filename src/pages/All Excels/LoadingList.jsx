// src/pages/LoadingList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCargoShipment } from "../../api/shipmentCargo"; // adjust path if needed
import { getCargoById } from "../../api/createCargoApi";   // adjust path if needed

/** ===== DEBUG (toggle to false to silence logs) ===== */
const DEBUG = true;
const log  = (...a) => DEBUG && console.log("[LoadingList]", ...a);
const info = (...a) => DEBUG && console.info("[LoadingList]", ...a);
const warn = (...a) => DEBUG && console.warn("[LoadingList]", ...a);
const errL = (...a) => DEBUG && console.error("[LoadingList]", ...a);

/** ===== helpers ===== */
const truthy = (v) => !(v == null || (typeof v === "string" && v.trim() === ""));
const fmt = (v) => (v === 0 || v ? String(v) : "—");

/** Unwrap cargo from several possible shapes */
const unwrapCargo = (raw) => {
  const d = raw?.data ?? raw;
  if (!d) return null;
  if (d.success && d.cargo) return d.cargo;
  if (d.cargo) return d.cargo;
  if (d.data && d.data.cargo) return d.data.cargo;
  if (d.data && typeof d.data === "object" && !Array.isArray(d.data)) return d.data;
  if (typeof d === "object" && !Array.isArray(d)) return d;
  return null;
};

/** Items / pieces / weight (supports items[] or grouped boxes) */
const extractItems = (c = {}) => {
  if (Array.isArray(c?.items)) return c.items;
  if (c?.boxes && typeof c.boxes === "object") {
    try {
      return Object.values(c.boxes).flatMap((b) =>
        Array.isArray(b?.items) ? b.items : []
      );
    } catch {
      return [];
    }
  }
  return [];
};
const sumPieces = (items = []) =>
  items.reduce((s, it) => s + Number(it?.piece_no ?? it?.pieces ?? it?.qty ?? 0), 0);
const sumWeight = (items = []) =>
  items.reduce((s, it) => s + Number(it?.weight ?? it?.weight_kg ?? 0), 0);

/** ================ Component ================ */
export default function LoadingList() {
  const { id } = useParams(); // shipment id
  const navigate = useNavigate();

  const [cargoIds, setCargoIds] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  /** 1) Shipment -> cargo IDs */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const res = await getCargoShipment(id);
        const d = res?.data ?? res;
        const ship =
          Array.isArray(d?.data) ? d.data[0] :
          (d?.data && !Array.isArray(d?.data) ? d.data : d);

        const ids = Array.isArray(ship?.cargos)
          ? ship.cargos.map((r) => Number(r?.id)).filter((n) => Number.isFinite(n))
          : [];

        info("Shipment fetched", { shipment_id: id, cargo_ids: ids });
        if (!alive) return;
        setCargoIds(ids);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load shipment");
        errL("Shipment fetch failed", e);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  /** 2) For each cargo id, fetch detail (batched to be gentle on the API) */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!cargoIds.length) { setCargos([]); return; }
      setLoading(true);
      try {
        const batches = [];
        const BATCH = 8;
        for (let i = 0; i < cargoIds.length; i += BATCH) {
          batches.push(cargoIds.slice(i, i + BATCH));
        }

        const collected = [];
        for (const group of batches) {
          /* eslint-disable no-await-in-loop */
          const groupResults = await Promise.all(
            group.map(async (cid) => {
              try {
                const res = await getCargoById(cid);
                const cargo = unwrapCargo(res);
                if (!cargo) { warn("Cargo detail empty", { cid }); return { id: cid }; }
                return cargo;
              } catch (e) {
                if (e?.response?.status === 404) { warn("Cargo not found (404)", { cid }); return null; }
                warn("getCargoById failed", cid, e?.message);
                return null;
              }
            })
          );
          collected.push(...groupResults.filter(Boolean));
          /* eslint-enable no-await-in-loop */
        }

        if (!alive) return;
        setCargos(collected);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cargoIds]);

  const rows = useMemo(() => (Array.isArray(cargos) ? cargos : []), [cargos]);

  /** ===== UI ===== */
  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Loading List</h1>
            <p className="mt-1 text-sm text-slate-600">
              Shipment ID: <span className="font-mono">{id}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              Rows: <span className="font-semibold">{rows.length}</span>
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[900px] w-full text-sm [&_td]:align-top [&_th]:align-top">
            <colgroup>
              <col className="w-[70px]" />
              <col className="w-[180px]" />
              <col className="w-[140px]" />
              <col className="w-[160px]" />
              <col className="w-[140px]" />
            </colgroup>

            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3">Sl No</th>
                <th className="px-4 py-3">Booking Number</th>
                <th className="px-4 py-3 text-right">Pieces</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Weight</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : err ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-rose-700">
                    {err}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-600">
                    No cargos found for this shipment.
                  </td>
                </tr>
              ) : (
                rows.map((c, idx) => {
                  const items = extractItems(c);
                  const pieces = sumPieces(items);

                  // Weight: prefer cargo.total_weight; else sum item weights; show without decimals
                  const weightRaw = Number(c?.total_weight);
                  const weight = Number.isFinite(weightRaw) ? weightRaw : sumWeight(items);
                  const weightDisplay = Number.isFinite(weight) ? String(Math.trunc(weight)) : "—";

                  // Date: try cargo.date; else created_on; else blank
                  const cargoDate =
                    c?.date || c?.created_on || c?.created_at || "";

                  return (
                    <tr
                      key={c.id ?? `${idx}-${c?.booking_no ?? ""}`}
                      className={idx % 2 ? "bg-white" : "bg-slate-50/30 hover:bg-slate-50"}
                    >
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono">{fmt(c?.booking_no ?? c?.id)}</td>
                      <td className="px-4 py-3 text-right">{fmt(pieces)}</td>
                      <td className="px-4 py-3">{fmt(cargoDate)}</td>
                      <td className="px-4 py-3 text-right">{fmt(weightDisplay)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-black"
          >
            Back
          </button>
        </div>
      </div>
    </section>
  );
}
