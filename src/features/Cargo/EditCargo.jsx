// src/pages/Cargo/EditCargo.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Toaster, toast } from "react-hot-toast";

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

import SenderModal from "../CRM/modals/SenderModal";
import ReceiverModal from "../CRM/modals/ReceiverModal";

/** Charge keys */
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
    shipmentMethods: [],
    paymentMethods: [],
    deliveryTypes: [],
    collectRoles: [],
    collectedByPersons: [],
  });

  const [senderModalOpen, setSenderModalOpen] = useState(false);
  const [receiverModalOpen, setReceiverModalOpen] = useState(false);

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

  const n = (v) =>
    v === null || v === undefined || v === "" ? 0 : Number(v) || 0;

  // --- Optimized Data Loading with Reverse Lookup ---
  useEffect(() => {
    if (!id || !token) return;

    const loadData = async () => {
      setState((s) => ({ ...s, loading: true }));

      try {
        const results = await Promise.allSettled([
          getCargoById(id, token),
          getActiveBranches({}, token),
          getCollectedBy(token),
          getShipmentMethods(token),
          getPaymentMethods(token),
          getDeliveryTypes(token),
          getPartiesByCustomerType(1, { status: 1 }, token),
          getPartiesByCustomerType(2, { status: 1 }, token),
        ]);

        const getVal = (res, def = []) =>
          res.status === "fulfilled"
            ? res.value?.data?.data || res.value?.data || res.value || def
            : def;

        const cargoRes =
          results[0].status === "fulfilled" ? results[0].value : null;
        if (!cargoRes) throw new Error("Failed to load Cargo Data");

        const c = cargoRes?.data?.cargo || cargoRes?.cargo || cargoRes || {};
        const f = { ...initialState.form };

        const findId = (list, id, name) => {
          if (id) return String(id);
          if (!name) return "";
          const found = list.find(
            (item) => item.name?.toLowerCase() === name?.toLowerCase()
          );
          return found ? String(found.id) : "";
        };

        f.id = c.id;
        f.invoice_number = c.booking_no || "";

        // --- BRANCH LOGIC ---
        const branchList = getVal(results[1]);
        let foundBranchId = c.branch_id || c.branch?.id;
        let foundBranchName = c.branch_name || c.branch?.name || "";

        if (!foundBranchId && foundBranchName) {
          const loweredFoundBranchName = foundBranchName.trim().toLowerCase();
          const match = branchList.find(
            (b) =>
              (b.name || b.branch_name || "").trim().toLowerCase() ===
              loweredFoundBranchName
          );
          if (match) foundBranchId = match.id;
        }

        if (!foundBranchId && branchList.length > 0) {
          foundBranchId = branchList[0].id;
          foundBranchName = branchList[0].name || branchList[0].branch_name;
        }

        f.branch_id = foundBranchId ? String(foundBranchId) : "";
        const branchObj = branchList.find((b) => String(b.id) === f.branch_id);
        f.branch_label = branchObj
          ? branchObj.name || branchObj.branch_name
          : foundBranchName;

        // --- FETCH BRANCH STAFF ---
        let branchStaff = [];
        if (f.branch_id) {
          try {
            branchStaff = await getBranchUsers(f.branch_id, token);
          } catch (e) {
            console.error("Failed to load branch staff", e);
          }
        }

        const loadedOptions = {
          branches: branchList,
          collectRoles: getVal(results[2]),
          shipmentMethods: getVal(results[3]),
          paymentMethods: getVal(results[4]),
          deliveryTypes: getVal(results[5]),
          senders: getVal(results[6]),
          receivers: getVal(results[7]),
          collectedByPersons: branchStaff,
        };

        f.sender_id = String(c.sender_id || "");
        f.receiver_id = String(c.receiver_id || "");
        f.shipping_method_id = findId(
          loadedOptions.shipmentMethods,
          c.shipping_method_id,
          c.shipping_method
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

        // --- COLLECTED BY LOGIC ---
        f.collected_by_role_id =
          findId(
            loadedOptions.collectRoles,
            c.collected_by_id,
            c.collected_by
          ) || String(c.collected_by_id || "");
        f.collected_by_role_name = c.collected_by || "";

        const savedPersonId = String(
          c.name_id || c.collected_by_person_id || ""
        );
        const currentUserId = String(user?.id || "");
        f.collected_by_person_id = savedPersonId
          ? savedPersonId
          : currentUserId;
        const selectedPerson = branchStaff.find(
          (p) => String(p.id) === f.collected_by_person_id
        );
        f.collected_by_person_name = selectedPerson
          ? selectedPerson.name
          : c.collected_by_person_name || "";

        f.date = c.date || "";
        f.time = (c.time || "").slice(0, 5);
        f.tracking_code = c.tracking_code || "";
        f.lrl_tracking_code = c.lrl_tracking_code || "";
        f.special_remarks = c.special_remarks || "";

        f.bill_charges = n(c.bill_charges);
        f.vat_percentage = n(c.vat_percentage);
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
          if (Array.isArray(rawWeights)) return n(rawWeights[idx]); // Access by Index 0
          if (typeof rawWeights === "object")
            return n(rawWeights[String(idx + 1)] || rawWeights[idx + 1] || 0); // Access by ID 1
          return 0;
        };

        const getItemsList = (boxData) => {
          return Array.isArray(boxData.items) ? boxData.items : [];
        };

        if (Array.isArray(rawBoxes)) {
          // Case 1: Boxes is an Array (0, 1, 2...)
          parsedItems = rawBoxes.map((b, i) => ({
            box_number: String(i + 1),
            box_weight: getWeight(i) || n(b.box_weight) || n(b.weight) || 0,
            items: getItemsList(b).map((it) => ({
              name: it.name || it.item_name || "",
              pieces: n(it.piece_no || it.pieces || it.piece), 
              item_weight: n(it.weight || it.item_weight || it.box_weight), 
            })),
          }));
        } else if (typeof rawBoxes === "object" && rawBoxes !== null) {
          // Case 2: Boxes is an Object
          parsedItems = Object.entries(rawBoxes)
            .sort((a, b) => n(a[0]) - n(b[0]))
            .map(([key, b], i) => ({
              box_number: String(i + 1),
              box_weight: getWeight(i) || n(b.box_weight) || n(b.weight) || 0,
              items: getItemsList(b).map((it) => ({
                name: it.name || it.item_name || "",
                pieces: n(it.piece_no || it.pieces || it.piece),
                item_weight: n(it.weight || it.item_weight || it.box_weight),
              })),
            }));
        }

        if (parsedItems.length === 0) {
          parsedItems = [
            {
              box_number: "1",
              box_weight: 0,
              items: [{ name: "", pieces: 1, item_weight: 0 }],
            },
          ];
        }

        f.items = parsedItems;
        setOptions(loadedOptions);
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
      form:
        typeof updater === "function"
          ? updater(s.form)
          : { ...s.form, ...updater },
    }));
  }, []);

  const handleFieldChange = (field, value) => {
    if (field === "branch_id" && !value) return;
    setForm((f) => ({ ...f, [field]: value }));
  };

  useEffect(() => {
    if (focusTarget) {
      const key = `${focusTarget.boxIdx}-${focusTarget.itemIdx}`;
      const el = itemInputRefs.current[key];
      if (el) {
        el.focus();
        setFocusTarget(null);
      }
    }
    // This effect now only syncs the total weight fields with the sum of box weights.
    const items = state.form.items || [];
    const totalWeightFromBoxes = items.reduce(
      (sum, box) => sum + n(box.box_weight),
      0
    );
    setForm((f) => {
      const newQty = totalWeightFromBoxes;
      const newAmount = newQty * n(f.unit_rate_total_weight);
      return { ...f, quantity_total_weight: newQty, amount_total_weight: newAmount, total_weight: newQty };
    });
  }, [
    state.form.items,
    state.form.unit_rate_total_weight,
    setForm,
    focusTarget,
  ]);

  const addBox = () =>
    setForm((f) => {
      const nextNum = (f.items || []).length + 1;
      return {
        ...f,
        items: [
          ...f.items,
          {
            box_number: String(nextNum),
            box_weight: 0,
            items: [{ name: "", pieces: 1, item_weight: 0 }],
          },
        ],
      };
    });

  const removeBox = (index) =>
    setForm((f) => {
      if (f.items.length <= 1) return f;
      return { ...f, items: f.items.filter((_, i) => i !== index) };
    });

  const removeItem = (boxIdx, itemIdx) =>
    setForm((f) => {
      if (f.items[boxIdx].items.length <= 1) {
        toast.error("Cannot remove the last item.");
        return f;
      }
      const newItems = f.items.map((box, i) => {
        if (i !== boxIdx) return box;
        return {
          ...box,
          items: box.items.filter((_, j) => j !== itemIdx),
        };
      });
      return { ...f, items: newItems };
    });

  const addItem = (boxIdx) =>
    setForm((f) => {
      const newItems = f.items.map((box, i) => {
        if (i !== boxIdx) return box;
        return {
          ...box,
          items: [...box.items, { name: "", pieces: 1, item_weight: 0 }],
        };
      });
      return { ...f, items: newItems };
    });

  const setBoxValue = (index, key, val) => {
    setForm((f) => {
      const newItems = f.items.map((box, i) => {
        if (i === index) return { ...box, [key]: val };
        return box;
      });
      return { ...f, items: newItems };
    });
  };

  const setItemValue = (boxIdx, itemIdx, key, val) =>
    setForm((f) => {
      const newItems = f.items.map((box, i) => {
        if (i !== boxIdx) return box;
        const newBoxItems = box.items.map((item, j) => {
          if (j === itemIdx) return { ...item, [key]: val };
          return item;
        });
        return { ...box, items: newBoxItems };
      });
      return { ...f, items: newItems };
    });

  const handleItemKeyDown = (e, boxIdx, itemIdx) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem(boxIdx);
      setFocusTarget({ boxIdx, itemIdx: itemIdx + 1 });
    }
  };

  const handlePartyCreated = (createdParty, type) => {
    const party = createdParty?.party || createdParty?.data || createdParty;
    if (!party?.id) return;
    setOptions((prev) => ({
      ...prev,
      [type === "sender" ? "senders" : "receivers"]: [
        party,
        ...prev[type === "sender" ? "senders" : "receivers"],
      ],
    }));
    setForm((f) => ({
      ...f,
      [type === "sender" ? "sender_id" : "receiver_id"]: String(party.id),
    }));
    if (type === "sender") setSenderModalOpen(false);
    else setReceiverModalOpen(false);
    toast.success(
      `${type === "sender" ? "Sender" : "Receiver"} created and selected`
    );
  };

  // --- Submit ---
  const onSubmit = async () => {
    setState((s) => ({ ...s, saving: true }));
    const f = state.form;

    if (!f.branch_id) {
      toast.error("Error: Could not determine Branch ID.");
      setState((s) => ({ ...s, saving: false }));
      return;
    }

    const calculatedBillCharges = CHARGE_KEYS.reduce((acc, k) => {
      if (k === "total_weight") return acc;
      const amount = n(f[`amount_${k}`]);
      return acc + (k === "discount" ? -amount : amount);
    }, 0);

    const currentSubtotal = n(f.amount_total_weight);
    const currentVatCost = (currentSubtotal * n(f.vat_percentage)) / 100;
    const currentTotalAmount =
      currentSubtotal + calculatedBillCharges + currentVatCost;

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

    const total_weight = (f.items || []).reduce(
      (sum, box) => sum + n(box.box_weight),
      0
    );

    const roleObj = options.collectRoles.find(
      (r) => String(r.id) === f.collected_by_role_id
    );
    const personObj = options.collectedByPersons.find(
      (p) => String(p.id) === f.collected_by_person_id
    );

    const payload = {
      booking_no: f.invoice_number,
      branch_id: f.branch_id,
      collected_by_id: f.collected_by_role_id,
      collected_by: roleObj
        ? roleObj.name || roleObj.label || f.collected_by_role_name
        : f.collected_by_role_name,
      name_id: f.collected_by_person_id,
      collected_by_person_name: personObj
        ? personObj.name
        : f.collected_by_person_name,
      sender_id: f.sender_id,
      receiver_id: f.receiver_id,
      shipping_method_id: f.shipping_method_id,
      payment_method_id: f.payment_method_id,
      delivery_type_id: f.delivery_type_id,
      date: f.date,
      time: f.time,
      lrl_tracking_code: f.lrl_tracking_code,
      special_remarks: f.special_remarks,

      bill_charges: String(calculatedBillCharges.toFixed(2)),
      vat_percentage: String(n(f.vat_percentage).toFixed(2)),
      total_cost: String(currentSubtotal.toFixed(2)),
      vat_cost: String(currentVatCost.toFixed(2)),
      total_amount: String(currentTotalAmount.toFixed(2)),
      net_total: String(currentTotalAmount.toFixed(2)),

      total_weight: String(total_weight.toFixed(3)),
      no_of_pieces: String((f.items || []).length),
      box_weight: box_weight_array,
      boxes: boxes_obj,
      items: flat_items,
      ...Object.fromEntries(
        CHARGE_KEYS.flatMap((k) => [
          [`quantity_${k}`, String(n(f[`quantity_${k}`]))],
          [`unit_rate_${k}`, String(n(f[`unit_rate_${k}`]))],
          [`amount_${k}`, String(n(f[`amount_${k}`]).toFixed(2))],
        ])
      ),
    };

    try {
      await updateCargo(f.id, payload);
      toast.success("Cargo updated successfully");
      
      // CRITICAL FIX: Handle redirection based on usage mode
      if (onSaved) {
        // Mode 1: Modal (parent handles close/refresh)
        onSaved(); 
      } else {
        // Mode 2: Full Page (Navigate to List + Trigger Refresh)
        // Ensure '/cargo' matches your Cargo List route path
        navigate("/cargo", { state: { refresh: true } }); 
      }

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update cargo");
      setState((s) => ({ ...s, saving: false }));
    }
  };

  if (state.loading)
    return (
      <div className="flex h-screen items-center justify-center text-indigo-600 font-semibold animate-pulse">
        Loading Cargo Details...
      </div>
    );
  const f = state.form;
  const subtotal = n(f.amount_total_weight);

  const billCharges = CHARGE_KEYS.reduce((acc, k) => {
    if (k === "total_weight") return acc;
    const amount = n(f[`amount_${k}`]);
    return acc + (k === "discount" ? -amount : amount);
  }, 0);

  const vatCost = (subtotal * n(f.vat_percentage)) / 100;
  const grandTotal = (subtotal + billCharges + vatCost).toFixed(2);

  const cardClass = "bg-white p-6 rounded-xl shadow-sm border border-gray-100";
  const labelClass =
    "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all";
  const selectClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white";

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-4 mb-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Edit Cargo</h1>
            <p className="text-sm text-gray-500">
              Updating booking{" "}
              <span className="font-mono font-medium text-indigo-600">
                {f.invoice_number}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel || (() => navigate(-1))}
              className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={state.saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {state.saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* SECTION 1: Branch & Staff Info */}
        <div className={cardClass}>
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
            Administrative Info
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className={labelClass}>Invoice No</label>
              <input
                value={f.invoice_number}
                readOnly
                disabled
                className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
              />
            </div>
            <div>
              <label className={labelClass}>Branch</label>
              <input
                type="text"
                value={f.branch_label}
                readOnly
                disabled
                className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed font-medium`}
              />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <input
                value={f.collected_by_role_name}
                readOnly
                disabled
                className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
              />
            </div>
            <div>
              <label className={labelClass}>Collected By</label>
              <select
                value={f.collected_by_person_id}
                onChange={(e) =>
                  handleFieldChange("collected_by_person_id", e.target.value)
                }
                className={selectClass}
              >
                <option value="">Select Staff</option>
                {options.collectedByPersons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Shipment Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${cardClass} lg:col-span-2`}>
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
              Shipment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              <div>
                <label className={labelClass}>Shipping Method</label>
                <select
                  value={f.shipping_method_id}
                  onChange={(e) =>
                    handleFieldChange("shipping_method_id", e.target.value)
                  }
                  className={selectClass}
                >
                  <option value="">Select Method</option>
                  {options.shipmentMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Payment Method</label>
                <select
                  value={f.payment_method_id}
                  onChange={(e) =>
                    handleFieldChange("payment_method_id", e.target.value)
                  }
                  className={selectClass}
                >
                  <option value="">Select Payment</option>
                  {options.paymentMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Delivery Type</label>
                <select
                  value={f.delivery_type_id}
                  onChange={(e) =>
                    handleFieldChange("delivery_type_id", e.target.value)
                  }
                  className={selectClass}
                >
                  <option value="">Select Type</option>
                  {options.deliveryTypes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Tracking Code</label>
                <input
                  value={f.tracking_code}
                  onChange={(e) =>
                    handleFieldChange("tracking_code", e.target.value)
                  }
                  className={inputClass}
                  placeholder="N/A"
                />
              </div>
              <div>
                <label className={labelClass}>LRL Tracking</label>
                <input
                  value={f.lrl_tracking_code}
                  onChange={(e) =>
                    handleFieldChange("lrl_tracking_code", e.target.value)
                  }
                  className={inputClass}
                  placeholder="N/A"
                />
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
              Date & Time
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Booking Date</label>
                <input
                  type="date"
                  value={f.date}
                  onChange={(e) => handleFieldChange("date", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Time</label>
                <input
                  type="time"
                  value={f.time}
                  onChange={(e) => handleFieldChange("time", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`${cardClass} border-l-4 border-l-blue-500`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Sender</h3>
              <button
                type="button"
                onClick={() => setSenderModalOpen(true)}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
              >
                + NEW
              </button>
            </div>
            <label className={labelClass}>Select Sender</label>
            <select
              value={f.sender_id}
              onChange={(e) => handleFieldChange("sender_id", e.target.value)}
              className={selectClass}
            >
              <option value="">Search Sender...</option>
              {options.senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.contact_number}
                </option>
              ))}
            </select>
          </div>

          <div className={`${cardClass} border-l-4 border-l-green-500`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Receiver</h3>
              <button
                type="button"
                onClick={() => setReceiverModalOpen(true)}
                className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors"
              >
                + NEW
              </button>
            </div>
            <label className={labelClass}>Select Receiver</label>
            <select
              value={f.receiver_id}
              onChange={(e) => handleFieldChange("receiver_id", e.target.value)}
              className={selectClass}
            >
              <option value="">Search Receiver...</option>
              {options.receivers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.contact_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION 4: Cargo Items */}
        <div className={cardClass}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-gray-800">Boxes & Items</h3>
            <button
              type="button"
              onClick={addBox}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
            >
              Add New Box
            </button>
          </div>

          <div className="space-y-6">
            {f.items.map((box, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        Box
                      </span>
                      <input
                        value={box.box_number}
                        onChange={(e) =>
                          setBoxValue(i, "box_number", e.target.value)
                        }
                        className="w-10 text-center font-bold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 text-sm"
                      />
                    </div>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        Total KG
                      </span>
                      <input
                        type="number"
                        step="0.001"
                        value={box.box_weight}
                        onChange={(e) =>
                          setBoxValue(i, "box_weight", e.target.value)
                        }
                        className="w-20 text-right font-mono font-medium text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBox(i)}
                    className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded transition-colors"
                  >
                    REMOVE BOX
                  </button>
                </div>

                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-3 font-semibold w-1/2">
                          Description
                        </th>
                        <th className="px-5 py-3 font-semibold w-32 text-right">
                          Weight
                        </th>
                        <th className="px-5 py-3 font-semibold w-24 text-center">
                          Pieces
                        </th>
                        <th className="px-5 py-3 font-semibold w-16 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {box.items.map((item, j) => (
                        <tr
                          key={j}
                          className="group hover:bg-indigo-50/30 transition-colors"
                        >
                          <td className="px-5 py-2">
                            <input
                              ref={(el) =>
                                (itemInputRefs.current[`${i}-${j}`] = el)
                              }
                              value={item.name}
                              onChange={(e) =>
                                setItemValue(i, j, "name", e.target.value)
                              }
                              onKeyDown={(e) => handleItemKeyDown(e, i, j)}
                              className="w-full bg-transparent border-b border-gray-200 focus:border-indigo-500 focus:ring-0 px-0 py-1.5 outline-none text-gray-700 placeholder-gray-300 transition-all"
                              placeholder="Item name"
                            />
                          </td>
                          <td className="px-5 py-2">
                            <input
                              type="number"
                              step="0.001"
                              value={item.item_weight}
                              onChange={(e) =>
                                setItemValue(
                                  i,
                                  j,
                                  "item_weight",
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => handleItemKeyDown(e, i, j)}
                              className="w-full bg-transparent border-b border-gray-200 focus:border-indigo-500 focus:ring-0 px-0 py-1.5 outline-none text-right font-mono text-gray-700 transition-all"
                            />
                          </td>
                          <td className="px-5 py-2">
                            <input
                              type="number"
                              value={item.pieces}
                              onChange={(e) =>
                                setItemValue(i, j, "pieces", e.target.value)
                              }
                              onKeyDown={(e) => handleItemKeyDown(e, i, j)}
                              className="w-full bg-transparent border-b border-gray-200 focus:border-indigo-500 focus:ring-0 px-0 py-1.5 outline-none text-center text-gray-700 transition-all"
                            />
                          </td>
                          <td className="px-5 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(i, j)}
                              className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all shadow-sm group-hover:shadow-md"
                              title="Delete Item"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-gray-50/50 px-5 py-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => addItem(i)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline decoration-2 underline-offset-2 transition-all"
                    >
                      + ADD ITEM
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {f.items.length === 0 && (
              <div
                onClick={addBox}
                className="cursor-pointer border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
              >
                <span className="text-gray-500 font-medium">
                  No boxes added. Click to add the first box.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 5: Financials */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left: Remarks & Summary Inputs */}
          <div className="space-y-6">
            <div className={cardClass}>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Remarks</h3>
              <textarea
                rows={4}
                value={f.special_remarks}
                onChange={(e) =>
                  handleFieldChange("special_remarks", e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Any special instructions..."
              />
            </div>

            <div className={cardClass}>
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Calculations
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>VAT %</label>
                  <input
                    type="number"
                    value={f.vat_percentage}
                    onChange={(e) =>
                      handleFieldChange("vat_percentage", e.target.value)
                    }
                    className={`${inputClass} font-mono text-right`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Bill Charges (Auto)</label>
                  <input
                    type="text"
                    value={billCharges.toFixed(2)}
                    readOnly
                    className={`${inputClass} bg-gray-100 text-gray-500 font-mono text-right font-semibold`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Detailed Charges Table */}
          <div className={`${cardClass} flex flex-col h-full`}>
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
              Charges Breakdown
            </h3>
            <div className="flex-grow space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                <div className="col-span-5">Charge Type</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-3 text-right">Amount</div>
              </div>

              {CHARGE_KEYS.map((key) => (
                <div
                  key={key}
                  className="grid grid-cols-12 gap-2 items-center text-sm py-1 border-b border-gray-50 last:border-0"
                >
                  <div className="col-span-5 capitalize text-gray-700 font-medium">
                    {key.replace(/_/g, " ")}
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      className="w-full bg-gray-50 border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:bg-white rounded px-1.5 py-1 text-right outline-none transition-colors"
                      value={f[`quantity_${key}`]}
                      readOnly={key === "total_weight"}
                      onChange={(e) => {
                        const qty = n(e.target.value);
                        const rate = n(f[`unit_rate_${key}`]);
                        setForm((prev) => ({
                          ...prev,
                          [`quantity_${key}`]: qty,
                          [`amount_${key}`]: qty * rate,
                        }));
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      className="w-full bg-gray-50 border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:bg-white rounded px-1.5 py-1 text-right outline-none transition-colors"
                      value={f[`unit_rate_${key}`]}
                      onChange={(e) => {
                        const rate = n(e.target.value);
                        const qty = n(f[`quantity_${key}`]);
                        setForm((prev) => ({
                          ...prev,
                          [`unit_rate_${key}`]: rate,
                          [`amount_${key}`]: qty * rate,
                        }));
                      }}
                    />
                  </div>
                  <div className="col-span-3 text-right font-mono font-medium text-gray-800">
                    {n(f[`amount_${key}`]).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-gray-100 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
              <div className="flex justify-between items-center text-sm text-gray-500 mb-1">
                <span>Subtotal (Weight Charge)</span>
                <span className="font-mono">{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500 mb-1">
                <span>Bill Charges</span>
                <span className="font-mono">{billCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                <span>VAT ({n(f.vat_percentage)}%)</span>
                <span className="font-mono">{vatCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-2xl font-bold text-indigo-700 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{grandTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SenderModal
        open={senderModalOpen}
        onClose={() => setSenderModalOpen(false)}
        onCreated={(d) => handlePartyCreated(d, "sender")}
      />
      <ReceiverModal
        open={receiverModalOpen}
        onClose={() => setReceiverModalOpen(false)}
        onCreated={(d) => handlePartyCreated(d, "receiver")}
      />
    </div>
  );
}