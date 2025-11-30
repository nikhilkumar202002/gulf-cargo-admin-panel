import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { PiShippingContainerFill } from "react-icons/pi";

import { getShipmentMethods } from "../../api/shipmentMethodApi";
import { getPorts } from "../../api/portApi";
import { getActiveBranches } from "../../api/branchApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { getProfile } from "../../api/accountApi";
import { listCargos } from "../../api/createCargoApi";
import {
  createCargoShipment,
  markCargoInShipment,
  markCargoNotInShipment,
} from "../../api/shipmentCargo";

import "./ShipmentStyles.css";

/* ---------------- helpers ---------------- */
const unwrapArray = (o) =>
  Array.isArray(o) ? o :
    Array.isArray(o?.data?.data) ? o.data.data :
      Array.isArray(o?.data) ? o.data :
        Array.isArray(o?.items) ? o.items :
          Array.isArray(o?.results) ? o.results : [];

const today = () => new Date().toISOString().slice(0, 10);
const onlyFree = (rows = []) => rows.filter((r) => Number(r?.is_in_cargo_shipment) === 0);


const statusPill = (s) => {
  const v = String(s || "").toLowerCase();
  if (!v || v === "pending") return "bg-amber-100 text-amber-800";
  if (v.includes("received") || v.includes("delivered")) return "bg-emerald-100 text-emerald-800";
  if (v.includes("cancel")) return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-800";
};

function RightToast({ open, variant = "success", children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed top-4 right-4 z-[60]">
      <div
        className={`rounded-xl px-4 py-3 shadow-lg text-sm border ${variant === "error"
            ? "bg-rose-50 border-rose-200 text-rose-800"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
      >
        <div className="flex items-start gap-3">
          <div>{children}</div>
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700 ml-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- robust branch extraction ---------- */
const normStr = (v) => (v == null ? "" : String(v).trim());

function extractBranchInfo(profile, branches = []) {
  const bList = Array.isArray(branches) ? branches : [];

  let id =
    profile?.branch_id ??
    profile?.branchId ??
    profile?.branch?.id ??
    profile?.user?.branch_id ??
    profile?.data?.user?.branch_id ??
    null;

  let name =
    profile?.branch?.name ??
    profile?.branch_name ??
    profile?.user?.branch_name ??
    null;

  if (!name) {
    const raw = profile?.branch;
    if (typeof raw === "string") name = raw;
  }
  if (!name) {
    const raw = profile?.user?.branch;
    if (typeof raw === "string") name = raw;
  }

  id = id != null ? Number(id) : null;
  name = normStr(name);

  if (id == null && name) {
    const byName =
      bList.find((b) => normStr(b.branch_name) === name || normStr(b.name) === name) ||
      bList.find((b) => normStr(b.branch_name || b.name).toLowerCase() === name.toLowerCase());
    if (byName) id = Number(byName.id);
  }

  if (name === "" && id != null) {
    const byId = bList.find((b) => Number(b.id) === Number(id));
    if (byId) name = normStr(byId.branch_name || byId.name || `#${id}`);
  }

  return { id: id != null ? Number(id) : null, name };
}

/* ============================================================================================
 * Create Shipment — picker flow with Save (mark-in) & Remove (mark-not)
 * ========================================================================================== */
export default function CreateShipment() {
  // dropdown data
  const [shipmentMethods, setShipmentMethods] = useState([]);
  const [ports, setPorts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [shipmentStatuses, setShipmentStatuses] = useState([]);

  // ---- Redux fallbacks (hooks must be unconditional) ----
  const selBranchId = useSelector((s) => s.branch?.branchId);
  const selAuthUserBranchId = useSelector((s) => s.auth?.user?.branch_id);
  const selAuthProfileBranchId = useSelector((s) => s.auth?.profile?.branch_id);
  const branchFromRedux =
    selBranchId ?? selAuthUserBranchId ?? selAuthProfileBranchId ?? null;

  const selBranchName = useSelector((s) => s.branch?.branchName);
  const selAuthUserBranchName = useSelector((s) => s.auth?.user?.branch_name);
  const selAuthProfileBranchName = useSelector((s) => s.auth?.profile?.branch_name);
  const branchNameFromRedux =
    selBranchName ?? selAuthUserBranchName ?? selAuthProfileBranchName ?? "";

  // profile / branch / user
  const [myBranchId, setMyBranchId] = useState(branchFromRedux ?? null);
  const [myBranchName, setMyBranchName] = useState(branchNameFromRedux ?? "");
  const [myUserId, setMyUserId] = useState(null);
  const [myUserName, setMyUserName] = useState("");
  const [profileObj, setProfileObj] = useState(null);

  // form data
  const [formData, setFormData] = useState({
    shipmentNumber: "",
    awbNo: "",
    licenseDetails: "",
    exchangeRate: "",
    shipmentDetails: "",
    portOfOrigin: "",
    portOfDestination: "",
    shippingMethod: "",
    createdOn: today(),
    clearingAgent: "",
    shipmentStatus: "",
  });

  // toast + server errors
  const [toast, setToast] = useState({ open: false, variant: "success", text: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  // ===== Saved cargos list (added to form before final submit) =====
  const [addedRows, setAddedRows] = useState([]); // array of cargo objects

  // picker state
  const [showPicker, setShowPicker] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [results, setResults] = useState([]);            // rows rendered in picker table
  const [loadingList, setLoadingList] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [dupeNote, setDupeNote] = useState("");
  const [oppositeBucket, setOppositeBucket] = useState([]); // list for the red note

  // selection inside picker (temporary)
  const [pickSelectedIds, setPickSelectedIds] = useState([]); // number[]
  const [pickSelectedMap, setPickSelectedMap] = useState({}); // id -> row

  // Tracks whether current picker is showing USED (search mode)
  const [searchShowsUsed, setSearchShowsUsed] = useState(false);

  // Track cargos committed/saved this session so they don't reappear if backend flag lags
  const sessionHiddenIdsRef = useRef(new Set());

  /* ---------- bootstrap: fetch dropdowns + profile ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [methods, portList, branchList, statuses, me] = await Promise.all([
          getShipmentMethods(),
          getPorts(),
          getActiveBranches(),
          getActiveShipmentStatuses(),
          getProfile(),
        ]);
        setShipmentMethods(unwrapArray(methods));
        setPorts(unwrapArray(portList));
        setBranches(unwrapArray(branchList));
        setShipmentStatuses(unwrapArray(statuses));
        setProfileObj(me?.data ?? me ?? null);
      } catch (e) {
       
        setToast({ open: true, variant: "error", text: e?.message || "Failed to load dropdown data." });
      }
    })();
  }, []);

  // Resolve branch & user after profile + branches ready
  useEffect(() => {
    if (!profileObj || !Array.isArray(branches) || branches.length === 0) return;

    // 1) Redux first
    let id = branchFromRedux != null ? Number(branchFromRedux) : null;
    let name = branchNameFromRedux;

    // 2) Profile if Redux empty
    if (id == null || !name) {
      const { id: bid, name: bname } = extractBranchInfo(profileObj, branches);
      if (id == null) id = bid ?? null;
      if (!name) name = bname ?? "";
    }

    // 3) Fallback to first active branch if still missing
    if (id == null && branches.length > 0) {
      id = Number(branches[0]?.id);
      name = String(branches[0]?.branch_name || branches[0]?.name || `#${id}`);
    }

    if (id != null) setMyBranchId(id);
    if (name) setMyBranchName(name);

    // Resolve user
    const uid = profileObj?.id ?? profileObj?.user?.id ?? profileObj?.data?.user?.id ?? null;
    const uname =
      profileObj?.name ?? profileObj?.user?.name ?? profileObj?.user?.full_name ?? profileObj?.email ?? "";
    if (uid != null) setMyUserId(Number(uid));
    if (uname) setMyUserName(String(uname));
  }, [profileObj, branches, branchFromRedux, branchNameFromRedux]);

  /* ---------- form change ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setFieldErrors((fe) => ({ ...fe, [name]: undefined }));
  };

  /* ---------- open/close picker ---------- */
  const openPicker = async () => {
    setShowPicker(true);
    setBookingSearch("");
    setPickSelectedIds([]);
    setPickSelectedMap({});
    await fetchPickerRows(); // initial load = free list
  };
  const closePicker = () => {
    setShowPicker(false);
    setResults([]);
    setOppositeBucket([]);
    setDupeNote("");
    setPickSelectedIds([]);
    setPickSelectedMap({});
    setSearchShowsUsed(false);
  };

  /* ---------- helpers: filter out session-hidden & already-added ---------- */
  const notSessionHidden = (rows = []) => {
    const hidden = sessionHiddenIdsRef.current;
    return rows.filter((r) => !hidden.has(Number(r.id)));
  };
  const notAlreadyAdded = (rows = []) => {
    const addedSet = new Set(addedRows.map((r) => Number(r.id)));
    return rows.filter((r) => !addedSet.has(Number(r.id)));
  };

  // REPLACE your fetchPickerRows with this
  const fetchPickerRows = async (queryText = "") => {
    setLoadingList(true);
    setDupeNote("");
    setOppositeBucket([]);
    try {
      const hasQuery = !!(queryText && String(queryText).trim());
      const qlc = String(queryText || "").trim().toLowerCase();
      let tableRows = [];
      let usedRows = [];

      if (!hasQuery) {
        // Initial picker / reset: show FREE (0)
        setSearchShowsUsed(false);
        const resp = await listCargos({ is_in_cargo_shipment: 0 }); // FREE is 0
        tableRows = onlyFree(unwrapArray(resp));
        // hide already saved/hidden this session
        const hidden = sessionHiddenIdsRef.current;
        const addedSet = new Set(addedRows.map((r) => Number(r.id)));
        const before = tableRows.length;
        const pickSet = new Set(pickSelectedIds);
        tableRows = tableRows.filter(
          (r) =>
            !hidden.has(Number(r.id)) &&
            !addedSet.has(Number(r.id)) &&
            !pickSet.has(Number(r.id))
        );
        const hiddenCount = before - tableRows.length;
        if (hiddenCount > 0) {
          setDupeNote(`${hiddenCount} result(s) hidden (already saved/selected in this session).`);
        }
      } else {
        // SEARCH: show FREE (0) in table, USED (1) in the note
        setSearchShowsUsed(false);
        const [freeResp, usedResp] = await Promise.all([
          listCargos({ is_in_cargo_shipment: 0, search: queryText }), // FREE is 0
          listCargos({ is_in_cargo_shipment: 1, search: queryText }), // USED is 1
        ]);


        // Free rows for the TABLE
        tableRows = onlyFree(unwrapArray(freeResp)).filter((r) =>
          String(r?.booking_no || "").toLowerCase().includes(qlc)
        );
        // Used rows for the NOTE
        usedRows = unwrapArray(usedResp).filter((r) =>
          String(r?.booking_no || "").toLowerCase().includes(qlc)
        );

        // Fallbacks if backend ignored 'search'
        if (tableRows.length === 0 && unwrapArray(freeResp).length === 0) {
          const allFree = onlyFree(unwrapArray(await listCargos({ is_in_cargo_shipment: 0 }))); // 0 here
          tableRows = allFree.filter((r) => String(r?.booking_no || "").toLowerCase().includes(qlc));
        }
        if (usedRows.length === 0 && unwrapArray(usedResp).length === 0) {
          const allUsed = unwrapArray(await listCargos({ is_in_cargo_shipment: 1 })); // 1 here
          usedRows = allUsed.filter((r) => String(r?.booking_no || "").toLowerCase().includes(qlc));
        }

        // Table rows = FREE matches minus session-hidden / already-added
        const hidden = sessionHiddenIdsRef.current;
        const addedSet = new Set(addedRows.map((r) => Number(r.id)));
        tableRows = tableRows.filter(
          (r) => !hidden.has(Number(r.id)) && !addedSet.has(Number(r.id))
        );
        setDupeNote(""); // no hidden note in search mode
      }

      setResults(tableRows);
      setOppositeBucket(usedRows);
    } catch (e) {
      
      setResults([]);
      setOppositeBucket([]);
      setToast({ open: true, variant: "error", text: e?.message || "Failed to fetch cargos." });
    } finally {
      setLoadingList(false);
    }
  };


  /* ---------- selection controls inside picker ---------- */
  const pickAllChecked =
    results.length > 0 && results.every((row) => pickSelectedIds.includes(Number(row.id)));

  const toggleAllPicker = () => {
    if (pickAllChecked) {
      const visibleIds = new Set(results.map((r) => Number(r.id)));
      setPickSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
      setPickSelectedMap((m) => {
        const copy = { ...m };
        for (const id of visibleIds) delete copy[id];
        return copy;
      });
    } else {
      const addIds = results
        .filter((r) => Number(r?.is_in_cargo_shipment) !== 1) // now 1 is used
        .map((r) => Number(r.id));
      setPickSelectedIds((prev) => Array.from(new Set([...prev, ...addIds])));
      setPickSelectedMap((m) => {
        const copy = { ...m };
        results.forEach((r) => {
          if (Number(r?.is_in_cargo_shipment) !== 1) copy[Number(r.id)] = r;
        });
        return copy;
      });
    }
  };

  const toggleOnePicker = (row) => {
    const id = Number(row.id);
    // block selecting used rows
    if (Number(row?.is_in_cargo_shipment) === 1) return; // now 1 is used

    setPickSelectedIds((prev) => {
      if (prev.includes(id)) {
        setPickSelectedMap((m) => {
          const copy = { ...m };
          delete copy[id];
          return copy;
        });
        return prev.filter((x) => x !== id);
      } else {
        setPickSelectedMap((m) => ({ ...m, [id]: row }));
        return [...prev, id];
      }
    });
  };

  const clearPickerSelection = () => {
    setPickSelectedIds([]);
    setPickSelectedMap({});
  };

  /* ---------- SAVE inside picker -> mark-in -> Added list ---------- */
 // BEFORE: saveSelectedToList called markCargoInShipment for each id
// AFTER: only update UI state and hide locally
const saveSelectedToList = async () => {
  if (pickSelectedIds.length === 0) {
    setToast({ open: true, variant: "error", text: "Select at least one cargo to save." });
    return;
  }

  const selectedRows = Object.values(pickSelectedMap);
  // merge into addedRows (unique by id)
  setAddedRows(prev => {
    const seen = new Set(prev.map(r => Number(r.id)));
    const merged = [...prev];
    selectedRows.forEach(r => {
      const id = Number(r.id);
      if (!seen.has(id)) merged.push(r);
    });
    return merged;
  });

  // hide them locally so they don't show in the picker again
  selectedRows.forEach(r => sessionHiddenIdsRef.current.add(Number(r.id)));

  // clear picker selection and refresh list
  setPickSelectedIds([]);
  setPickSelectedMap({});
  if (bookingSearch.trim()) await fetchPickerRows(bookingSearch);
  else await fetchPickerRows();

  setToast({ open: true, variant: "success", text: "Saved to list." });
};


  /* ---------- remove from Added list -> mark-not ---------- */
  const removeFromAdded = async (id) => {
    const n = Number(id);
    try {
      await markCargoNotInShipment(n);
      setAddedRows((prev) => prev.filter((r) => Number(r.id) !== n));
      sessionHiddenIdsRef.current.delete(n); // now eligible to show in picker again
      setToast({ open: true, variant: "success", text: `Removed #${n} from list.` });
      // if picker open, refresh so it can reappear
      if (showPicker) await fetchPickerRows(bookingSearch);
    } catch (e) {
      setToast({
        open: true,
        variant: "error",
        text: e?.message || `Failed to mark-not for #${n}.`,
      });
    }
  };

  /* ---------- submit ---------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (Number(myUserId) <= 0) {
      setToast({ open: true, variant: "error", text: "No logged-in user detected. Re-login and try again." });
      return;
    }
    if (Number(myBranchId) <= 0) {
      setToast({ open: true, variant: "error", text: "No branch detected. Please re-login." });
      return;
    }
    if (!formData.portOfOrigin || !formData.portOfDestination || !formData.awbNo || !formData.createdOn) {
      setToast({
        open: true,
        variant: "error",
        text: "Fill Origin Port, Destination Port, AWB/Container, and Created On.",
      });
      return;
    }
    if (!formData.shipmentStatus) {
      setToast({ open: true, variant: "error", text: "Choose a Shipment Status." });
      return;
    }
    if (addedRows.length === 0) {
      setToast({ open: true, variant: "error", text: "Add at least one cargo to the list." });
      return;
    }

    const payload = {
      cargo_ids: addedRows.map((r) => Number(r.id)),
      shipment_status_id: Number(formData.shipmentStatus),

      origin_port_id: formData.portOfOrigin,
      destination_port_id: formData.portOfDestination,
      awb_or_container_number: formData.awbNo,
      created_on: formData.createdOn,
      branch_id: Number(myBranchId),
      created_by_id: Number(myUserId),

      shipment_number: formData.shipmentNumber || undefined,
      license_details: formData.licenseDetails || undefined,
      exchange_rate: formData.exchangeRate ? Number(formData.exchangeRate) : undefined,
      shipping_method_id: formData.shippingMethod || undefined,
      clearing_agent_id: formData.clearingAgent || undefined,
      remarks: formData.shipmentDetails || undefined,
    };

    try {
      const committedIds = addedRows.map((r) => Number(r.id));
      await createCargoShipment(payload);

      // Keep them hidden (already hidden at save-time), reset UI
      sessionHiddenIdsRef.current = new Set([...sessionHiddenIdsRef.current, ...committedIds]);

      setToast({ open: true, variant: "success", text: "Shipment created successfully." });

      setFormData({
        shipmentNumber: "",
        awbNo: "",
        licenseDetails: "",
        exchangeRate: "",
        shipmentDetails: "",
        portOfOrigin: "",
        portOfDestination: "",
        shippingMethod: "",
        createdOn: today(),
        clearingAgent: "",
        shipmentStatus: "",
      });
      setBookingSearch("");
      setResults([]);
      setOppositeBucket([]);
      setDupeNote("");
      setShowPicker(false);
      setAddedRows([]); // fresh list
      } catch (e2) {
    const is422  = Number(e2?.status) === 422;
    const used   = e2?.details?.already_used_ids;       // ← comes from shipmentCargo.js
    if (is422 && Array.isArray(used) && used.length) {
      const usedIds = used.map(Number);
      // hard alert as you asked
      window.alert(`Some cargos are already assigned to another shipment:\n${usedIds.join(", ")}`);
      // remove those from the pending list
      setAddedRows(prev => prev.filter(r => !usedIds.includes(Number(r.id))));
      // hide them in this session so they don’t bounce back into the picker
      usedIds.forEach(id => sessionHiddenIdsRef.current.add(id));
      if (showPicker) await fetchPickerRows(bookingSearch);
      return;
    }
    setToast({
      open: true,
      variant: "error",
      text: e2?.message || e2?.details?.message || "Failed to create shipment."
    });
  }
} 

  /* ---------- derived for Saved panel ---------- */
  const totalAddedWeight = useMemo(
    () => addedRows.reduce((sum, r) => sum + Number.parseFloat(r?.total_weight || 0), 0),
    [addedRows]
  );

  const canSubmit =
    Number(formData.shipmentStatus) > 0 &&
    addedRows.length > 0 &&
    Number(myUserId) > 0 &&
    Number(myBranchId) > 0;

  const renderErr = (field) =>
    Array.isArray(fieldErrors?.[field]) ? (
      <div className="mt-1 text-xs text-rose-600">{fieldErrors[field].join(", ")}</div>
    ) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <RightToast
        open={toast.open}
        variant={toast.variant}
        onClose={() => setToast((m) => ({ ...m, open: false }))}
      >
        {toast.text}
      </RightToast>

      <div className="bg-white rounded-lg p-6 border">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex gap-2 items-center">
          <span className="text-[#ED2624]">
            <PiShippingContainerFill />
          </span>
          Create Shipment
        </h2>

        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Branch (readonly) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Branch</label>
              <input
                readOnly
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                value={
                  myBranchId
                    ? (myBranchName ? `${myBranchName} (#${myBranchId})` : `#${myBranchId}`)
                    : "No branch detected"
                }
                placeholder="No branch detected"
              />
            </div>

            {/* Created By (readonly) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Created By</label>
              <input
                readOnly
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                value={myUserName ? `${myUserName} (#${myUserId ?? "-"})` : (myUserId ?? "")}
                placeholder="No user detected"
              />
            </div>

            {/* Shipment Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipment Number</label>
              <input
                type="text"
                name="shipmentNumber"
                value={formData.shipmentNumber}
                onChange={handleChange}
                placeholder="Enter Shipment Number"
                className={`mt-1 block w-full px-4 py-2 border rounded-md ${fieldErrors?.shipment_number ? "border-rose-400" : "border-gray-300"
                  }`}
              />
              {renderErr("shipment_number")}
            </div>

            {/* Port of Origin */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Port Of Origin</label>
              <select
                name="portOfOrigin"
                value={formData.portOfOrigin}
                onChange={handleChange}
                className={`mt-1 block w-full px-4 py-2 border rounded-md ${fieldErrors?.origin_port_id ? "border-rose-400" : "border-gray-300"
                  }`}
              >
                <option value="">Select</option>
                {ports.map((port) => (
                  <option key={port.id} value={String(port.id)}>
                    {port.name}
                  </option>
                ))}
              </select>
              {renderErr("origin_port_id")}
            </div>

            {/* Port of Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Port Of Destination</label>
              <select
                name="portOfDestination"
                value={formData.portOfDestination}
                onChange={handleChange}
                className={`mt-1 block w-full px-4 py-2 border rounded-md ${fieldErrors?.destination_port_id ? "border-rose-400" : "border-gray-300"
                  }`}
              >
                <option value="">Select</option>
                {ports.map((port) => (
                  <option key={port.id} value={String(port.id)}>
                    {port.name}
                  </option>
                ))}
              </select>
              {renderErr("destination_port_id")}
            </div>

            {/* Shipping Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipping Method</label>
              <select
                name="shippingMethod"
                value={formData.shippingMethod}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border rounded-md border-gray-300"
              >
                <option value="">Select</option>
                {shipmentMethods.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* AWB / Container No */}
            <div>
              <label className="block text-sm font-medium text-gray-700">AWB / Container No</label>
              <input
                type="text"
                name="awbNo"
                value={formData.awbNo}
                onChange={handleChange}
                placeholder="Enter AWB or Container No"
                className={`mt-1 block w-full px-4 py-2 border rounded-md ${fieldErrors?.awb_or_container_number ? "border-rose-400" : "border-gray-300"
                  }`}
              />
              {renderErr("awb_or_container_number")}
            </div>

            {/* Shipment Date (created_on) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipment Date</label>
              <input
                type="date"
                name="createdOn"
                value={formData.createdOn}
                onChange={handleChange}
                className={`mt-1 block w-full px-4 py-2 border rounded-md ${fieldErrors?.created_on ? "border-rose-400" : "border-gray-300"
                  }`}
              />
              {renderErr("created_on")}
            </div>

            {/* Clearing Agent */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Clearing Agent</label>
              <select
                name="clearingAgent"
                value={formData.clearingAgent}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border rounded-md border-gray-300"
              >
                <option value="">Select Agent</option>
                {unwrapArray(branches).map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.branch_name || b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Shipment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipment Status</label>
              <select
                name="shipmentStatus"
                value={formData.shipmentStatus}
                onChange={handleChange}
                className={`mt-1 block w-full px-4 py-2 border rounded-md ${fieldErrors?.shipment_status_id ? "border-rose-400" : "border-gray-300"
                  }`}
              >
                <option value="">Select Status</option>
                {shipmentStatuses.map((st) => (
                  <option key={st.id} value={String(st.id)}>
                    {st.name}
                  </option>
                ))}
              </select>
              {renderErr("shipment_status_id")}
            </div>

            {/* License Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700">License Details</label>
              <input
                type="text"
                name="licenseDetails"
                value={formData.licenseDetails}
                onChange={handleChange}
                placeholder="Enter License Details"
                className="mt-1 block w-full px-4 py-2 border rounded-md border-gray-300"
              />
            </div>

            {/* Exchange Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Exchange Rate</label>
              <input
                type="text"
                name="exchangeRate"
                value={formData.exchangeRate}
                onChange={handleChange}
                placeholder="Enter Exchange Rate"
                className="mt-1 block w-full px-4 py-2 border rounded-md border-gray-300"
              />
            </div>

            {/* Shipment Details (remarks) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Shipment Details</label>
              <input
                type="text"
                name="shipmentDetails"
                value={formData.shipmentDetails}
                onChange={handleChange}
                placeholder="Enter Shipment Details"
                className="mt-1 block w-full px-4 py-2 border rounded-md border-gray-300"
              />
            </div>
          </div>

          {/* --- Saved (Added) Cargos --- */}
          <div className="mt-6 rounded-xl border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">
                  Selected Cargos <span className="text-gray-500">({addedRows.length})</span>
                </h3>
                <div className="text-sm text-gray-600">
                  Total weight: <b>{totalAddedWeight.toFixed(3)}</b> kg
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showPicker && (
                  <button
                    type="button"
                    onClick={closePicker}
                    className="px-3 py-2 rounded border text-gray-700 hover:bg-gray-50"
                  >
                    Done
                  </button>
                )}
                <button
                  type="button"
                  onClick={openPicker}
                  className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Add Row
                </button>
                {addedRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAddedRows([])}
                    className="px-3 py-2 rounded border hover:bg-gray-50"
                  >
                    Clear list
                  </button>
                )}
              </div>
            </div>

            {addedRows.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Nothing added yet. Click <b>Add Row</b> to pick cargos, then <b>Save Selected to List</b>.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead className="bg-gray-100 text-sm text-gray-700 border-b border-gray-300">
                    <tr>
                      <th className="py-2 px-4 border">ID</th>
                      <th className="py-2 px-4 border">Booking No.</th>
                      <th className="py-2 px-4 border">Sender</th>
                      <th className="py-2 px-4 border">Receiver</th>
                      <th className="py-2 px-4 border">Date</th>
                      <th className="py-2 px-4 border">Weight (kg)</th>
                      <th className="py-2 px-4 border">Status</th>
                      <th className="py-2 px-4 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-700">
                    {addedRows.map((r) => {
                      const statusText = r.status?.name || r.status || "";
                      return (
                        <tr key={`added-${r.id}`} className="hover:bg-gray-50">
                          <td className="py-2 px-4 border">{r.id}</td>
                          <td className="py-2 px-4 border">
                            <div className="flex items-center gap-2">
                              <span>{r.booking_no}</span>
                              <Link
                                to={`/cargo/view/${r.id}`}
                                className="text-xs text-indigo-600 hover:underline"
                              >
                                View
                              </Link>
                            </div>
                          </td>
                          <td className="py-2 px-4 border">{r.sender_name || "—"}</td>
                          <td className="py-2 px-4 border">{r.receiver_name || "—"}</td>
                          <td className="py-2 px-4 border">{r.date || "—"}</td>
                          <td className="py-2 px-4 border">{r.total_weight ?? "—"}</td>
                          <td className="py-2 px-4 border">
                            <span className={`px-2 py-1 text-xs rounded-lg ${statusPill(statusText)}`}>
                              {statusText || "—"}
                            </span>
                          </td>
                          <td className="py-2 px-4 border">
                            <button
                              type="button"
                              onClick={() => removeFromAdded(r.id)}
                              className="px-3 py-1 rounded bg-rose-600 text-white hover:bg-rose-700"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Picker panel (hidden until Add Row) */}
            {showPicker && (
              <div className="border-t">
                <div className="p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Add cargos (search by Booking No.)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      className="border rounded-lg px-3 py-2 sm:col-span-2"
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      placeholder="Enter booking number"
                    />
                    <button
                      type="button"
                      onClick={() => fetchPickerRows(bookingSearch)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                    >
                      {loadingList ? "Searching…" : "Search"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBookingSearch(""); fetchPickerRows(""); }}
                      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
                    >
                      Reset
                    </button>
                  </div>
                  {dupeNote && (
                    <div className="mt-2 text-xs text-gray-500">{dupeNote}</div>
                  )}

                  {oppositeBucket.length > 0 && (
                    <div className="mt-3 text-xs">
                      <div className="font-medium text-rose-700">
                        {searchShowsUsed
                          ? `Also found (not in shipment) – ${oppositeBucket.length}:`
                          : `Already in another shipment (${oppositeBucket.length}):`}
                      </div>
                      <ul className="mt-1 grid gap-1 sm:grid-cols-2 md:grid-cols-3 text-rose-700/90">
                        {oppositeBucket.slice(0, 12).map((r) => (
                          <li key={`opp-${r.id}`} className="flex items-center gap-2">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-600" />
                            <span>#{r.id} – {r.booking_no || "(no booking)"}</span>
                          </li>
                        ))}
                      </ul>
                      {oppositeBucket.length > 12 && (
                        <div className="mt-1 text-[11px] text-rose-500">and more… refine your search.</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white overflow-x-auto">
                  <table className="min-w-full table-auto">
                    <thead className="bg-gray-200 text-sm text-gray-700 border-y border-gray-300">
                      <tr>
                        <th className="py-2 px-4 border">
                          <input
                            type="checkbox"
                            checked={results.length > 0 && pickAllChecked}
                            onChange={toggleAllPicker}
                          />
                        </th>
                        <th className="py-2 px-4 border">ID</th>
                        <th className="py-2 px-4 border">Booking No.</th>
                        <th className="py-2 px-4 border">Sender</th>
                        <th className="py-2 px-4 border">Receiver</th>
                        <th className="py-2 px-4 border">Date</th>
                        <th className="py-2 px-4 border">Time</th>
                        <th className="py-2 px-4 border">Weight (kg)</th>
                        <th className="py-2 px-4 border">Status</th>
                        <th className="py-2 px-4 border">Track Code</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700">
                      {results.length === 0 && !loadingList && (
                        <tr>
                          <td className="py-6 px-4 text-center text-gray-500" colSpan={10}>
                            No cargos. Try searching by booking number.
                          </td>
                        </tr>
                      )}

                      {results.map((row) => {
                        const checked = pickSelectedIds.includes(Number(row.id));
                        const statusText = row.status?.name || row.status || "";
                        const isUsed = Number(row?.is_in_cargo_shipment) === 1; // now 1 is used
                        return (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="py-2 px-4 border">
                              <input
                                type="checkbox"
                                checked={pickSelectedIds.includes(Number(row.id))}
                                onChange={() => toggleOnePicker(row)}
                                disabled={isUsed}
                                title={isUsed ? "Already in a shipment" : ""}
                              />
                            </td>
                            <td className="py-2 px-4 border">{row.id}</td>
                            <td className="py-2 px-4 border">
                              <div className="flex items-center gap-2">
                                <span>{row.booking_no}</span>
                                <Link to={`/cargo/view/${row.id}`} className="text-xs text-indigo-600 hover:underline">
                                  View
                                </Link>
                              </div>
                            </td>
                            <td className="py-2 px-4 border">{row.sender_name || "—"}</td>
                            <td className="py-2 px-4 border">{row.receiver_name || "—"}</td>
                            <td className="py-2 px-4 border">{row.date || "—"}</td>
                            <td className="py-2 px-4 border">{row.time || "—"}</td>
                            <td className="py-2 px-4 border">{row.total_weight ?? "—"}</td>
                            <td className="py-2 px-4 border">
                              <span className={`px-2 py-1 text-xs rounded-lg ${statusPill(statusText)}`}>
                                {statusText || "—"}
                              </span>
                            </td>
                            <td className="py-2 px-4 border">{row.lrl_tracking_code || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-3 px-4 py-3 border-t bg-gray-50">
                  <button
                    type="button"
                    onClick={saveSelectedToList}
                    className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={savingMarks}
                  >
                    {savingMarks ? "Saving…" : "Save Selected to List"}
                  </button>
                  <button
                    type="button"
                    onClick={clearPickerSelection}
                    className="px-4 py-2 rounded border hover:bg-gray-100"
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    onClick={closePicker}
                    className="px-4 py-2 rounded border hover:bg-gray-100"
                  >
                    Close Picker
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* --- Actions --- */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-6 py-2 rounded-lg text-white ${!canSubmit ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
            >
              Create Shipment
            </button>

            <button
              type="button"
              onClick={() => {
                setFormData({
                  shipmentNumber: "",
                  awbNo: "",
                  licenseDetails: "",
                  exchangeRate: "",
                  shipmentDetails: "",
                  portOfOrigin: "",
                  portOfDestination: "",
                  shippingMethod: "",
                  createdOn: today(),
                  clearingAgent: "",
                  shipmentStatus: "",
                });
                setBookingSearch("");
                setResults([]);
                setOppositeBucket([]);
                setFieldErrors({});
                setDupeNote("");
                setShowPicker(false);
                setAddedRows([]);
                setPickSelectedIds([]);
                setPickSelectedMap({});
                setSearchShowsUsed(false);
              }}
              className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700"
            >
              Reset
            </button>
          </div>

          {!canSubmit && (
            <div className="text-xs text-gray-500 mt-1">
              {Number(formData.shipmentStatus) <= 0 && "Select a shipment status. "}
              {addedRows.length === 0 && "Add at least one cargo to the list. "}
              {!(Number(myUserId) > 0) && "No user detected. "}
              {!(Number(myBranchId) > 0) && "No branch detected. "}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}