// src/pages/Cargo/EditCargo.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Toaster, toast } from "react-hot-toast";
import { RiFileList2Line } from "react-icons/ri";
import { FiSend, FiUserCheck, FiFileText } from "react-icons/fi";
import { FaUserPlus } from "react-icons/fa";

/* APIs */
import { getCargoById, updateCargo } from "../../services/cargoService";
import {
  getShipmentMethods,
  getPaymentMethods,
  getDeliveryTypes,
  getCollectedBy,
  getActiveBranches,
  getBranchUsers,
} from "../../services/coreService";
import { getPartiesByCustomerType } from "../../services/partyService";

/* Utils */
import { 
  addressFromParty, 
  phoneFromParty, 
  labelOf, 
  prettyDriver, 
  idOf 
} from "../../utils/cargoHelpers";

import SenderModal from "../CRM/modals/SenderModal";
import ReceiverModal from "../CRM/modals/ReceiverModal";

/** Constants */
const CHARGE_KEYS = [
  "total_weight",
  "duty",
  "packing_charge",
  "additional_packing_charge",
  "insurance",
  "awb_fee",
  "vat_amount",
  "volume_weight",
  "other_charges",
  "discount",
];

const CHARGE_ROWS = [
  ["total_weight", "Total Weight"],
  ["duty", "Duty"],
  ["packing_charge", "Packing charge"],
  ["additional_packing_charge", "Additional Packing charge"],
  ["insurance", "Insurance"],
  ["awb_fee", "AWB Fee"],
  ["vat_amount", "VAT Amount"],
  ["volume_weight", "Volume weight"],
  ["other_charges", "Other charges"],
  ["discount", "Discount"],
];

const initialState = {
  loading: true,
  saving: false,
  error: null,
  form: {
    id: null,
    invoice_number: "",
    branch_id: "",
    branch_label: "",
    sender_id: "",
    receiver_id: "",
    shipping_method_id: "",
    payment_method_id: "",
    delivery_type_id: "",

    // Collected By Data
    collected_by_role_id: "",
    collected_by_role_name: "",
    collected_by_person_id: "",
    collected_by_person_name: "",

    date: "",
    time: "",
    tracking_code: "",
    lrl_tracking_code: "",
    special_remarks: "",
    bill_charges: 0,
    vat_percentage: 0,

    // Charges
    quantity_total_weight: 0,
    unit_rate_total_weight: 0,
    amount_total_weight: 0,
    quantity_duty: 0,
    unit_rate_duty: 0,
    amount_duty: 0,
    quantity_packing_charge: 0,
    unit_rate_packing_charge: 0,
    amount_packing_charge: 0,
    quantity_additional_packing_charge: 0,
    unit_rate_additional_packing_charge: 0,
    amount_additional_packing_charge: 0,
    quantity_insurance: 0,
    unit_rate_insurance: 0,
    amount_insurance: 0,
    quantity_awb_fee: 0,
    unit_rate_awb_fee: 0,
    amount_awb_fee: 0,
    quantity_vat_amount: 0,
    unit_rate_vat_amount: 0,
    amount_vat_amount: 0,
    quantity_volume_weight: 0,
    unit_rate_volume_weight: 0,
    amount_volume_weight: 0,
    quantity_other_charges: 0,
    unit_rate_other_charges: 0,
    amount_other_charges: 0,
    quantity_discount: 0,
    unit_rate_discount: 0,
    amount_discount: 0,

    total_cost: 0,
    vat_cost: 0,
    total_amount: 0,
    net_total: 0,
    total_weight: 0,
    no_of_pieces: 0,
    box_weight: {},
    items: [],
  },
};

export default function EditCargo({ cargoId: propCargoId, onSaved, onCancel }) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Get token and current User from Redux
  const { token, user } = useSelector((state) => state.auth || {});

  const [state, setState] = useState(initialState);
  const itemInputRefs = useRef({});
  const [focusTarget, setFocusTarget] = useState(null);

  // Store dropdown options
  const [options, setOptions] = useState({
    branches: [],
    senders: [],
    receivers: [],
    methods: [], 
    paymentMethods: [],
    deliveryTypes: [],
    collectRoles: [],
    collectedByPersons: [],
  });

  const [senderModalOpen, setSenderModalOpen] = useState(false);
  const [receiverModalOpen, setReceiverModalOpen] = useState(false);
  const [collectedByOptions, setCollectedByOptions] = useState([]);

  // Resolve ID
  const paramId = params?.id ?? params?.cargoId ?? params?.cargo_id ?? null;
  const searchId = (() => {
    try {
      return new URLSearchParams(location.search).get("id");
    } catch {
      return null;
    }
  })();
  const id = propCargoId || paramId || searchId;

  const n = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);
  
  // --- Optimized Data Loading ---
  useEffect(() => {
    if (!id || !token) return;

    const loadData = async () => {
      setState((s) => ({ ...s, loading: true }));

      try {
        const results = await Promise.allSettled([
          getCargoById(id),
          getActiveBranches({ status: 1 }),
          getCollectedBy(),
          getShipmentMethods({ status: 1 }),
          getPaymentMethods({ status: 1 }),
          getDeliveryTypes({ status: 1 }),
          getPartiesByCustomerType(1, { status: 1 }),
          getPartiesByCustomerType(2, { status: 1 }),
        ]);

        const getVal = (res, def = []) =>
          res.status === "fulfilled"
            ? res.value?.data?.data || res.value?.data || res.value || def
            : def;

        const cargoRes = results[0].status === "fulfilled" ? results[0].value : null;
        if (!cargoRes) throw new Error("Failed to load Cargo Data");

        const c = cargoRes?.data?.cargo || cargoRes?.cargo || cargoRes || {};
        
        const f = { ...initialState.form };

        // Helper: Find ID robustly
        const findId = (list, id, nameVal) => {
          if (id && list.some(item => String(item.id) === String(id))) return String(id);
          const nameStr = (typeof nameVal === 'object' && nameVal) ? nameVal.name : nameVal;
          if (nameStr) {
             const found = list.find(
               (item) => item.name?.trim().toLowerCase() === String(nameStr).trim().toLowerCase()
             );
             if (found) return String(found.id);
          }
          if (id) return String(id);
          return "";
        };

        f.id = c.id;
        f.invoice_number = c.booking_no || c.invoice_no || "";

        // --- BRANCH ---
        const branchList = getVal(results[1]);
        let foundBranchId = c.branch_id || c.branch?.id;
        let foundBranchName = c.branch_name || c.branch?.name || "";

        if (!foundBranchId && foundBranchName) {
          const loweredFoundBranchName = foundBranchName.trim().toLowerCase();
          const match = branchList.find(
            (b) => (b.name || b.branch_name || "").trim().toLowerCase() === loweredFoundBranchName
          );
          if (match) foundBranchId = match.id;
        }
        if (!foundBranchId && branchList.length > 0) {
          foundBranchId = branchList[0].id;
          foundBranchName = branchList[0].name || branchList[0].branch_name;
        }

        f.branch_id = foundBranchId ? String(foundBranchId) : "";
        const branchObj = branchList.find((b) => String(b.id) === f.branch_id);
        f.branch_label = branchObj ? branchObj.name || branchObj.branch_name : foundBranchName;

        // --- BRANCH STAFF ---
        let branchStaff = [];
        if (f.branch_id) {
          try {
            branchStaff = await getBranchUsers(f.branch_id);
          } catch (e) {
            console.error("Failed to load branch staff", e);
          }
        }

        const loadedOptions = {
          branches: branchList,
          collectRoles: getVal(results[2]),
          methods: getVal(results[3]),
          paymentMethods: getVal(results[4]),
          deliveryTypes: getVal(results[5]),
          senders: getVal(results[6]),
          receivers: getVal(results[7]),
          collectedByPersons: branchStaff,
        };

        f.sender_id = String(c.sender_id || c.sender?.id || "");
        f.receiver_id = String(c.receiver_id || c.receiver?.id || "");
        
        f.shipping_method_id = findId(
          loadedOptions.methods,
          c.shipping_method_id ?? c.shipment_method_id, 
          c.shipping_method ?? c.shipment_method
        );
        f.payment_method_id = findId(
          loadedOptions.paymentMethods,
          c.payment_method_id,
          c.payment_method
        );
        f.delivery_type_id = findId(
          loadedOptions.deliveryTypes,
          c.delivery_type_id,
          c.delivery_type
        );

        // --- COLLECTED BY ---
        f.collected_by_role_id = findId(
            loadedOptions.collectRoles,
            c.collected_by_id,
            c.collected_by
        ) || String(c.collected_by_id || "");
        f.collected_by_role_name = c.collected_by || "";

        const savedPersonId = String(c.name_id || c.collected_by_person_id || "");
        const currentUserId = String(user?.id || "");
        f.collected_by_person_id = savedPersonId ? savedPersonId : currentUserId;
        
        const selectedPerson = branchStaff.find((p) => String(p.id) === f.collected_by_person_id);
        f.collected_by_person_name = selectedPerson ? selectedPerson.name : c.collected_by_person_name || "";

        f.date = c.date || "";
        f.time = (c.time || "").slice(0, 5);
        f.tracking_code = c.tracking_code || c.tracking_no || "N/A";
        f.lrl_tracking_code = c.lrl_tracking_code || "N/A";
        f.special_remarks = c.special_remarks || "";

        f.bill_charges = n(c.bill_charges);
        f.vat_percentage = n(c.vat_percentage);

        // Populate charges object
        CHARGE_KEYS.forEach((k) => {
          f[`quantity_${k}`] = n(c[`quantity_${k}`]);
          f[`unit_rate_${k}`] = n(c[`unit_rate_${k}`]);
          f[`amount_${k}`] = n(c[`amount_${k}`]);
        });

        f.total_cost = n(c.total_cost);
        f.vat_cost = n(c.vat_cost);
        f.total_amount = n(c.total_amount);
        f.net_total = n(c.net_total);
        f.total_weight = n(c.total_weight);
        f.no_of_pieces = n(c.no_of_pieces);

        // --- ROBUST BOX MAPPING ---
        const rawBoxes = c.boxes || [];
        const rawWeights = c.box_weight || [];

        let parsedItems = [];
        const getWeight = (idx) => {
          if (Array.isArray(rawWeights)) return n(rawWeights[idx]);
          if (typeof rawWeights === "object") return n(rawWeights[idx] || rawWeights[String(idx)] || 0);
          return 0;
        };

        const getItemsList = (boxData) => {
          return Array.isArray(boxData.items) ? boxData.items : (Array.isArray(boxData) ? boxData : []);
        };

        if (Array.isArray(rawBoxes)) {
          parsedItems = rawBoxes.map((b, i) => ({
            box_number: String(b.box_number || i + 1),
            box_weight: getWeight(i) || n(b.box_weight) || n(b.weight) || 0,
            items: getItemsList(b).map((it) => ({
              name: it.name || it.item_name || "",
              pieces: n(it.piece_no || it.pieces || it.piece || 1), 
              item_weight: n(it.weight || it.item_weight || 0), 
            })),
          }));
        } else if (typeof rawBoxes === "object" && rawBoxes !== null) {
          parsedItems = Object.entries(rawBoxes)
            .sort((a, b) => n(a[0]) - n(b[0]))
            .map(([key, b], i) => ({
              box_number: String(b.box_number || key),
              box_weight: getWeight(i) || n(b.box_weight) || n(b.weight) || 0,
              items: getItemsList(b).map((it) => ({
                name: it.name || it.item_name || "",
                pieces: n(it.piece_no || it.pieces || it.piece || 1),
                item_weight: n(it.weight || it.item_weight || 0),
              })),
            }));
        } else if (c.items && Array.isArray(c.items) && c.items.length > 0) {
            parsedItems = [{
                box_number: "1",
                box_weight: f.total_weight || 0,
                items: c.items.map((it) => ({
                    name: it.name || it.item_name || "",
                    pieces: n(it.piece_no || it.pieces || it.piece || 1),
                    item_weight: n(it.weight || it.item_weight || 0),
                }))
            }];
        }

        if (parsedItems.length === 0) {
          parsedItems = [{ box_number: "1", box_weight: 0, items: [{ name: "", pieces: 1, item_weight: 0 }] }];
        }

        f.items = parsedItems;
        setOptions(loadedOptions);
        setCollectedByOptions(branchStaff); 
        setState((s) => ({ ...s, form: f, loading: false }));

      } catch (err) {
        console.error("Load Error:", err);
        toast.error("Error loading data.");
        setState((s) => ({ ...s, loading: false, error: "Failed to load." }));
      }
    };

    loadData();
  }, [id, token, user?.id]);

  // --- Helpers ---
  const setForm = useCallback((updater) => {
    setState((s) => ({
      ...s,
      form: typeof updater === "function" ? updater(s.form) : { ...s.form, ...updater },
    }));
  }, []);

  useEffect(() => {
    if (focusTarget) {
      const key = `${focusTarget.boxIdx}-${focusTarget.itemIdx}`;
      const el = itemInputRefs.current[key];
      if (el) { el.focus(); setFocusTarget(null); }
    }
    // Sync total weight
    const items = state.form.items || [];
    const totalWeightFromBoxes = items.reduce((sum, box) => sum + n(box.box_weight), 0);
    setForm((f) => {
      const newQty = totalWeightFromBoxes;
      const newAmount = newQty * n(f.unit_rate_total_weight);
      return { ...f, quantity_total_weight: newQty, amount_total_weight: newAmount, total_weight: newQty };
    });
  }, [state.form.items, state.form.unit_rate_total_weight, setForm, focusTarget]);


  // --- Event Handlers (Moved from children) ---
  
  const handleRoleChange = async (e) => {
    const roleId = e.target.value;
    const role = options.collectRoles.find((r) => String(r.id) === roleId);
    const roleName = role?.name || "";

    setForm((f) => ({ 
        ...f, 
        collected_by_role_id: roleId, 
        collected_by_role_name: roleName, 
        collected_by_person_id: "" 
    }));

    try {
        const staffRes = await getBranchUsers(state.form.branch_id);
        setCollectedByOptions(Array.isArray(staffRes) ? staffRes : []);
    } catch (e) {
        console.error(e);
        setCollectedByOptions([]);
    }
  };

  const handleChargeChange = (key, field, value) => {
      setForm((prev) => {
        const qty = field === 'qty' ? Number(value) : prev[`quantity_${key}`];
        const rate = field === 'rate' ? Number(value) : prev[`unit_rate_${key}`];
        const amount = qty * rate;
        
        return {
            ...prev,
            [`quantity_${key}`]: qty,
            [`unit_rate_${key}`]: rate,
            [`amount_${key}`]: amount
        };
      });
  };

  // Box Actions
  const addBox = () => {
      const nextNum = (state.form.items || []).length + 1;
      const newBox = { box_number: String(nextNum), box_weight: 0, items: [{ name: "", pieces: 1, item_weight: 0 }] };
      setForm(prev => ({ ...prev, items: [...prev.items, newBox] }));
  };
  const removeBox = (index) => {
      if (state.form.items.length <= 1) return;
      setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };
  const setBoxWeight = (index, val) => {
      setForm(prev => {
          const items = [...prev.items];
          items[index] = { ...items[index], box_weight: Number(val) };
          return { ...prev, items };
      });
  };
  const addItemToBox = (boxIndex) => {
      setForm(prev => {
          const items = [...prev.items];
          const box = { ...items[boxIndex] };
          box.items = [...box.items, { name: "", pieces: 1, item_weight: 0 }];
          items[boxIndex] = box;
          return { ...prev, items };
      });
  };
  const removeItemFromBox = (boxIndex, itemIndex) => {
      setForm(prev => {
          const items = [...prev.items];
          const box = { ...items[boxIndex] };
          if (box.items.length <= 1) return prev;
          box.items = box.items.filter((_, i) => i !== itemIndex);
          items[boxIndex] = box;
          return { ...prev, items };
      });
  };
  const setBoxItem = (boxIdx, itemIdx, key, val) => {
       setForm(prev => {
          const items = [...prev.items];
          const box = { ...items[boxIdx] };
          const boxItems = [...box.items];
          boxItems[itemIdx] = { ...boxItems[itemIdx], [key]: val };
          box.items = boxItems;
          items[boxIdx] = box;
          return { ...prev, items };
      });
  };
  const handleItemKeyDown = (e, boxIdx, itemIdx) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItemToBox(boxIdx);
    }
  };

  const handlePartyCreated = (createdParty, type) => {
     const party = createdParty?.party || createdParty;
     if(!party) return;
     if (type === 'sender') {
        setOptions(prev => ({...prev, senders: [party, ...prev.senders]}));
        setForm(f => ({...f, sender_id: String(party.id)}));
        setSenderModalOpen(false);
     } else {
        setOptions(prev => ({...prev, receivers: [party, ...prev.receivers]}));
        setForm(f => ({...f, receiver_id: String(party.id)}));
        setReceiverModalOpen(false);
     }
  };

  // --- Derived Calculations ---
  const derived = React.useMemo(() => {
    const rows = {};
    let totalAmount = 0;
    
    CHARGE_KEYS.forEach(k => {
        const qty = k === "total_weight" ? Number(state.form.total_weight || 0) : Number(state.form[`quantity_${k}`] || 0);
        const rate = Number(state.form[`unit_rate_${k}`] || 0);
        const amount = qty * rate;
        
        rows[k] = { qty, rate, amount };
        totalAmount += k === "discount" ? -amount : amount;
    });

    const subtotal = rows.total_weight?.amount || 0;
    
    // Bill charges exclude total_weight (base charge) and discount is subtracted
    const billCharges = CHARGE_KEYS.reduce((acc, k) => {
        if (k === "total_weight") return acc;
        const amt = rows[k].amount;
        return acc + (k === "discount" ? -amt : amt);
    }, 0);

    return { rows, subtotal, billCharges, totalAmount };
  }, [state.form]);

  const subtotal = derived.subtotal;
  const billCharges = derived.billCharges;
  const vatCost = (subtotal * (state.form.vat_percentage || 0)) / 100;
  const netTotal = derived.totalAmount + vatCost;

  // --- Submit ---
  const onSubmit = async (e) => {
    e.preventDefault();
    setState((s) => ({ ...s, saving: true }));
    const f = state.form;

    if (!f.branch_id) {
      toast.error("Error: Could not determine Branch ID.");
      setState((s) => ({ ...s, saving: false }));
      return;
    }

    const box_weight_array = [];
    const boxes_obj = {};
    const flat_items = [];

    (f.items || []).forEach((box, i) => {
      const boxNo = String(box.box_number || i + 1);
      const boxWeight = n(box.box_weight);
      box_weight_array.push(String(boxWeight.toFixed(3)));

      const apiBoxKey = String(i + 1);
      const currentBoxItems = (box.items || []).map((it, itemIdx) => ({
        slno: String(itemIdx + 1),
        box_number: apiBoxKey,
        name: it.name || `Item`,
        piece_no: String(it.pieces || 0),
        unit_price: "0.00",
        total_price: "0.00",
        weight: String(n(it.item_weight).toFixed(3)),
      }));

      boxes_obj[apiBoxKey] = {
        items: currentBoxItems,
        box_weight: String(boxWeight.toFixed(3)),
        weight: String(boxWeight.toFixed(3)),
      };
      flat_items.push(...currentBoxItems);
    });

    const payload = {
      booking_no: f.invoice_number,
      branch_id: f.branch_id,
      collected_by_id: f.collected_by_role_id,
      collected_by: f.collected_by_role_name,
      name_id: f.collected_by_person_id,
      collected_by_person_name: f.collected_by_person_name,
      sender_id: f.sender_id,
      receiver_id: f.receiver_id,
      shipping_method_id: f.shipping_method_id,
      payment_method_id: f.payment_method_id,
      delivery_type_id: f.delivery_type_id,
      date: f.date,
      time: f.time,
      lrl_tracking_code: f.lrl_tracking_code,
      special_remarks: f.special_remarks,

      bill_charges: String(billCharges.toFixed(2)),
      vat_percentage: String(n(f.vat_percentage).toFixed(2)),
      total_cost: String(subtotal.toFixed(2)),
      vat_cost: String(vatCost.toFixed(2)),
      total_amount: String(netTotal.toFixed(2)),
      net_total: String(netTotal.toFixed(2)),

      total_weight: String(f.total_weight.toFixed(3)),
      no_of_pieces: String((f.items || []).length),
      box_weight: box_weight_array,
      boxes: boxes_obj,
      items: flat_items,
      
      // Map charges from form state
      ...Object.fromEntries(
        CHARGE_KEYS.flatMap((k) => [
          [`quantity_${k}`, String(f[`quantity_${k}`])],
          [`unit_rate_${k}`, String(f[`unit_rate_${k}`])],
          [`amount_${k}`, String(n(f[`amount_${k}`]).toFixed(2))],
        ])
      ),
    };

    try {
      await updateCargo(f.id, payload);
      toast.success("Cargo updated successfully");
      if (onSaved) {
        onSaved(); 
      } else {
        navigate("/cargo/allcargolist", { state: { refresh: true } }); 
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update cargo");
      setState((s) => ({ ...s, saving: false }));
    }
  };

  /* selected parties for PartyInfo display */
  const selectedSender = options.senders.find(s => String(s.id) === String(state.form.sender_id));
  const selectedReceiver = options.receivers.find(r => String(r.id) === String(state.form.receiver_id));
  const isOfficeRoleAutoSelected = state.form.collected_by_role_name === 'Office' && state.form.collected_by_person_id;
  
  // Find selected person object for CollectionDetails
  const selectedCollectedBy = collectedByOptions.find(opt => {
      const valueId = opt?.id || opt?.user_id || opt?.staff_id;
      return String(valueId) === String(state.form.collected_by_person_id);
  });
  const selectedPersonLabel = selectedCollectedBy 
    ? (state.form.collected_by_role_name === "Driver" ? prettyDriver(selectedCollectedBy) : labelOf(selectedCollectedBy))
    : "";

  if (state.loading) return <div className="flex h-screen items-center justify-center text-indigo-600 font-semibold animate-pulse">Loading Cargo Details...</div>;
  const f = state.form;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-4 mb-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Edit Cargo</h1>
            <p className="text-sm text-gray-500">Updating booking <span className="font-mono font-medium text-indigo-600">{f.invoice_number}</span></p>
            <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
              <span>Tracking: <span className="font-mono font-medium text-gray-900">{f.tracking_code}</span></span>
              <span>LRL: <span className="font-mono font-medium text-gray-900">{f.lrl_tracking_code}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onCancel || (() => navigate(-1))} className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors">Cancel</button>
            <button type="button" onClick={onSubmit} disabled={state.saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors disabled:opacity-70 flex items-center gap-2">{state.saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">
         
         {/* 1. Collection Details (Inlined) */}
         <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <RiFileList2Line className="text-lg text-indigo-600" />
                <h3 className="text-sm font-bold tracking-wide text-slate-800 uppercase">Collection Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className='space-y-1.5'>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Invoice No</label>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-base font-bold text-slate-800 border border-slate-200">
                    {f.invoice_number}
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Branch</label>
                    <div className="flex items-center rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 border border-slate-200 h-[44px]">{f.branch_label}</div>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Collected By (Role)</label>
                    <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 h-[44px] text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        value={f.collected_by_role_id} onChange={handleRoleChange}>
                        <option value="">Select role...</option>
                        {options.collectRoles.map((r) => (<option key={r.id} value={String(r.id)}>{r.name}</option>))}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Collected By (Person)</label>
                     {isOfficeRoleAutoSelected ? (
                        <input type="text" readOnly className="w-full rounded-lg border-slate-200 bg-slate-100 text-slate-500 px-3 py-2.5 h-[44px] text-sm font-medium focus:ring-0" value={selectedPersonLabel} />
                     ) : (
                        <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 h-[44px] text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
                            value={f.collected_by_person_id} 
                            onChange={(e) => setForm(d => ({ ...d, collected_by_person_id: e.target.value, collected_by_person_name: "" }))} // Name will update on next fetch/render logic
                            disabled={!f.collected_by_role_id}>
                            <option value="">Select person...</option>
                            {collectedByOptions.map((opt, i) => {
                                const valId = opt?.id || opt?.user_id || opt?.staff_id;
                                return (<option key={i} value={String(valId)}>{f.collected_by_role_name === "Driver" ? prettyDriver(opt) : labelOf(opt)}</option>);
                            })}
                        </select>
                     )}
                </div>
            </div>
         </div>

         {/* 2. Party Info (Inlined) */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:border-l border-l-4 border-l-emerald-500">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700">
                    <FiSend className="text-lg" />
                    <h3 className="text-sm font-bold tracking-wide uppercase">Sender Info</h3>
                    </div>
                    <button type="button" onClick={() => setSenderModalOpen(true)} className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-all border border-emerald-200"><FaUserPlus /><span>Add New</span></button>
                </div>
                <div className="space-y-3">
                    <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-[44px]"
                        value={f.sender_id} onChange={(e) => setForm(d => ({ ...d, sender_id: e.target.value }))}>
                        <option value="">Select Sender...</option>
                        {options.senders.map((s) => (<option key={s.id} value={s.id}>{(s.name || "").toUpperCase()}</option>))}
                    </select>
                    <div className="space-y-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
                         <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</span><span className="text-slate-800 font-medium line-clamp-2">{addressFromParty(selectedSender) || "—"}</span></div>
                         <div className="flex flex-col border-t border-slate-200 pt-2"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</span><span className="text-slate-800 font-medium">{phoneFromParty(selectedSender) || "—"}</span></div>
                    </div>
                </div>
            </div>
            <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:border-l border-l-4 border-l-indigo-500">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-700">
                    <FiUserCheck className="text-lg" />
                    <h3 className="text-sm font-bold tracking-wide uppercase">Receiver Info</h3>
                    </div>
                    <button type="button" onClick={() => setReceiverModalOpen(true)} className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-all border border-indigo-200"><FaUserPlus /><span>Add New</span></button>
                </div>
                <div className="space-y-3">
                    <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-[44px]"
                        value={f.receiver_id} onChange={(e) => setForm(d => ({ ...d, receiver_id: e.target.value }))}>
                        <option value="">Select Receiver...</option>
                        {options.receivers.map((r) => (<option key={r.id} value={r.id}>{(r.name || "").toUpperCase()}</option>))}
                    </select>
                    <div className="space-y-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
                         <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</span><span className="text-slate-800 font-medium line-clamp-2">{addressFromParty(selectedReceiver) || "—"}</span></div>
                         <div className="flex flex-col border-t border-slate-200 pt-2"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</span><span className="text-slate-800 font-medium">{phoneFromParty(selectedReceiver) || "—"}</span></div>
                    </div>
                </div>
            </div>
         </div>

         {/* 3. Shipment Details & Date (Inlined) */}
         <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
             <div className="mb-4 border-b border-slate-100 pb-2"><h3 className="text-sm font-bold tracking-wide text-slate-700 uppercase">Shipment Details</h3></div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Shipping Method</label>
                    <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 h-[44px] text-sm text-slate-700 focus:border-indigo-500"
                        value={f.shipping_method_id} onChange={(e) => setForm(d => ({ ...d, shipping_method_id: e.target.value }))}>
                        <option value="">Select Method...</option>
                        {options.methods.map((m) => (<option key={m.id} value={String(m.id)}>{m.name}</option>))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Payment Method</label>
                    <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 h-[44px] text-sm text-slate-700 focus:border-indigo-500"
                        value={f.payment_method_id} onChange={(e) => setForm(d => ({ ...d, payment_method_id: e.target.value }))}>
                        <option value="">Select Payment...</option>
                        {options.paymentMethods.map((pm) => (<option key={pm.id} value={String(pm.id)}>{pm.name}</option>))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Delivery Type</label>
                    <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 h-[44px] text-sm text-slate-700 focus:border-indigo-500"
                        value={f.delivery_type_id} onChange={(e) => setForm(d => ({ ...d, delivery_type_id: e.target.value }))}>
                        <option value="">Select Type...</option>
                        {options.deliveryTypes.map((t) => (<option key={t.id} value={String(t.id)}>{t.name}</option>))}
                    </select>
                 </div>
                 {/* Date & Time moved here for compact layout */}
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Date</label>
                    <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 h-[44px] text-sm" value={f.date} onChange={(e) => setForm(d => ({ ...d, date: e.target.value }))} />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Time</label>
                    <input type="time" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 h-[44px] text-sm" value={f.time} onChange={(e) => setForm(d => ({ ...d, time: e.target.value }))} />
                 </div>
             </div>
         </div>

         {/* 4. Boxes (Inlined) */}
         <div className="space-y-6">
            {f.items.map((box, boxIndex) => (
                <div key={boxIndex} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            <div className="text-sm font-semibold text-slate-800">Box No: <span className="ml-2 inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-2 py-0.5">{boxIndex + 1}</span></div>
                            <label className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
                                <span className="text-slate-600">Box Weight (kg)</span>
                                <input type="number" min="0" step="0.001" className="w-full sm:w-32 rounded-lg border px-3 py-2 text-right border-slate-300"
                                    value={box.box_weight || ""} onChange={(e) => setBoxWeight(boxIndex, e.target.value)} placeholder="0.000" />
                            </label>
                        </div>
                        <button type="button" onClick={() => removeBox(boxIndex)} disabled={f.items.length <= 1} className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm text-white ${f.items.length <= 1 ? "bg-slate-300 cursor-not-allowed" : "bg-rose-600 hover:bg-rose-700"}`}>Remove Box</button>
                    </div>
                    {/* Items Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600"><tr className="text-left"><th className="px-3 py-2 w-12 text-center">Sl.</th><th className="px-3 py-2">Item</th><th className="px-3 py-2 w-24 text-right">Pieces</th><th className="px-3 py-2 w-28 text-right">Weight (kg)</th><th className="px-3 py-2 w-20 text-right">Actions</th></tr></thead>
                            <tbody>
                                {box.items.map((it, itemIndex) => (
                                    <tr key={itemIndex} className={itemIndex % 2 ? "bg-white" : "bg-slate-50/50"}>
                                        <td className="px-3 py-2 text-center text-slate-500">{itemIndex + 1}</td>
                                        <td className="px-3 py-2"><input ref={(el) => (itemInputRefs.current[`${boxIndex}-${itemIndex}-name`] = el)} type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={it.name} placeholder="Item name" onChange={(e) => setBoxItem(boxIndex, itemIndex, "name", e.target.value)} onKeyDown={(e) => handleItemKeyDown(e, boxIndex, itemIndex)} /></td>
                                        <td className="px-3 py-2"><input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right" placeholder="0" value={it.pieces} onChange={(e) => setBoxItem(boxIndex, itemIndex, "pieces", Number(e.target.value || 0))} /></td>
                                        <td className="px-3 py-2"><input type="number" min="0" step="0.001" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right" placeholder="0.000" value={it.item_weight || ""} onChange={(e) => setBoxItem(boxIndex, itemIndex, "item_weight", e.target.value)} /></td>
                                        <td className="px-3 py-2 text-right"><button type="button" onClick={() => removeItemFromBox(boxIndex, itemIndex)} className="rounded-lg bg-rose-500 px-2 py-1 text-white hover:bg-rose-600">Delete</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex justify-end"><button type="button" onClick={() => addItemToBox(boxIndex)} className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Add Item</button></div>
                </div>
            ))}
            <div className="flex justify-end"><button type="button" onClick={addBox} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">+ Add Box</button></div>
         </div>

         {/* 5. Charges & Summary (Inlined) */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-2"><FiFileText className="text-lg text-slate-600" /><h3 className="text-sm font-semibold tracking-wide text-slate-700">Remarks & Charges</h3></div>
                <div className="grid grid-cols-3 gap-4 items-end">
                    <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Special remarks</label><input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={f.special_remarks} onChange={(e) => setForm(d => ({ ...d, special_remarks: e.target.value }))} placeholder="(optional)" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">VAT %</label><input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right" value={f.vat_percentage || ""} onChange={(e) => setForm(d => ({ ...d, vat_percentage: Number(e.target.value || 0) }))} /></div>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-x-auto lg:overflow-visible">
                    <table className="w-full table-fixed text-sm">
                        <thead className="bg-slate-50 text-slate-600"><tr className="text-left"><th className="px-3 py-2 font-medium w-[40%]">Charges</th><th className="px-3 py-2 font-medium text-right w-[20%]">Quantity</th><th className="px-3 py-2 font-medium text-right w-[20%]">Unit Rate</th><th className="px-3 py-2 font-medium text-right w-[20%]">Amount</th></tr></thead>
                        <tbody>
                            {CHARGE_ROWS.map(([key, label], index) => {
                                const qtyValue = key === "total_weight" ? f.total_weight : f[`quantity_${key}`];
                                const rateValue = f[`unit_rate_${key}`];
                                const amountValue = derived.rows[key]?.amount ?? 0;
                                return (
                                    <tr key={key} className={`${index % 2 ? "bg-white" : "bg-slate-50/50"}`}>
                                        <td className="px-3 py-2 text-slate-700 truncate">{label}</td>
                                        <td className="px-3 py-2"><input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right" value={qtyValue || ""} onChange={(e) => handleChargeChange(key, "qty", e.target.value)} readOnly={key === "total_weight"} /></td>
                                        <td className="px-3 py-2"><input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right" value={rateValue || ""} onChange={(e) => handleChargeChange(key, "rate", e.target.value)} /></td>
                                        <td className="px-3 py-2"><input readOnly className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2 text-right font-medium" value={amountValue.toFixed(2)} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
             </div>
             {/* Summary Side Panel */}
             <div>
                <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-700">Summary</h3>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-slate-700"><span>Subtotal</span><b>{subtotal.toFixed(2)}</b></div>
                        <div className="flex justify-between text-slate-700"><span>Bill Charges</span><b>{billCharges.toFixed(2)}</b></div>
                        <div className="flex justify-between text-slate-700"><span>VAT</span><b>{vatCost.toFixed(2)}</b></div>
                        <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900"><span>Total (Net)</span><span>{netTotal.toFixed(2)}</span></div>
                        <div className="mt-2 flex justify-between text-xs text-slate-600"><span>Total Weight</span><span>{f.total_weight.toFixed(3)} kg</span></div>
                    </div>
                </div>
             </div>
         </div>
      </div>

      <SenderModal open={senderModalOpen} onClose={() => setSenderModalOpen(false)} onCreated={(d) => handlePartyCreated(d, "sender")} />
      <ReceiverModal open={receiverModalOpen} onClose={() => setReceiverModalOpen(false)} onCreated={(d) => handlePartyCreated(d, "receiver")} />
    </div>
  );
}