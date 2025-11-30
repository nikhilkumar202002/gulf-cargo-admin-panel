// src/pages/ViewCargo.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BsFillBoxSeamFill } from "react-icons/bs";
import { IoLocationSharp } from "react-icons/io5";
import { MdAddIcCall } from "react-icons/md";
import { getCargoById } from "../../api/createCargoApi";
import { getPartyByIdFlexible } from "../../api/partiesApi";
import "./ShipmentStyles.css";

/* ---------------- formatting helpers ---------------- */

// unwrap parties that might come back as { data: {...} } or { party: {...} }
const unwrapParty = (p) =>
  (p && typeof p === "object" && (p.data?.party || p.data || p.party || p.result || p)) || null;


const money = (v) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};
const weight3 = (v) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
};
const timeHHMM = (t) => {
  if (!t) return "—";
  const m = String(t).match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (!m) return String(t);
  const hh = String(Math.min(23, Number(m[1]))).padStart(2, "0");
  const mm = String(Math.min(59, Number(m[2]))).padStart(2, "0");
  return `${hh}:${mm}`;
};
const statusClass = (s) => {
  const v = String(s || "").toLowerCase();
  if (!v || v === "pending") return "bg-amber-100 text-amber-800";
  if (v.includes("enquiry")) return "bg-sky-100 text-sky-800";
  if (v.includes("received") || v.includes("deliver")) return "bg-emerald-100 text-emerald-800";
  if (v.includes("cancel")) return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-800";
};

/* ---------------- value pickers ---------------- */
const pickOne = (obj, keys, d = undefined) => {
  if (!obj || typeof obj !== "object") return d;
  for (const k of keys) {
    const v = k.split(".").reduce((acc, kk) => (acc && typeof acc === "object" ? acc[kk] : undefined), obj);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return d;
};

const formatPhones = (party = {}, cargo = {}, role = "") => {
  if (!party || typeof party !== "object") return "—";
  const norm = (v) => (v === undefined || v === null ? "" : String(v).trim());
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

  // party-level candidates
  const callCandidates = [
    party.contact_number,
    party.contact_no,
    party.phone_number,
    party.phone_no,
    party.phone,
    party.mobile_number,
    party.mobile_no,
    party.mobile,
    party.telephone,
    party.tel,
    party.contact,
  ].map(norm);

  const waCandidates = [
    party.whatsapp_number,
    party.whats_app,
    party.whatsapp,
    party.wa_number,
  ].map(norm);

  // cargo-level fallbacks (e.g., sender_phone, receiver_whatsapp)
  const r = (k) => norm(cargo?.[k]);
  if (role) {
    callCandidates.push(r(`${role}_phone`), r(`${role}_mobile`), r(`${role}_contact_number`));
    waCandidates.push(r(`${role}_whatsapp`), r(`${role}_whatsapp_number`));
  }

  const phones = uniq(callCandidates);
  const whats = uniq(waCandidates);

  const chunks = [];
  if (phones.length) chunks.push(`Call: ${phones.join(" / ")}`);
  if (whats.length) chunks.push(`WhatsApp: ${whats.join(" / ")}`);
  return chunks.join("  •  ") || "—";
};

const joinAddress = (p = {}) => {
  if (!p || typeof p !== "object") return "—";
  const parts = [
    p.address, p.address_line1, p.address_line2,
    p.street, p.locality, p.area, p.district, p.city, p.state,
    p.country, p.postal_code, p.pincode, p.zip,
  ].filter(Boolean);
  return parts.join(", ") || "—";
};

/* ---------------- clipboard button ---------------- */
const CopyBtn = ({ text }) => {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="ml-2 text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text || "");
          setOk(true);
          setTimeout(() => setOk(false), 900);
        } catch { }
      }}
    >
      {ok ? "Copied" : "Copy"}
    </button>
  );
};

/* ---------------- normalize helpers for boxes ---------------- */
function normalizeBoxes(cargo) {
  const raw = cargo?.boxes;

  // Object-shaped: { "1": { items: [...] }, "": { items: [...] } }
  if (raw && !Array.isArray(raw) && typeof raw === "object") {
    const out = [];
    for (const [k, v] of Object.entries(raw)) {
      const items = Array.isArray(v?.items) ? v.items : [];
      const pieces = items.reduce((sum, it) => sum + Number(it?.piece_no ?? it?.pieces ?? 0), 0);
      const weight =
        Number(v?.box_weight ?? v?.weight ?? 0) ||
        items.reduce((s, it) => s + Number(it?.weight ?? 0), 0);
      const bn = k && String(k).trim() !== "" ? k : 1;
      const patched = items.map((it) => ({
        ...it,
        box_number: it?.box_number ?? bn,
      }));
      out.push({ box_number: bn, weight, pieces, items: patched });
    }
    return out;
  }

  // Array-shaped: [{ box_number, items: [...] }, ...]
  if (Array.isArray(raw)) {
    return raw.map((b, i) => {
      const box_number = b?.box_number ?? b?.boxNo ?? b?.box ?? (i + 1);
      const items = Array.isArray(b?.items) ? b.items : [];
      const pieces = items.reduce((sum, it) => sum + Number(it?.piece_no ?? it?.pieces ?? 0), 0);
      const weight =
        Number(b?.box_weight ?? b?.weight ?? 0) ||
        items.reduce((s, it) => s + Number(it?.weight ?? 0), 0);
      const patched = items.map((it) => ({
        ...it,
        box_number: it?.box_number ?? box_number,
      }));
      return { box_number, weight, pieces, items: patched };
    });
  }

  // Fallback: flat items on cargo
  const flat = Array.isArray(cargo?.items) ? cargo.items : [];
  if (flat.length) {
    const byBox = new Map();
    flat.forEach((it) => {
      const bn = it?.box_number ?? it?.boxNo ?? it?.box ?? 1;
      if (!byBox.has(bn)) byBox.set(bn, []);
      byBox.get(bn).push(it);
    });
    return Array.from(byBox.entries()).map(([box_number, items]) => {
      const pieces = items.reduce((sum, it) => sum + Number(it?.piece_no ?? it?.pieces ?? 0), 0);
      return { box_number, weight: 0, pieces, items };
    });
  }

  return [];
}

function flattenItemsFromBoxes(boxes) {
  const arr = [];
  boxes.forEach((b) => {
    (b.items || []).forEach((it, i) =>
      arr.push({
        ...it,
        box_number: b.box_number,
        slno: it?.slno ?? i + 1,
      })
    );
  });
  return arr;
}

/* ---------------- main ---------------- */
export default function ViewCargo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [senderParty, setSenderParty] = useState(null);
  const [receiverParty, setReceiverParty] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await getCargoById(id);
        const c = res?.cargo ?? res?.data?.cargo ?? (res?.success && res?.cargo ? res.cargo : res);
        setCargo(c || {});
      } catch (e) {
        setErr(e?.message || "Failed to fetch cargo.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // fetch parties by id for full details (phones/address)
  useEffect(() => {
    if (!cargo) return;
    const sId = cargo?.sender_id ?? cargo?.senderId;
    const rId = cargo?.receiver_id ?? cargo?.receiverId ?? cargo?.consignee_id;
    (async () => {
      try {
        if (sId != null) {
          const s = await getPartyByIdFlexible(sId);
          if (s) setSenderParty(unwrapParty(s));
        }
        if (rId != null) {
          const r = await getPartyByIdFlexible(rId);
          if (r) setReceiverParty(unwrapParty(r));
        }
      } catch {
        // swallow; UI still shows names from cargo
      }
    })();
  }, [cargo]);

  /* ---------- derive fields ---------- */
  const senderP   = unwrapParty(senderParty)   ?? cargo?.sender ?? null;
const receiverP = unwrapParty(receiverParty) ?? cargo?.receiver ?? null;

const senderName =
  pickOne(senderP, ["name"]) ??
  pickOne(cargo, ["sender_name", "sender.name"], "—");

const receiverName =
  pickOne(receiverP, ["name"]) ??
  pickOne(cargo, ["receiver_name", "consignee_name", "receiver.name"], "—");

 // These are what address/phone helpers will use
const sender   = senderP   ?? { name: senderName };
const receiver = receiverP ?? { name: receiverName };

// In your sample these are plain strings; keep .name fallback for other shapes
const shippingText = pickOne(cargo, ["shipping_method.name", "shipping_method"], "—");
const paymentText  = pickOne(cargo, ["payment_method.name", "payment_method"], "—");
const deliveryText = pickOne(cargo, ["delivery_type.name", "delivery_type"], "—");
const statusText   = pickOne(cargo, ["status.name", "status"], "—");

  /* ---------- boxes & items ---------- */
  const boxList = useMemo(() => normalizeBoxes(cargo), [cargo]);
  const flatItems = useMemo(() => {
    if (Array.isArray(cargo?.items) && cargo.items.length) return cargo.items;
    return flattenItemsFromBoxes(boxList);
  }, [cargo, boxList]);

  const totals = useMemo(() => {
    const totalWeight =
      Number(pickOne(cargo, ["total_weight"])) ||
      boxList.reduce((s, b) => s + Number(b.weight || 0), 0);

    return {
      total_cost: money(cargo?.total_cost),
      bill_charges: money(cargo?.bill_charges),
      vat_percentage: Number(cargo?.vat_percentage ?? 0),
      vat_cost: money(cargo?.vat_cost),
      net_total: money(cargo?.net_total),
      total_weight: weight3(totalWeight),
    };
  }, [cargo, boxList]);

  const Stat = ({ label, value, after }) => (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium break-words">
        {value ?? "—"} {after}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-indigo-600 flex items-center gap-2">
            <BsFillBoxSeamFill className="text-2xl" />
            Cargo Details
          </h1>

          <div className="flex gap-2">
      
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Back
            </button>
          </div>
        </div>

        {/* Error/Loading */}
        {err && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {err}
          </div>
        )}
        {loading && (
          <div className="rounded-xl border bg-white p-6 animate-pulse text-gray-400">
            Loading cargo…
          </div>
        )}

        {!loading && !err && (
          <div className="space-y-6">
            {/* Booking + Status */}
            <div className="rounded-xl bg-white p-4 border">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm text-gray-500">Booking No.</div>
                  <div className="text-lg font-semibold">
                    {cargo?.booking_no || "—"}
                  </div>
                  {cargo?.booking_no && <CopyBtn text={cargo.booking_no} />}
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded-lg ${statusClass(statusText)}`}>
                    {statusText}
                  </span>
                  {cargo?.branch_name && (
                    <div className="text-sm text-gray-500">Branch: {cargo.branch_name}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sender */}
              <div className="rounded-xl bg-white p-4 border">
                <div className="text-base font-semibold mb-2">Sender</div>
                <div className="text-sm">{senderName}</div>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  {joinAddress(sender) !== "—" && (
                    <p className="flex items-center gap-1">
                      <IoLocationSharp className="text-red-500" />
                      {joinAddress(sender)}
                    </p>
                  )}
                  {formatPhones(sender, cargo, "sender") !== "—" && (
                    <p className="flex items-center gap-1">
                      <MdAddIcCall className="text-emerald-600" />
                      {formatPhones(sender, cargo, "sender")}
                    </p>
                  )}
                </div>
              </div>

              {/* Receiver */}
              <div className="rounded-xl bg-white p-4 border">
                <div className="text-base font-semibold mb-2">Receiver</div>
                <div className="text-sm">{receiverName}</div>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  {joinAddress(receiver) !== "—" && (
                    <p className="flex items-center gap-1">
                      <IoLocationSharp className="text-red-500" />
                      {joinAddress(receiver)}
                    </p>
                  )}
                  {formatPhones(receiver, cargo, "receiver") !== "—" && (
                    <p className="flex items-center gap-1">
                      <MdAddIcCall className="text-emerald-600" />
                      {formatPhones(receiver, cargo, "receiver")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Shipment + Financials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl bg-white p-4 border">
                <div className="text-base font-semibold mb-2">Shipment</div>
                <div className="grid grid-cols-2 gap-4 text-sm">

                  <Stat label="Date" value={cargo?.date || "—"} />
                  <Stat label="Time" value={timeHHMM(cargo?.time)} />
                  <Stat label="Shipping Method" value={shippingText} />
                  <Stat label="Payment Method" value={paymentText} />
                  <div className="col-span-2">
                    <div className="flex items-center">
                      <Stat label="LRL Tracking Code" value={cargo?.lrl_tracking_code || "—"} />
                      {cargo?.lrl_tracking_code && <CopyBtn text={cargo.lrl_tracking_code} />}
                    </div>
                  </div>
                  <Stat label="Collected By" value={cargo?.collected_by || "—"} />
                  <Stat label="Delivery Type" value={deliveryText} />
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 border">
                <div className="text-base font-semibold mb-2">Financials</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Stat label="Total Cost" value={totals.total_cost} after=" SAR" />
                  <Stat label="Bill Charges" value={totals.bill_charges} after=" SAR" />
                  <Stat label="VAT %" value={totals.vat_percentage} />
                  <Stat label="VAT Cost" value={totals.vat_cost} after=" SAR" />
                  <Stat label="Net Total" value={totals.net_total} after=" SAR" />
                  <Stat label="Total Weight" value={totals.total_weight} after=" kg" />
                </div>
              </div>
            </div>

            {/* Special Remarks */}
            <div className="rounded-xl bg-white p-4 border">
              <div className="text-base font-semibold mb-2">Special Remarks</div>
              <div className="text-sm text-gray-700">
                {cargo?.special_remarks || "—"}
              </div>
            </div>

            {/* Boxes */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 font-semibold flex items-center justify-between">
                <span>Boxes</span>
                <span className="text-sm text-gray-500">Total Boxes: {boxList.length || 0}</span>
              </div>

              {boxList.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">No boxes found.</div>
              ) : (
                <div className="divide-y">
                  {boxList
                    .sort((a, b) => Number(a.box_number) - Number(b.box_number))
                    .map((b, bi) => (
                      <div key={`box-${bi}`}>
                        <div className="px-4 py-3 bg-white flex flex-wrap items-center justify-between gap-3">
                          <div className="text-base font-semibold">Box #{b.box_number}</div>
                          <div className="flex items-center gap-4 text-sm text-gray-700">
                            <span>Pieces: <b className="tabular-nums">{b.pieces || 0}</b></span>
                            <span>Weight: <b className="tabular-nums">{weight3(b.weight)} kg</b></span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-[700px] w-full text-sm">
                            <thead className="bg-gray-100 border-y border-gray-200">
                              <tr className="text-left text-gray-600">
                                <th className="px-3 py-2 w-14 text-center">Slno</th>
                                <th className="px-3 py-2">Item</th>
                                <th className="px-3 py-2 w-28 text-right">Pieces</th>
                                <th className="px-3 py-2 w-28 text-right">Unit Price</th>
                                <th className="px-3 py-2 w-28 text-right">Total Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(b.items) && b.items.length ? (
                                b.items.map((it, i) => (
                                  <tr key={`${bi}-${i}`} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                                    <td className="px-3 py-2 text-center text-gray-500">
                                      {it?.slno || i + 1}
                                    </td>
                                    <td className="px-3 py-2">
                                      {it?.name || it?.item_name || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {Number(it?.piece_no ?? it?.pieces ?? 0)}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {money(it?.unit_price ?? it?.unitPrice)} SAR
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {money(
                                        it?.total_price ??
                                        (Number(it?.piece_no ?? it?.pieces ?? 0) * Number(it?.unit_price ?? 0))
                                      )} SAR
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                                    No items in this box.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* (Optional) Flat items table */}
            {flatItems.length > 0 && (
              <div className="rounded-xl border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 font-semibold">All Items (Flat)</div>
                <div className="overflow-x-auto">
                  <table className="min-w-[820px] w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr className="text-left text-gray-600">
                        <th className="px-3 py-2 w-14 text-center">Slno</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2 w-16 text-center">Box</th>
                        <th className="px-3 py-2 w-28 text-right">Pieces</th>
                        <th className="px-3 py-2 w-28 text-right">Unit Price</th>
                        <th className="px-3 py-2 w-28 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flatItems.map((it, i) => (
                        <tr key={`all-${i}`} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 text-center text-gray-500">{it?.slno || i + 1}</td>
                          <td className="px-3 py-2">{it?.name || it?.item_name || "—"}</td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {it?.box_number ?? it?.boxNo ?? it?.box ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {Number(it?.piece_no ?? it?.pieces ?? 0)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{money(it?.unit_price ?? it?.unitPrice)} SAR</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {money(
                              it?.total_price ??
                              (Number(it?.piece_no ?? it?.pieces ?? 0) * Number(it?.unit_price ?? 0))
                            )} SAR
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3">
         
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
