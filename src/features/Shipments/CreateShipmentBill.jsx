import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { 
  PiShippingContainerFill, 
  PiAirplaneTiltFill, 
  PiReceipt, 
  PiUserCircle, 
  PiBuildings,
  PiMagnifyingGlass,
  PiXBold,
  PiCheckBold,
  PiPlusBold,
  PiTrash,
  PiFileXls,
  PiFloppyDiskBack
} from "react-icons/pi";

import {
  getShipmentMethods,
  getPorts,
  getActiveBranches,
  getShipmentStatuses
} from "../../services/coreService";
import { getProfile } from "../../services/authService";
import {
  getPhysicalBills,
  importCustomShipments,
  createBillShipment
} from "../../services/billShipmentApi.js"

import "./PhysicalBill.css";

/* ---------------- helpers ---------------- */
const unwrapArray = (o) =>
  Array.isArray(o) ? o :
    Array.isArray(o?.data?.data) ? o.data.data :
      Array.isArray(o?.data) ? o.data :
        Array.isArray(o?.items) ? o.items :
          Array.isArray(o?.results) ? o.results : [];

const today = () => new Date().toISOString().slice(0, 10);
const onlyFree = (rows = []) =>
  rows.filter((r) => Number(r?.is_shipment ?? r?.is_in_cargo_shipment ?? 0) === 0);

const statusPill = (s) => {
  const v = String(s || "").toLowerCase();
  if (!v || v === "pending") return "bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-medium border border-amber-200";
  if (v.includes("received") || v.includes("delivered")) return "bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-medium border border-emerald-200";
  if (v.includes("cancel")) return "bg-rose-100 text-rose-700 px-2 py-1 rounded-md text-xs font-medium border border-rose-200";
  return "bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-medium border border-slate-200";
};

const buildStatusMaps = (arr = []) => {
  const byId = new Map();      
  const byName = new Map();    
  for (const s of arr) {
    if (s?.id != null && s?.name) {
      byId.set(Number(s.id), String(s.name));
      byName.set(String(s.name).toLowerCase(), Number(s.id));
    }
  }
  return { byId, byName };
};

// ---- picker cell getters ----
const getBillNo = (r) => String(r?.invoice_no ?? r?.bill_no ?? r?.booking_no ?? "").trim();
const getPcs = (r) => (Number.isFinite(Number(r?.pcs)) ? Number(r.pcs) : null);
const getWeight = (r) => {
  const n = Number(r?.weight ?? r?.total_weight);
  return Number.isFinite(n) ? n : null;
};

const getMethod = (r) => String(r?.shipment_method ?? "").trim();
const getDest = (r) => String(r?.des ?? r?.destination ?? "").trim();
const getDateISO = (r) => r?.created_at ?? r?.date ?? null;

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDate = (r) => fmtDate(getDateISO(r));

// --- UI Components ---
const SectionTitle = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
    <Icon className="text-indigo-600 text-lg" />
    <h3 className="font-semibold text-gray-800">{title}</h3>
  </div>
);

const InputGroup = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">{label}</label>
    {children}
    {error && <span className="text-xs text-rose-500 ml-1">{error}</span>}
  </div>
);

function RightToast({ open, variant = "success", children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed top-6 right-6 z-[999] animate-fade-in-left">
      <div
        className={`rounded-xl px-5 py-4 shadow-xl text-sm border flex items-center gap-3 ${
          variant === "error"
            ? "bg-white border-rose-100 text-rose-600"
            : variant === "warning"
            ? "bg-white border-amber-100 text-amber-600"
            : "bg-white border-emerald-100 text-emerald-600"
        }`}
      >
        <div className={`p-1.5 rounded-full ${variant === 'error' ? 'bg-rose-50' : 'bg-emerald-50'}`}>
           {variant === 'error' ? <PiXBold /> : <PiCheckBold />}
        </div>
        <div>{children}</div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 ml-2"
        >
          <PiXBold />
        </button>
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

/* ---------- status helpers ---------- */
const normalizeStatusId = (val) => {
  if (!val) return null;
  if (typeof val === "object" && val.id != null) return Number(val.id);
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

// SAFE: statusById is optional and guarded
const getStatusText = (row, statusById = new Map()) => {
  if (row?.status?.name) return String(row.status.name);
  const id = normalizeStatusId(row?.status);
  if (id != null && statusById && typeof statusById.has === "function" && statusById.has(id)) {
    return statusById.get(id);
  }
  if (typeof row?.status === "string") return row.status;
  return "";
};

export default function CreateShipmentBill() {
  // dropdown data
  const [shipmentMethods, setShipmentMethods] = useState([]);
  const [ports, setPorts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [shipmentStatuses, setShipmentStatuses] = useState([]);

  // Redux fallbacks
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

  // status maps
  const [statusList, setStatusList] = useState([]);
  const [statusMaps, setStatusMaps] = useState({ byId: new Map(), byName: new Map() });
  const [defaultShipmentStatusId, setDefaultShipmentStatusId] = useState("");

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

  // Saved cargos list
  const [addedRows, setAddedRows] = useState([]);

  // picker state
  const [showPicker, setShowPicker] = useState(false);
  const PAGE_SIZE = 10;
  const [pickPage, setPickPage] = useState(1);
  const SELECTED_PAGE_SIZE = 10;
  const [selPage, setSelPage] = useState(1);
  const [bookingSearch, setBookingSearch] = useState("");
  const [results, setResults] = useState([]); // rows rendered in picker table
  const [loadingList, setLoadingList] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [dupeNote, setDupeNote] = useState("");
  const [oppositeBucket, setOppositeBucket] = useState([]); // list for the red note

  // selection inside picker (temporary)
  const [pickSelectedIds, setPickSelectedIds] = useState([]); // number[]
  const [pickSelectedMap, setPickSelectedMap] = useState({}); // id -> row

  // Tracks whether current picker is showing USED (search mode)
  const [searchShowsUsed, setSearchShowsUsed] = useState(false);

  // Track cargos committed/saved this session
  const sessionHiddenIdsRef = useRef(new Set());

  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ---------- bootstrap: fetch dropdowns + profile + statuses ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [methods, portList, branchList, statuses, me] = await Promise.all([
          getShipmentMethods(),
          getPorts(),
          getActiveBranches(),
          getShipmentStatuses(),
          getProfile(),
        ]);

        const methodsArr = unwrapArray(methods);
        const portsArr = unwrapArray(portList);
        const branchesArr = unwrapArray(branchList);
        const statusesArr = unwrapArray(statuses);

        setShipmentMethods(methodsArr);
        setPorts(portsArr);
        setBranches(branchesArr);
        setShipmentStatuses(statusesArr);
        setStatusList(statusesArr);
        setStatusMaps(buildStatusMaps(statusesArr));

        const defaultStatus = statusesArr.find(s => s.name?.toLowerCase() === 'shipment booked');
        if (defaultStatus) {
          setDefaultShipmentStatusId(defaultStatus.id);
          setFormData(prev => ({ ...prev, shipmentStatus: String(defaultStatus.id) }));
        }

        setProfileObj(me?.data ?? me ?? null);
      } catch (e) {
        setToast({ open: true, variant: "error", text: e?.message || "Failed to load dropdown data." });
      }
    })();
  }, []);

  // Resolve branch & user
  useEffect(() => {
    if (!profileObj || !Array.isArray(branches) || branches.length === 0) return;

    let id = branchFromRedux != null ? Number(branchFromRedux) : null;
    let name = branchNameFromRedux;

    if (id == null || !name) {
      const { id: bid, name: bname } = extractBranchInfo(profileObj, branches);
      if (id == null) id = bid ?? null;
      if (!name) name = bname ?? "";
    }

    if (id == null && branches.length > 0) {
      id = Number(branches[0]?.id);
      name = String(branches[0]?.branch_name || branches[0]?.name || `#${id}`);
    }

    if (id != null) setMyBranchId(id);
    if (name) setMyBranchName(name);

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
    setPickPage(1);
    setBookingSearch("");
    setPickSelectedIds([]);
    setPickSelectedMap({});
    // Initial fetch handled by the useEffect below now
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

  /* ---------- NEW: Auto Search Effect ---------- */
  useEffect(() => {
    if (!showPicker) return;

    // Debounce: wait 500ms after user stops typing
    const timeoutId = setTimeout(() => {
      fetchPickerRows(bookingSearch);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [bookingSearch, showPicker]);


  /* ---------- helpers: filter out session-hidden & already-added ---------- */
  const notSessionHidden = (rows = []) => {
    const hidden = sessionHiddenIdsRef.current;
    return rows.filter((r) => !hidden.has(Number(r.id)));
  };
  const notAlreadyAdded = (rows = []) => {
    const addedSet = new Set(addedRows.map((r) => Number(r.id)));
    return rows.filter((r) => !addedSet.has(Number(r.id)));
  };

  // ---- pagination for picker results ----
  const totalPickPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePickPage = Math.min(pickPage, totalPickPages);
  const baseIndex = (safePickPage - 1) * PAGE_SIZE;
  const visibleResults = useMemo(() => {
    const start = (safePickPage - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, safePickPage]);

  // Fetch picker rows
  const fetchPickerRows = async (queryText = "") => {
    setLoadingList(true);
    setDupeNote("");
    setOppositeBucket([]);
    try {
      const hasQuery = !!(queryText && String(queryText).trim());
      const qlc = String(queryText || "").trim().toLowerCase();
      let tableRows = [];
      let usedRows = [];

      // HELPER: Check if row matches query (Booking, Invoice, or Bill)
      const matchesQuery = (r) => {
        const needle = qlc;
        const booking = String(r?.booking_no || "").toLowerCase();
        const invoice = String(r?.invoice_no || "").toLowerCase();
        const bill = String(r?.bill_no || "").toLowerCase();
        return booking.includes(needle) || invoice.includes(needle) || bill.includes(needle);
      };

      if (!hasQuery) {
        // Initial picker / reset: show FREE (0)
        setSearchShowsUsed(false);
        const resp = await getPhysicalBills({}, false); // sends ?is_shipment=0
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
          getPhysicalBills({ search: queryText }, false), // ?is_shipment=0
          getPhysicalBills({ search: queryText }, true),  // ?is_shipment=1
        ]);

        // Free rows for the TABLE (Applied Broader Filter)
        tableRows = onlyFree(unwrapArray(freeResp)).filter(matchesQuery);
        
        // Used rows for the NOTE
        usedRows = unwrapArray(usedResp).filter(matchesQuery);

        // Fallbacks if backend ignored 'search'
        if (tableRows.length === 0 && unwrapArray(freeResp).length === 0) {
          const allFree = onlyFree(unwrapArray(await getPhysicalBills({}, false)));
          tableRows = allFree.filter(matchesQuery);
        }
        if (usedRows.length === 0 && unwrapArray(usedResp).length === 0) {
          const allUsed = unwrapArray(await getPhysicalBills({}, true));
          usedRows = allUsed.filter(matchesQuery);
        }

        // Table rows = FREE matches minus session-hidden / already-added
        const hidden = sessionHiddenIdsRef.current;
        const addedSet = new Set(addedRows.map((r) => Number(r.id)));
        tableRows = tableRows.filter(
          (r) => !hidden.has(Number(r.id)) && !addedSet.has(Number(r.id))
        );
        setDupeNote(""); 
      }

      setResults(tableRows);
      setOppositeBucket(usedRows);
      setPickPage(1);
    } catch (e) {
      setResults([]);
      setOppositeBucket([]);
      setToast({ open: true, variant: "error", text: e?.message || "Failed to fetch cargos." });
    } finally {
      setLoadingList(false);
    }
  };

  const totalSelPages = Math.max(1, Math.ceil(addedRows.length / SELECTED_PAGE_SIZE));
  const selBaseIndex = (selPage - 1) * SELECTED_PAGE_SIZE;

  const visibleAddedRows = useMemo(() => {
    const start = (selPage - 1) * SELECTED_PAGE_SIZE;
    return addedRows.slice(start, start + SELECTED_PAGE_SIZE);
  }, [addedRows, selPage]);

  // Clamp page
  useEffect(() => {
    if (selPage > totalSelPages) setSelPage(totalSelPages);
  }, [totalSelPages, selPage]);

  // If list grows, jump to last page
  const prevAddedLenRef = useRef(0);
  useEffect(() => {
    if (addedRows.length > prevAddedLenRef.current) {
      setSelPage(Math.max(1, Math.ceil(addedRows.length / SELECTED_PAGE_SIZE)));
    }
    prevAddedLenRef.current = addedRows.length;
  }, [addedRows.length]);

  /* ---------- selection controls inside picker ---------- */
  const pickAllChecked =
    visibleResults.length > 0 &&
    visibleResults.every((row) => pickSelectedIds.includes(Number(row.id)));

  const toggleAllPicker = () => {
    if (pickAllChecked) {
      const visibleIds = new Set(visibleResults.map((r) => Number(r.id)));
      setPickSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
      setPickSelectedMap((m) => {
        const copy = { ...m };
        for (const id of visibleIds) delete copy[id];
        return copy;
      });
    } else {
      const addIds = visibleResults
        .filter((r) => Number(r?.is_shipment ?? r?.is_in_cargo_shipment ?? 0) !== 1)
        .map((r) => Number(r.id));
      setPickSelectedIds((prev) => Array.from(new Set([...prev, ...addIds])));
      setPickSelectedMap((m) => {
        const copy = { ...m };
        visibleResults.forEach((r) => {
          if (Number(r?.is_shipment ?? r?.is_in_cargo_shipment ?? 0) !== 1) {
            copy[Number(r.id)] = r;
          }
        });
        return copy;
      });
    }
  };

  const toggleOnePicker = (row) => {
    const id = Number(row.id);
    if (Number(row?.is_in_cargo_shipment) === 1) return;
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

  // AFTER: only update UI state and hide locally
  const saveSelectedToList = async () => {
    if (pickSelectedIds.length === 0) {
      setToast({ open: true, variant: "error", text: "Select at least one cargo to save." });
      return;
    }

    const selectedRows = Object.values(pickSelectedMap);
    setAddedRows((prev) => {
      const seen = new Set(prev.map((r) => Number(r.id)));
      const merged = [...prev];
      selectedRows.forEach((r) => {
        const id = Number(r.id);
        if (!seen.has(id)) merged.push(r);
      });
      return merged;
    });

    selectedRows.forEach((r) => sessionHiddenIdsRef.current.add(Number(r.id)));
    setPickSelectedIds([]);
    setPickSelectedMap({});
    // Fetch refreshed list based on current search
    await fetchPickerRows(bookingSearch);

    setToast({ open: true, variant: "success", text: "Saved to list." });
  };

  /* ---------- remove from Added list -> mark-not ---------- */
  const removeFromAdded = (id) => {
    const n = Number(id);
    setAddedRows((prev) => prev.filter((r) => Number(r.id) !== n));
    sessionHiddenIdsRef.current.delete(n);
    setToast({ open: true, variant: "success", text: `Removed #${n} from list.` });
    if (showPicker) fetchPickerRows(bookingSearch);
  };

  /* ---------- submit ---------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
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
      setSubmitting(false);
      return;
    }
    if (!formData.shipmentStatus) {
      setToast({ open: true, variant: "error", text: "Choose a Shipment Status." });
      setSubmitting(false);
      return;
    }
    if (addedRows.length === 0) {
      setToast({ open: true, variant: "error", text: "Add at least one cargo to the list." });
      setSubmitting(false);
      return;
    }

    const payload = {
      custom_shipment_ids: addedRows.map((r) => Number(r.id)),
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
      await createBillShipment(payload);
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
        shipmentStatus: defaultShipmentStatusId ? String(defaultShipmentStatusId) : "",
      });
      setBookingSearch("");
      setResults([]);
      setOppositeBucket([]);
      setDupeNote("");
      setShowPicker(false);
      setAddedRows([]); 
    } catch (e2) {
      console.error('Error creating shipment:', e2);
      const is422 = Number(e2?.response?.status) === 422;
      const used = e2?.response?.data?.details?.already_used_ids || e2?.details?.already_used_ids;
      if (is422 && Array.isArray(used) && used.length) {
        const usedIds = used.map(Number);
        window.alert(`Some cargos are already assigned to another shipment:\n${usedIds.join(", ")}`);
        setAddedRows((prev) => prev.filter((r) => !usedIds.includes(Number(r.id))));
        usedIds.forEach((id) => sessionHiddenIdsRef.current.add(id));
        if (showPicker) await fetchPickerRows(bookingSearch);
        return;
      }
      setToast({
        open: true,
        variant: "error",
        text: e2?.response?.data?.message || e2?.message || e2?.details?.message || "Failed to create shipment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (pickPage > totalPickPages) setPickPage(totalPickPages);
  }, [totalPickPages, pickPage]);

  /* ---------- derived for Saved panel ---------- */
  const totalAddedWeight = useMemo(
    () => addedRows.reduce((sum, r) => {
       const w = Number(r?.total_weight ?? r?.weight ?? 0);
       return sum + (Number.isFinite(w) ? w : 0);
    }, 0),
    [addedRows]
  );

  const canSubmit =
    Number(formData.shipmentStatus) > 0 &&
    addedRows.length > 0 &&
    Number(myUserId) > 0 &&
    Number(myBranchId) > 0 &&
    !submitting;

  // helpers for import toasts
  const labelForRow = (r) =>
    r?.booking_no || r?.invoice_no || r?.bill_no || r?.invoice || `#${r?.id ?? "?"}`;

  const handleImportExcel = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setImporting(true);
    setToast({ open: true, variant: "success", text: "Uploading… reading file…" });

    try {
      const resp = await importCustomShipments(file, {
        branch_id: myBranchId ?? undefined,
        status_id: 13,
      });

      const importedRows = unwrapArray(resp);

      if (importedRows.length > 0) {
        setAddedRows(prev => {
          const seen = new Set(prev.map(r => Number(r.id)));
          const merged = [...prev];
          importedRows.forEach(r => {
            const id = Number(r.id);
            if (!seen.has(id)) merged.push(r);
          });
          return merged;
        });

        importedRows.forEach(r => sessionHiddenIdsRef.current.add(Number(r.id)));

        setToast({
          open: true,
          variant: "success",
          text: `Imported ${importedRows.length} cargos and added to Selected Cargos.`,
        });
      } else {
        // Fallback logic for import
        const beforeResp = await getPhysicalBills({}, false);
        const beforeFree = unwrapArray(beforeResp);
        const beforeFreeIds = new Set(beforeFree.map(r => Number(r.id)));

        const afterResp = await getPhysicalBills({}, false);
        const afterFree = unwrapArray(afterResp);
        const addedIds = new Set(addedRows.map(r => Number(r.id)));

        let newFreeRows = afterFree.filter(r => !beforeFreeIds.has(Number(r.id)));

        if (!newFreeRows.length) {
          const todayStr = new Date().toISOString().slice(0, 10);
          newFreeRows = afterFree.filter(r => {
            const d = String(r.created_at || "").slice(0, 10);
            return d === todayStr &&
                   String(r.status) === "13" &&
                   String(r.is_shipment) === "0" &&
                   !addedIds.has(Number(r.id));
          });
        }

        if (!newFreeRows.length) {
          setToast({
            open: true,
            variant: "warning",
            text: "Import succeeded, but nothing new to add.",
          });
          return;
        }

        setAddedRows(prev => {
          const seen = new Set(prev.map(r => Number(r.id)));
          const merged = [...prev];
          newFreeRows.forEach(r => {
            const id = Number(r.id);
            if (!seen.has(id)) merged.push(r);
          });
          return merged;
        });

        newFreeRows.forEach(r => sessionHiddenIdsRef.current.add(Number(r.id)));

        setToast({
          open: true,
          variant: "success",
          text: `Imported ${newFreeRows.length} cargos and added to Selected Cargos.`,
        });
      }
    } catch (err) {
       // ... existing error handling ...
      setToast({ open: true, variant: "error", text: "Import failed. Please check your file." });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const formInputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all placeholder:text-gray-400";
  const formSelectClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none";

  const renderErr = (field) =>
    Array.isArray(fieldErrors?.[field]) ? fieldErrors[field].join(", ") : null;

  return (
    <div className="w-full mx-auto animate-fade-in-up pb-10">
      <RightToast
        open={toast.open}
        variant={toast.variant}
        onClose={() => setToast((m) => ({ ...m, open: false }))}
      >
        {toast.text}
      </RightToast>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex gap-3 items-center">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shadow-sm border border-indigo-100">
              <PiShippingContainerFill className="text-2xl" />
            </span>
            Create Bill Shipment
          </h2>
          <p className="text-gray-500 text-sm mt-1 ml-14">
            Manage your shipment details and cargo manifest
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- Section 1: General Info --- */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <SectionTitle icon={PiReceipt} title="General Information" />
            <div className="space-y-5">
              
              {/* Branch & User (Visual only inputs) */}
              <div className="grid grid-cols-2 gap-4">
                 <InputGroup label="Branch">
                    <div className="relative">
                        <PiBuildings className="absolute left-3 top-3 text-gray-400" />
                        <input
                            readOnly
                            className={`${formInputClass} pl-9 bg-gray-100/70 text-gray-500 cursor-not-allowed`}
                            value={myBranchId ? (myBranchName || `#${myBranchId}`) : "No Branch"}
                        />
                    </div>
                 </InputGroup>
                 <InputGroup label="Created By">
                    <div className="relative">
                        <PiUserCircle className="absolute left-3 top-3 text-gray-400" />
                        <input
                            readOnly
                            className={`${formInputClass} pl-9 bg-gray-100/70 text-gray-500 cursor-not-allowed`}
                            value={myUserName || myUserId || "No User"}
                        />
                    </div>
                 </InputGroup>
              </div>

              <InputGroup label="Shipment Number" error={renderErr("shipment_number")}>
                <input
                    type="text"
                    name="shipmentNumber"
                    value={formData.shipmentNumber}
                    onChange={handleChange}
                    placeholder="Enter Shipment Number"
                    className={formInputClass}
                />
              </InputGroup>

              <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Date" error={renderErr("created_on")}>
                    <input
                        type="date"
                        name="createdOn"
                        value={formData.createdOn}
                        onChange={handleChange}
                        className={formInputClass}
                    />
                  </InputGroup>

                  <InputGroup label="Status" error={renderErr("shipment_status_id")}>
                    <select
                        name="shipmentStatus"
                        value={formData.shipmentStatus}
                        onChange={handleChange}
                        disabled
                        className={`${formSelectClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
                    >
                        <option value="">Select Status</option>
                        {shipmentStatuses.map((st) => (
                        <option key={st.id} value={String(st.id)}>{st.name}</option>
                        ))}
                    </select>
                  </InputGroup>
              </div>
            </div>
          </div>

          {/* --- Section 2: Route & Logistics --- */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <SectionTitle icon={PiAirplaneTiltFill} title="Route & Logistics" />
             <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Origin Port" error={renderErr("origin_port_id")}>
                        <select
                            name="portOfOrigin"
                            value={formData.portOfOrigin}
                            onChange={handleChange}
                            className={formSelectClass}
                        >
                            <option value="">Select Origin</option>
                            {ports.map((port) => (
                            <option key={port.id} value={String(port.id)}>{port.name}</option>
                            ))}
                        </select>
                    </InputGroup>

                    <InputGroup label="Destination" error={renderErr("destination_port_id")}>
                        <select
                            name="portOfDestination"
                            value={formData.portOfDestination}
                            onChange={handleChange}
                            className={formSelectClass}
                        >
                            <option value="">Select Dest.</option>
                            {ports.map((port) => (
                            <option key={port.id} value={String(port.id)}>{port.name}</option>
                            ))}
                        </select>
                    </InputGroup>
                </div>

                <InputGroup label="Shipping Method">
                    <select
                        name="shippingMethod"
                        value={formData.shippingMethod}
                        onChange={handleChange}
                        className={formSelectClass}
                    >
                        <option value="">Select Method</option>
                        {shipmentMethods.map((m) => (
                        <option key={m.id} value={String(m.id)}>{m.name}</option>
                        ))}
                    </select>
                </InputGroup>

                <InputGroup label="AWB / Container No" error={renderErr("awb_or_container_number")}>
                    <input
                        type="text"
                        name="awbNo"
                        value={formData.awbNo}
                        onChange={handleChange}
                        placeholder="e.g. MAWB-12345678"
                        className={formInputClass}
                    />
                </InputGroup>
             </div>
          </div>

          {/* --- Section 3: Financials & Remarks --- */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <SectionTitle icon={PiFloppyDiskBack} title="Financials & Details" />
             <div className="space-y-5">
                <InputGroup label="Clearing Agent">
                    <select
                        name="clearingAgent"
                        value={formData.clearingAgent}
                        onChange={handleChange}
                        className={formSelectClass}
                    >
                        <option value="">Select Agent</option>
                        {unwrapArray(branches).map((b) => (
                        <option key={b.id} value={String(b.id)}>{b.branch_name || b.name}</option>
                        ))}
                    </select>
                </InputGroup>

                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="License No">
                        <input
                            type="text"
                            name="licenseDetails"
                            value={formData.licenseDetails}
                            onChange={handleChange}
                            placeholder="Optional"
                            className={formInputClass}
                        />
                    </InputGroup>
                    <InputGroup label="Exchange Rate">
                        <input
                            type="text"
                            name="exchangeRate"
                            value={formData.exchangeRate}
                            onChange={handleChange}
                            placeholder="0.00"
                            className={formInputClass}
                        />
                    </InputGroup>
                </div>

                <InputGroup label="Remarks / Details">
                    <textarea
                        name="shipmentDetails"
                        value={formData.shipmentDetails}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Additional notes..."
                        className={`${formInputClass} resize-none`}
                    />
                </InputGroup>
             </div>
          </div>

        </div>

        {/* --- Saved (Added) Cargos --- */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header for Cargo List */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
                        <PiShippingContainerFill />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">Shipment Content</h3>
                        <p className="text-xs text-gray-500">
                            {addedRows.length} Items Selected • Total Weight: <span className="font-mono font-medium text-gray-700">{totalAddedWeight.toFixed(3)} kg</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    {showPicker && (
                        <button type="button" onClick={closePicker} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-medium border border-transparent hover:border-gray-200 transition-all">
                            Done Adding
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={importing}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white transition-colors text-sm font-medium"
                    >
                        {importing ? <span className="animate-spin text-lg">C</span> : <PiFileXls className="text-lg" />}
                        Import Excel
                    </button>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />

                    <button
                        type="button"
                        onClick={openPicker}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all text-sm font-medium"
                    >
                        <PiPlusBold />
                        Add Items
                    </button>
                    {addedRows.length > 0 && (
                        <button type="button" onClick={() => setAddedRows([])} className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm border border-transparent hover:border-rose-100 transition-all">
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Added Rows Table */}
            <div className="overflow-x-auto min-h-[150px]">
                {addedRows.length === 0 ? (
                <div className="py-12 text-center text-gray-400 flex flex-col items-center">
                    <PiShippingContainerFill className="text-5xl opacity-20 mb-3" />
                    <p>No cargos added yet.</p>
                    <p className="text-xs mt-1">Click "Add Items" or "Import Excel" to begin.</p>
                </div>
                ) : (
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                        <th className="py-3 px-6 font-semibold">#</th>
                        <th className="py-3 px-6 font-semibold">Bill Details</th>
                        <th className="py-3 px-6 font-semibold text-center">Pcs</th>
                        <th className="py-3 px-6 font-semibold text-center">Weight (kg)</th>
                        <th className="py-3 px-6 font-semibold">Method</th>
                        <th className="py-3 px-6 font-semibold">Dest.</th>
                        <th className="py-3 px-6 font-semibold">Date</th>
                        <th className="py-3 px-6 font-semibold">Status</th>
                        <th className="py-3 px-6 font-semibold text-center">Action</th>
                    </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                    {visibleAddedRows.map((row, idx) => {
                        const statusTextVal = getStatusText(row, statusMaps.byId);
                        return (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-6 text-gray-400 font-mono text-xs">{selBaseIndex + idx + 1}</td>
                            <td className="py-3 px-6 font-medium text-gray-800">{getBillNo(row) || "—"}</td>
                            <td className="py-3 px-6 text-center">{getPcs(row) ?? "—"}</td>
                            <td className="py-3 px-6 text-center">{getWeight(row) ?? "—"}</td>
                            <td className="py-3 px-6 text-xs">{getMethod(row) || "—"}</td>
                            <td className="py-3 px-6 text-xs">{getDest(row) || "—"}</td>
                            <td className="py-3 px-6 text-xs text-gray-500">{getDate(row) || "—"}</td>
                            <td className="py-3 px-6">
                                <span className={statusPill(statusTextVal)}>
                                    {statusTextVal || "—"}
                                </span>
                            </td>
                            <td className="py-3 px-6 text-center">
                                <button
                                    type="button"
                                    onClick={() => removeFromAdded(row.id)}
                                    className="p-2 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Remove row"
                                >
                                    <PiTrash className="text-lg" />
                                </button>
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
                )}

                 {/* Pagination for Added List */}
                 {addedRows.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50 text-xs text-gray-500">
                    <div>
                        Page <span className="font-medium">{selPage}</span> of{" "}
                        <span className="font-medium">{totalSelPages}</span> •{" "}
                        <span>{addedRows.length} items</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                        type="button"
                        className="rounded border px-3 py-1 bg-white hover:bg-gray-100 disabled:opacity-50"
                        onClick={() => setSelPage((p) => Math.max(1, p - 1))}
                        disabled={selPage === 1}
                        >
                        Prev
                        </button>
                        <button
                        type="button"
                        className="rounded border px-3 py-1 bg-white hover:bg-gray-100 disabled:opacity-50"
                        onClick={() => setSelPage((p) => Math.min(totalSelPages, p + 1))}
                        disabled={selPage === totalSelPages}
                        >
                        Next
                        </button>
                    </div>
                    </div>
                )}
            </div>

            {/* Picker Panel (Slide/Fade In) */}
            {showPicker && (
              <div className="border-t-2 border-indigo-100 bg-slate-50 animate-fade-in">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                         <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                            <PiMagnifyingGlass className="text-indigo-600" />
                            Search & Add Cargo
                         </h4>
                         <button onClick={closePicker} className="text-gray-400 hover:text-gray-600"><PiXBold /></button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-2xl">
                        <input
                            className="w-full pl-10 pr-24 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm transition-all"
                            value={bookingSearch}
                            onChange={(e) => setBookingSearch(e.target.value)}
                            placeholder="Type Booking No, Invoice No, or Bill No..."
                            autoFocus
                        />
                        <PiMagnifyingGlass className="absolute left-3.5 top-3.5 text-gray-400 text-lg" />
                        {loadingList && (
                            <span className="absolute right-24 top-3.5 text-xs text-indigo-500 font-medium animate-pulse">
                                Searching...
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => { setBookingSearch(""); fetchPickerRows(""); }}
                            className="absolute right-2 top-2 px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Reset
                        </button>
                    </div>

                    {/* Feedback Messages */}
                    {dupeNote && <div className="mt-2 text-xs text-amber-600 font-medium px-1">{dupeNote}</div>}
                    {oppositeBucket.length > 0 && (
                        <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg">
                            <div className="text-xs font-bold text-rose-700 mb-1">
                                {searchShowsUsed ? "Matches found (Excluded from current view):" : "Found in other shipments:"}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {oppositeBucket.slice(0, 5).map((r) => (
                                    <span key={r.id} className="text-[10px] bg-white border border-rose-200 text-rose-600 px-1.5 py-0.5 rounded">
                                        #{getBillNo(r)}
                                    </span>
                                ))}
                                {oppositeBucket.length > 5 && <span className="text-[10px] text-rose-500 italic">+ {oppositeBucket.length - 5} more</span>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white border-t border-gray-200 overflow-x-auto shadow-inner max-h-[400px]">
                  <table className="min-w-full table-auto">
                    <thead className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4 border-b w-12 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            checked={results.length > 0 && pickAllChecked}
                            onChange={toggleAllPicker}
                          />
                        </th>
                        <th className="py-3 px-4 border-b">Bill Info</th>
                        <th className="py-3 px-4 border-b text-center">Stats</th>
                        <th className="py-3 px-4 border-b">Route</th>
                        <th className="py-3 px-4 border-b">Date</th>
                        <th className="py-3 px-4 border-b">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                      {results.length === 0 && !loadingList && (
                        <tr>
                          <td className="py-8 px-4 text-center text-gray-400" colSpan={6}>
                            No matching cargos found.
                          </td>
                        </tr>
                      )}

                      {visibleResults.map((row, idx) => {
                        const checked = pickSelectedIds.includes(Number(row.id));
                        const isUsed = Number(row?.is_shipment ?? row?.is_in_cargo_shipment ?? 0) === 1;
                        const statusStr = getStatusText(row, statusMaps.byId);

                        return (
                          <tr 
                            key={row.id} 
                            onClick={() => !isUsed && toggleOnePicker(row)}
                            className={`transition-colors cursor-pointer ${isUsed ? 'bg-gray-50 opacity-60 cursor-not-allowed' : checked ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                          >
                            <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleOnePicker(row)}
                                disabled={isUsed}
                                className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                              />
                            </td>
                            <td className="py-3 px-4">
                                <div className="font-medium text-gray-800">{getBillNo(row) || "—"}</div>
                                <div className="text-xs text-gray-400">SL: {baseIndex + idx + 1}</div>
                            </td>
                            <td className="py-3 px-4 text-center">
                                <div className="text-xs text-gray-600">{getPcs(row) ?? "-"} pcs</div>
                                <div className="text-xs text-gray-400">{getWeight(row) ?? "-"} kg</div>
                            </td>
                            <td className="py-3 px-4">
                                <div className="text-xs text-gray-800">{getDest(row)}</div>
                                <div className="text-[10px] text-gray-400 uppercase">{getMethod(row)}</div>
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-500">{fmtDate(getDateISO(row))}</td>
                            <td className="py-3 px-4">
                              <span className={statusPill(statusStr)}>
                                {statusStr || "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Picker Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Page <b>{safePickPage}</b> of <b>{totalPickPages}</b>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                        <button
                        type="button"
                        className="p-1.5 rounded border bg-white hover:bg-gray-100 disabled:opacity-50 text-xs font-medium"
                        onClick={() => setPickPage((p) => Math.max(1, p - 1))}
                        disabled={safePickPage === 1}
                        >
                        Prev
                        </button>
                        <button
                        type="button"
                        className="p-1.5 rounded border bg-white hover:bg-gray-100 disabled:opacity-50 text-xs font-medium"
                        onClick={() => setPickPage((p) => Math.min(totalPickPages, p + 1))}
                        disabled={safePickPage === totalPickPages}
                        >
                        Next
                        </button>
                    </div>
                    
                    <div className="w-px h-6 bg-gray-300 mx-2"></div>

                    <button
                        type="button"
                        onClick={clearPickerSelection}
                        className="text-gray-500 hover:text-gray-700 text-sm px-3"
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={saveSelectedToList}
                        className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed font-medium text-sm transition-all"
                        disabled={savingMarks || pickSelectedIds.length === 0}
                    >
                        {savingMarks ? "Saving…" : `Add ${pickSelectedIds.length} Selected`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- Bottom Actions --- */}
          <div className="mt-8 flex items-center justify-end gap-4 pb-20">
            <button
              type="button"
              onClick={() => {
                if(window.confirm("Are you sure you want to reset the form?")) {
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
                    shipmentStatus: defaultShipmentStatusId ? String(defaultShipmentStatusId) : "",
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
                }
              }}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-8 py-2.5 rounded-lg text-white font-semibold shadow-md transition-all transform hover:-translate-y-0.5 ${!canSubmit ? "bg-gray-400 cursor-not-allowed shadow-none" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                }`}
            >
              {submitting ? "Creating..." : "Create Shipment"}
            </button>
          </div>
      </form>
    </div>
  );
}