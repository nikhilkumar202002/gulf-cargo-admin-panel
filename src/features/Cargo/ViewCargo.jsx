// src/pages/ViewCargo.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

/* Icons */
import { 
  FiArrowLeft, FiBox, FiCalendar, FiMapPin, FiTruck, 
  FiUser, FiPhone, FiCreditCard, FiFileText, FiActivity
} from "react-icons/fi";
import { TbWeight } from "react-icons/tb";
import { HiOutlineCurrencyDollar } from "react-icons/hi";
import { BsWhatsapp } from "react-icons/bs"; // Corrected Import

/* Services */
import { getCargoById } from "../../services/cargoService";
import { getPartyByIdFlexible } from "../../services/partyService";

/* Styles */
import "./ShipmentStyles.css";

/* ---------------- 1. HELPERS ---------------- */

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

const getStatusColor = (s) => {
  const v = String(s || "").toLowerCase();
  if (!v || v === "pending") return "bg-amber-100 text-amber-700 border-amber-200";
  if (v.includes("enquiry")) return "bg-sky-100 text-sky-700 border-sky-200";
  if (v.includes("received") || v.includes("deliver")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (v.includes("cancel")) return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const pickOne = (obj, keys, d = undefined) => {
  if (!obj || typeof obj !== "object") return d;
  for (const k of keys) {
    const v = k.split(".").reduce((acc, kk) => (acc && typeof acc === "object" ? acc[kk] : undefined), obj);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return d;
};

/* Address & Phone Formatters */
const joinAddress = (p = {}) => {
  if (!p || typeof p !== "object") return "—";
  const parts = [
    p.address, p.address_line1, p.address_line2,
    p.street, p.locality, p.area, p.district, p.city, p.state,
    p.country, p.postal_code, p.pincode, p.zip,
  ].filter(Boolean);
  return parts.join(", ") || "—";
};

/* ---------------- 2. COMPONENTS ---------------- */

const Avatar = ({ name, type = "sender" }) => {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const colorClass = type === "sender" 
    ? "bg-indigo-100 text-indigo-600" 
    : "bg-emerald-100 text-emerald-600";
    
  return (
    <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${colorClass}`}>
      {initial}
    </div>
  );
};

const CopyBadge = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  if(!text) return null;
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <button 
      onClick={handleCopy}
      className="group flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-lg transition-all text-xs text-slate-600 cursor-pointer"
    >
      <span className="font-semibold text-slate-700">{label}:</span>
      <span className="font-mono">{text}</span>
      <span className="text-[10px] uppercase font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
};

const InfoRow = ({ icon: Icon, label, value, subValue }) => (
  <div className="flex items-start gap-3 py-2">
    <div className="mt-0.5 text-slate-400">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold text-slate-800 mt-0.5">{value || "—"}</div>
      {subValue && <div className="text-xs text-slate-500">{subValue}</div>}
    </div>
  </div>
);

const StatCard = ({ label, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-lg ${colorClass}`}>
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase">{label}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

/* ---------------- 3. LOGIC HELPERS ---------------- */

function normalizeBoxes(cargo) {
  const raw = cargo?.boxes;
  if (raw && !Array.isArray(raw) && typeof raw === "object") {
    const out = [];
    for (const [k, v] of Object.entries(raw)) {
      const items = Array.isArray(v?.items) ? v.items : [];
      const pieces = items.reduce((sum, it) => sum + Number(it?.piece_no ?? it?.pieces ?? 0), 0);
      const weight = Number(v?.box_weight ?? v?.weight ?? 0) || items.reduce((s, it) => s + Number(it?.weight ?? 0), 0);
      const bn = k && String(k).trim() !== "" ? k : 1;
      const patched = items.map((it) => ({ ...it, box_number: it?.box_number ?? bn }));
      out.push({ box_number: bn, weight, pieces, items: patched });
    }
    return out;
  }
  if (Array.isArray(raw)) {
    return raw.map((b, i) => {
      const box_number = b?.box_number ?? b?.boxNo ?? b?.box ?? (i + 1);
      const items = Array.isArray(b?.items) ? b.items : [];
      const pieces = items.reduce((sum, it) => sum + Number(it?.piece_no ?? it?.pieces ?? 0), 0);
      const weight = Number(b?.box_weight ?? b?.weight ?? 0) || items.reduce((s, it) => s + Number(it?.weight ?? 0), 0);
      const patched = items.map((it) => ({ ...it, box_number: it?.box_number ?? box_number }));
      return { box_number, weight, pieces, items: patched };
    });
  }
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

/* ---------------- 4. MAIN PAGE ---------------- */

export default function ViewCargo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [senderParty, setSenderParty] = useState(null);
  const [receiverParty, setReceiverParty] = useState(null);

  // --- Fetch Cargo ---
  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
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

  // --- Fetch Parties ---
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
      } catch {}
    })();
  }, [cargo]);

  // --- Derived Data ---
  const senderP   = unwrapParty(senderParty)   ?? cargo?.sender ?? null;
  const receiverP = unwrapParty(receiverParty) ?? cargo?.receiver ?? null;
  
  const senderName = pickOne(senderP, ["name"]) ?? pickOne(cargo, ["sender_name", "sender.name"], "—");
  const receiverName = pickOne(receiverP, ["name"]) ?? pickOne(cargo, ["receiver_name", "consignee_name"], "—");
  
  const sender = senderP ?? { name: senderName };
  const receiver = receiverP ?? { name: receiverName };

  const boxList = useMemo(() => normalizeBoxes(cargo), [cargo]);
  
  const totals = useMemo(() => {
    const totalWeight = Number(pickOne(cargo, ["total_weight"])) || boxList.reduce((s, b) => s + Number(b.weight || 0), 0);
    return {
      total_cost: money(cargo?.total_cost),
      bill_charges: money(cargo?.bill_charges),
      vat_percentage: Number(cargo?.vat_percentage ?? 0),
      vat_cost: money(cargo?.vat_cost),
      net_total: money(cargo?.net_total),
      total_weight: weight3(totalWeight),
    };
  }, [cargo, boxList]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading details...</div>;
  if (err) return <div className="min-h-screen flex items-center justify-center text-rose-600">{err}</div>;

  return (
    <div className="min-h-screen">
      
      {/* --- Top Bar --- */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                 <FiArrowLeft className="h-5 w-5" />
               </button>
               <div>
                 <div className="flex items-center gap-3">
                   <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">{cargo?.booking_no}</h1>
                   <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${getStatusColor(cargo?.status?.name || cargo?.status)}`}>
                      {cargo?.status?.name || cargo?.status || "Unknown"}
                   </span>
                 </div>
                 <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    Created on <span className="font-medium text-slate-700">{cargo?.date || "—"}</span> 
                    at <span className="font-medium text-slate-700">{timeHHMM(cargo?.time)}</span>
                 </p>
               </div>
            </div>

            <div className="flex items-center gap-2">
               {/* Actions could go here */}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* --- Key Metrics --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard label="Total Weight" value={`${totals.total_weight} kg`} icon={TbWeight} colorClass="bg-blue-50 text-blue-600" />
           <StatCard label="Total Boxes" value={boxList.length} icon={FiBox} colorClass="bg-amber-50 text-amber-600" />
           <StatCard label="Net Total" value={`${totals.net_total} SAR`} icon={HiOutlineCurrencyDollar} colorClass="bg-emerald-50 text-emerald-600" />
           <StatCard label="Branch" value={cargo?.branch_name || "—"} icon={FiMapPin} colorClass="bg-purple-50 text-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN (2/3) --- */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Route Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <FiTruck className="text-indigo-500" /> Shipment Route
                  </h3>
               </div>
               
               <div className="p-6 relative">
                 {/* Visual Connector Line */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block w-px h-24 bg-slate-200 rotate-90" />
                 
                 <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-16">
                    {/* Sender */}
                    <div className="flex-1 flex gap-4">
                       <Avatar name={senderName} type="sender" />
                       <div>
                          <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">From (Sender)</p>
                          <p className="text-lg font-bold text-slate-900">{senderName}</p>
                          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{joinAddress(sender)}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                             {sender.contact_number && (
                               <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-600">
                                 <FiPhone className="h-3 w-3" /> {sender.contact_number}
                               </span>
                             )}
                          </div>
                       </div>
                    </div>

                    {/* Receiver */}
                    <div className="flex-1 flex gap-4 text-left md:text-right flex-row md:flex-row-reverse">
                       <Avatar name={receiverName} type="receiver" />
                       <div>
                          <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">To (Receiver)</p>
                          <p className="text-lg font-bold text-slate-900">{receiverName}</p>
                          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{joinAddress(receiver)}</p>
                          <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                             {receiver.contact_number && (
                               <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-600">
                                 <FiPhone className="h-3 w-3" /> {receiver.contact_number}
                               </span>
                             )}
                             {receiver.whatsapp_number && (
                               <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-xs font-medium text-emerald-700">
                                 <BsWhatsapp className="h-3 w-3" /> {receiver.whatsapp_number}
                               </span>
                             )}
                          </div>
                       </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* Boxes & Items */}
            <div className="space-y-4">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <FiBox className="text-amber-500" /> Boxes & Content
               </h3>
               
               {boxList.length === 0 ? (
                 <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-500 italic">
                   No boxes recorded for this shipment.
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-4">
                    {boxList
                      .sort((a, b) => Number(a.box_number) - Number(b.box_number))
                      .map((b, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                           <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="h-8 w-8 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-sm">
                                  {b.box_number}
                                </span>
                                <span className="font-semibold text-slate-700">Box #{b.box_number}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
                                 <span className="flex items-center gap-1.5"><FiBox className="text-slate-400"/> {b.pieces || 0} Pcs</span>
                                 <span className="flex items-center gap-1.5"><TbWeight className="text-slate-400"/> {weight3(b.weight)} kg</span>
                              </div>
                           </div>
                           
                           <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-white text-slate-500 text-xs uppercase font-semibold border-b border-slate-100">
                                  <tr>
                                    <th className="px-4 py-3 pl-6 w-16">#</th>
                                    <th className="px-4 py-3">Item Name</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3 text-right">Unit Price</th>
                                    <th className="px-4 py-3 text-right pr-6">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {b.items.map((it, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                      <td className="px-4 py-3 pl-6 text-slate-400">{i + 1}</td>
                                      <td className="px-4 py-3 font-medium text-slate-800">{it?.name || it?.item_name || "—"}</td>
                                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{it?.piece_no ?? it?.pieces ?? 0}</td>
                                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{money(it?.unit_price ?? it?.unitPrice)}</td>
                                      <td className="px-4 py-3 text-right tabular-nums pr-6 font-medium text-slate-800">
                                        {money(it?.total_price ?? (Number(it?.piece_no ?? 0) * Number(it?.unit_price ?? 0)))}
                                      </td>
                                    </tr>
                                  ))}
                                  {!b.items.length && (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-400 italic">No items listed in this box</td></tr>
                                  )}
                                </tbody>
                              </table>
                           </div>
                        </div>
                    ))}
                 </div>
               )}
            </div>

          </div>

          {/* --- RIGHT COLUMN (1/3) --- */}
          <div className="space-y-6">
             
             {/* Financial Summary */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <HiOutlineCurrencyDollar className="h-5 w-5 text-emerald-500" /> Payment Summary
                </h3>
                
                <div className="space-y-3">
                   <div className="flex justify-between text-sm text-slate-600">
                      <span>Total Cost</span>
                      <span className="font-medium">{totals.total_cost}</span>
                   </div>
                   <div className="flex justify-between text-sm text-slate-600">
                      <span>Bill Charges</span>
                      <span className="font-medium">{totals.bill_charges}</span>
                   </div>
                   <div className="flex justify-between text-sm text-slate-600">
                      <span>VAT ({totals.vat_percentage}%)</span>
                      <span className="font-medium">{totals.vat_cost}</span>
                   </div>
                   
                   <div className="border-t border-slate-100 my-2 pt-2 flex justify-between items-center">
                      <span className="font-bold text-slate-800">Net Total</span>
                      <span className="font-bold text-xl text-emerald-600">{totals.net_total} <span className="text-sm font-medium text-emerald-400">SAR</span></span>
                   </div>
                </div>
             </div>

             {/* Shipment Details */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <FiFileText className="h-5 w-5 text-indigo-500" /> Shipment Details
                </h3>
                
                <div className="divide-y divide-slate-50">
                   <InfoRow icon={FiTruck} label="Shipping Method" value={pickOne(cargo, ["shipping_method.name", "shipping_method"])} />
                   <InfoRow icon={FiCreditCard} label="Payment Method" value={pickOne(cargo, ["payment_method.name", "payment_method"])} />
                   <InfoRow icon={FiMapPin} label="Delivery Type" value={pickOne(cargo, ["delivery_type.name", "delivery_type"])} />
                   <InfoRow icon={FiUser} label="Collected By" value={cargo?.collected_by} />
                   
                   <div className="py-3">
                     <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Tracking Codes</div>
                     <div className="flex flex-col gap-2">
                        <CopyBadge label="LRL" text={cargo?.lrl_tracking_code} />
                        <CopyBadge label="Ref" text={cargo?.tracking_no} />
                     </div>
                   </div>
                </div>
             </div>

             {/* Remarks */}
             {cargo?.special_remarks && (
               <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                  <h4 className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2">
                    <FiActivity /> Special Remarks
                  </h4>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    {cargo.special_remarks}
                  </p>
               </div>
             )}

          </div>

        </div>
      </div>
    </div>
  );
}