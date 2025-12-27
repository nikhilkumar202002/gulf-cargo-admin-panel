// src/features/Cargo/CreateCargo.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useImmer } from "use-immer";
import { useSelector } from "react-redux";
import {
  unwrapArray,
  idOf,
  today,
  nowHi,
  pickBranchId,
  safeDecodeJwt,
  getBranchName,
  phoneFromParty,
  addressFromParty,
} from "../../utils/cargoHelpers";

// --- NEW SERVICES ---
import {
  createCargo,
  normalizeCargoToInvoice,
  getNextInvoiceNo,
} from "../../services/cargoService";

import {
  getShipmentMethods,
  getShipmentStatuses,
  getBranchUsers,
  getBranchById,
  getDeliveryTypes,
  getPaymentMethods,
  getCollectedBy,
} from "../../services/coreService";

import { getProfile } from "../../services/authService";
import { getPartiesByCustomerType } from "../../services/partyService";

import InvoiceModal from "../../features/Finance/Invoices/InvoiceModal";
import BillModal from "./components/BillModal";
import "./ShipmentStyles.css";
import SenderModal from "../CRM/modals/SenderModal";
import ReceiverModal from "../CRM/modals/ReceiverModal";
import { Toaster } from "react-hot-toast";
import { PageHeader } from "./components/PageHeader";
import { CollectionDetails } from "./components/CollectionDetails";
import { PartyInfo } from "./components/PartyInfo";
import { ShipmentDetails } from "./components/ShipmentDetails";
import { BoxesSection } from "./components/BoxesSection";
import { ChargesAndSummary } from "./components/ChargesAndSummary";

const DEFAULT_STATUS_ID = 13;
/* ---------- Initial Form ---------- */
const buildInitialForm = (branchId = "") => ({
  branchId: branchId ? String(branchId) : "",
  branchName: "",
  invoiceNo: "",
  senderId: "",
  senderAddress: "",
  senderPhone: "",
  receiverId: "",
  receiverAddress: "",
  receiverPhone: "",
  shippingMethodId: "",
  paymentMethodId: "",
  statusId: DEFAULT_STATUS_ID,
  date: today(),
  time: nowHi(),
  collectedByRoleId: "",
  collectedByRoleName: "",
  collectedByPersonId: "",
  lrlTrackingCode: "",
  deliveryTypeId: "",
  specialRemarks: "",
  vatPercentage: 0,
  charges: {
    total_weight: { qty: 0, rate: 0 },
    duty: { qty: 0, rate: 0 },
    packing_charge: { qty: 0, rate: 0 },
    additional_packing_charge: { qty: 0, rate: 0 },
    insurance: { qty: 0, rate: 0 },
    awb_fee: { qty: 0, rate: 0 },
    vat_amount: { qty: 0, rate: 0 },
    volume_weight: { qty: 0, rate: 0 },
    discount: { qty: 0, rate: 0 },
    other_charges: { qty: 0, rate: 0 },
    no_of_pieces: 0,
  },
});

/* ---------- Items Autosuggest options ---------- */
const itemOptions = [
  "Dates",
  "Almonds",
  "Cashew Nuts",
  "Walnuts",
  "Pistachios",
  "Raisins",
  "Dry Figs",
  "Peanuts",
  "Chocolates",
  "Biscuits",
  "Rice Bags",
  "Wheat Flour",
  "Sugar",
  "Cooking Oil",
  "Tea Powder",
  "Coffee Powder",
  "Spices (Cardamom, Cloves, Cinnamon)",
  "Soap",
  "Detergent Powder",
  "Shampoo Bottles",
  "Toothpaste",
  "Perfume Bottles",
  "Clothing",
  "Shoes",
  "Bags",
  "Blankets",
  "Towels",
  "Utensils",
  "Cookware",
  "Electronics (Mobile Phones, Tablets)",
  "Small Appliances (Mixers, Irons)",
  "Toys",
  "Stationery",
  "Books",
];

const incrementInvoiceString = (last = "") => {
  if (!last) return "BR:000001";
  const m = String(last).trim().match(/^(.*?)(\d+)$/);
  if (!m) return `${last}-000001`;
  const [, prefix, digits] = m;
  const next = String(Number(digits) + 1).padStart(digits.length, "0");
  return `${prefix}${next}`;
};

const getNumericPart = (invoiceNo) => {
  if (!invoiceNo) return 0;
  const match = String(invoiceNo).match(/\d+$/);
  return match ? parseInt(match[0], 10) : 0;
};

/* ---------------------- Component ---------------------- */
export default function CreateCargo() {
 const token = useSelector((s) => s.auth?.token);

  const [form, updateForm] = useImmer(buildInitialForm());
  const [options, setOptions] = useState({
    methods: [],
    statuses: [],
    senders: [],
    receivers: [],
    paymentMethods: [],
    deliveryTypes: [],
    collectRoles: [],
  });
  const [collectedByOptions, setCollectedByOptions] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceShipment, setInvoiceShipment] = useState(null);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billData, setBillData] = useState(null);
  const [senderOpen, setSenderOpen] = useState(false);
  const [receiverOpen, setReceiverOpen] = useState(false);
  const [boxes, updateBoxes] = useImmer([
    {
      box_number: "1",
      box_weight: 0,
      items: [{ name: "", pieces: 1, item_weight: 0 }],
    },
  ]);
  const [toast, setToast] = useState({ visible: false, text: "", variant: "success" });
  const toastTimer = useRef(null);
  const isLoadingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusTarget, setFocusTarget] = useState(null);

 const showToast = useCallback((text, variant = "success", duration = 3500) => {
      try { clearTimeout(toastTimer.current); } catch {}
      setToast({ visible: true, text, variant });
      toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), duration);
    }, []);

  const hideToast = useCallback(() => {
    try { clearTimeout(toastTimer.current); } catch {}
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  // --- Derived weights ---
const totalWeight = useMemo(() => {
    let sum = 0;
    for (const b of boxes) {
      const w = b.box_weight ?? b.weight ?? 0;
      sum += Number(w) || 0;
    }
    return Number(sum.toFixed(3));
  }, [boxes]);

  // --- money helpers ---
 const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(String(v).replace(/,/g, "")) || 0);
  const toMoney = useCallback((v) => num(v).toFixed(2), []);
  const tokenClaims = useMemo(() => safeDecodeJwt(token), [token]);
  const tokenBranchId = tokenClaims?.branch_id ?? tokenClaims?.branchId ?? null;


  // IMPORTANT: compute `derived` *before* using it anywhere else.
  const derived = useMemo(() => {

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

    const getRow = (key) => {
      const row = form?.charges?.[key] || { qty: 0, rate: 0 };
      const qty = key === "total_weight" ? Number(totalWeight || 0) : Number(row.qty || 0);
      const rate = Number(row.rate || 0);
      const amount = Number((qty * rate).toFixed(2));
      return { qty, rate, amount };
    };

 const rows = {};
    let totalAmount = 0;
    for (const k of CHARGE_KEYS) {
      rows[k] = getRow(k);
      totalAmount += k === "discount" ? -rows[k].amount : rows[k].amount;
    }
    const subtotal = rows.total_weight.amount;
    const billCharges =
      rows.duty.amount + rows.packing_charge.amount + rows.additional_packing_charge.amount +
      rows.insurance.amount + rows.awb_fee.amount + rows.vat_amount.amount +
      rows.volume_weight.amount + rows.other_charges.amount - rows.discount.amount;
    return { rows, subtotal: Number(subtotal.toFixed(2)), billCharges: Number(billCharges.toFixed(2)), totalAmount: Number(totalAmount.toFixed(2)) };
  }, [form?.charges, totalWeight]);

  // Values that depend on `derived` (no early access issues)
  const subtotal = derived.subtotal;
  const billCharges = derived.billCharges;
  const vatPercentage = Number(form.vatPercentage || 0);
  const vatCost = Number(((subtotal * vatPercentage) / 100).toFixed(2));
  const netTotal = derived.totalAmount;

  const itemInputRefs = useRef({});
useEffect(() => {
    if (focusTarget) {
      const { boxIndex, itemIndex, field } = focusTarget;
      const key = `${boxIndex}-${itemIndex}-${field}`;
      const el = itemInputRefs.current[key];
      if (el) el.focus();
      setFocusTarget(null);
    }
  }, [focusTarget]);
  // --- Effects ---
  useEffect(() => {
    if (msg.text) showToast(msg.text, msg.variant || "success");
  }, [msg.text, msg.variant, showToast]);

  useEffect(() => {
    updateForm((draft) => {
      draft.charges.no_of_pieces = boxes.length;
      if (draft.charges.total_weight) {
        draft.charges.total_weight.qty = totalWeight;
      }
    });
  }, [boxes.length, totalWeight, updateForm]);

  // Cache helpers
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  const getCache = (key) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() - parsed.timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  };

  const setCache = (key, data) => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch {
      // Ignore if storage is full
    }
  };

  // ---------- INITIAL DATA LOADING ----------
  const loadInitialData = useCallback(async () => {
    if (isLoadingRef.current) return; // Prevent multiple simultaneous loads
    isLoadingRef.current = true;
    try {
      setLoading(true);

      // Check cache for essential data
      const cachedProfile = getCache("cargo_profile");
      const cachedMethods = getCache("cargo_methods");
      const cachedStatuses = getCache("cargo_statuses");
      const cachedPaymentMethods = getCache("cargo_payment_methods");
      const cachedSenders = getCache("cargo_senders");
      const cachedReceivers = getCache("cargo_receivers");
      const cachedDeliveryTypes = getCache("cargo_delivery_types");

      // 🟢 STAGE 1: Fetch essential base data (use cache if available)
      const [
        profileRes,
        methodsRes,
        statusesRes,
        paymentMethodsRes,
        sendersRes,
        receiversRes,
        deliveryTypesRes,
      ] = await Promise.all([
        cachedProfile
          ? Promise.resolve(cachedProfile)
          : getProfile().catch(
              (e) => (console.warn("Profile failed:", e), null)
            ),
        cachedMethods
          ? Promise.resolve(cachedMethods)
          : getShipmentMethods().catch(
              (e) => (console.warn("Methods failed:", e), [])
            ),
        cachedStatuses
          ? Promise.resolve(cachedStatuses)
          : getShipmentStatuses().catch(
              (e) => (console.warn("Statuses failed:", e), [])
            ),
        cachedPaymentMethods
          ? Promise.resolve(cachedPaymentMethods)
          : getPaymentMethods().catch(
              (e) => (console.warn("Payment methods failed:", e), [])
            ),
        cachedSenders
          ? Promise.resolve(cachedSenders)
          : getPartiesByCustomerType(1).catch(
              (e) => (console.warn("Senders failed:", e), [])
            ),
        cachedReceivers
          ? Promise.resolve(cachedReceivers)
          : getPartiesByCustomerType(2).catch(
              (e) => (console.warn("Receivers failed:", e), [])
            ),
        cachedDeliveryTypes
          ? Promise.resolve(cachedDeliveryTypes)
          : getDeliveryTypes().catch(
              (e) => (console.warn("Delivery types failed:", e), [])
            ),
      ]);

      // Cache fresh data
      if (!cachedProfile && profileRes) setCache("cargo_profile", profileRes);
      if (!cachedMethods && methodsRes) setCache("cargo_methods", methodsRes);
      if (!cachedStatuses && statusesRes)
        setCache("cargo_statuses", statusesRes);
      if (!cachedPaymentMethods && paymentMethodsRes)
        setCache("cargo_payment_methods", paymentMethodsRes);
      if (!cachedSenders && sendersRes) setCache("cargo_senders", sendersRes);
      if (!cachedReceivers && receiversRes)
        setCache("cargo_receivers", receiversRes);
      if (!cachedDeliveryTypes && deliveryTypesRes)
        setCache("cargo_delivery_types", deliveryTypesRes);

      const profile = profileRes?.data ?? profileRes ?? null;
      setUserProfile(profile);

      // FORCE tokenBranchId if available to prevent wrong branch selection for staff
      const preferredBranchId = tokenBranchId ?? pickBranchId(profile) ?? "";
      const branchName = getBranchName(profile);

      // 🟡 STAGE 2: Branch-dependent data
     const [branchRes, nextInvoiceRes, staffRes, collectRolesRes] = await Promise.all([
        preferredBranchId ? getBranchById(preferredBranchId) : null,
        preferredBranchId ? getNextInvoiceNo(preferredBranchId) : null,
        preferredBranchId ? getBranchUsers(preferredBranchId) : [],
        getCollectedBy(),
      ]);

      const branch = branchRes?.branch ?? branchRes?.data?.branch ?? branchRes;
      const methods = unwrapArray(methodsRes);
      const statuses = unwrapArray(statusesRes);
      const paymentMethods = unwrapArray(paymentMethodsRes);
      const senders = unwrapArray(sendersRes?.data ?? sendersRes);
      const receivers = unwrapArray(receiversRes?.data ?? receiversRes);
      const deliveryTypes = unwrapArray(deliveryTypesRes);

      // Clear cache if fetched data is empty to force fresh fetch next time
      if (!cachedProfile && (!profileRes || !profileRes?.data))
        localStorage.removeItem("cargo_profile");
      if (!cachedMethods && methods.length === 0)
        localStorage.removeItem("cargo_methods");
      if (!cachedStatuses && statuses.length === 0)
        localStorage.removeItem("cargo_statuses");
      if (!cachedPaymentMethods && paymentMethods.length === 0)
        localStorage.removeItem("cargo_payment_methods");
      if (!cachedSenders && senders.length === 0)
        localStorage.removeItem("cargo_senders");
      if (!cachedReceivers && receivers.length === 0)
        localStorage.removeItem("cargo_receivers");
      if (!cachedDeliveryTypes && deliveryTypes.length === 0)
        localStorage.removeItem("cargo_delivery_types");
      const staffList = unwrapArray(staffRes);

      // --- Compute Invoice Number Logic (FIXED) ---
      const branchCode = branch?.branch_code || "";
      const startNumber = Number(branch?.start_number || 0);
      
      // Get the number from API, regardless of what prefix it sent
      const apiNumber = getNumericPart(nextInvoiceRes);
      
      // Determine the highest number
      const currentHighest = Math.max(startNumber, apiNumber);
      
      // Construct the invoice number using the CURRENT BRANCH CODE specifically
      // This prevents "JED:..." from appearing if branch is "RUH"
      let invoiceNo = "";
      if (branchCode) {
        invoiceNo = `${branchCode}:${String(currentHighest).padStart(6, "0")}`;
      } else {
        // Fallback for missing branch code
        invoiceNo = String(currentHighest).padStart(6, "0");
      }

      // --- Set form defaults
      updateForm((draft) => {
        draft.branchId = String(preferredBranchId);
        draft.branchName = branchName;
        draft.invoiceNo = invoiceNo;

        if (methods.length > 0)
          draft.shippingMethodId = String(idOf(methods[0]));
        if (paymentMethods.length > 0)
          draft.paymentMethodId = String(idOf(paymentMethods[0]));

        const officeRole = { id: "", name: "" }; // placeholder, real roles come later
        draft.collectedByRoleId = officeRole.id;
        draft.collectedByRoleName = officeRole.name;
      });

      // --- Set stage-1 options
      setOptions((prev) => ({
        ...prev,
        methods,
        statuses,
        paymentMethods,
        senders,
        receivers,
        deliveryTypes,
      }));
      setCollectedByOptions(staffList);

      // 🟣 STAGE 3: Background fetch for secondary lists
      Promise.all([
        getCollectedBy().catch(
          (e) => (console.warn("Roles failed:", e), [])
        ),
      ]).then(([rolesRes]) => {
        const roles = Array.isArray(rolesRes?.data)
          ? rolesRes.data
          : unwrapArray(rolesRes);

        setOptions((prev) => ({
          ...prev,
          collectRoles: roles,
        }));

        // Fill remaining form defaults once roles arrive
        updateForm((draft) => {
          const officeRole = roles.find((r) => r.name === "Office");
          const loggedInUserId = profile?.user?.id ?? profile?.id ?? null;
          if (officeRole && loggedInUserId) {
            draft.collectedByRoleId = String(officeRole.id);
            draft.collectedByRoleName = officeRole.name;
            draft.collectedByPersonId = String(loggedInUserId);
          }
        });
      });

    } catch (err) {
      console.error("Initial data load failed:", err);
      setMsg({ text: "Failed to load initial data.", variant: "error" });
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [tokenBranchId, updateForm]);

  useEffect(() => {
    let alive = true;
    const fetchData = async () => {
      if (!alive) return;
      setMsg({ text: "", variant: "" });
      await loadInitialData();
    };
    fetchData();

    const handleVisibilityChange = () => {
      if (alive && document.visibilityState === "visible") {
        loadInitialData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadInitialData]);

  const onRoleChange = useCallback(
    async (e) => {
      const roleId = e.target.value; // This is a string
      const role = options.collectRoles.find((r) => String(r.id) === roleId);
      const roleName = role?.name || "";
      updateForm((draft) => {
        draft.collectedByRoleId = roleId;
        draft.collectedByRoleName = roleName;
        draft.collectedByPersonId = "";
      });

      try {
        if (roleName === "Driver") {
          const cacheKey = `cargo_drivers_${form.branchId || tokenBranchId}`;
          const cachedDrivers = getCache(cacheKey);
          if (cachedDrivers) {
            setCollectedByOptions(cachedDrivers);
          } else {
            const res = await getActiveDrivers();
            const drivers = unwrapArray(res);
            setCollectedByOptions(drivers);
            setCache(cacheKey, drivers);
          }
        } else if (roleName === "Office") {
          const cacheKey = `cargo_staff_${form.branchId || tokenBranchId}`;
          const cachedStaff = getCache(cacheKey);
          if (cachedStaff) {
            setCollectedByOptions(cachedStaff);
            // Auto-select the current user if they are in the list
            const loggedInUserId =
              userProfile?.user?.id ?? userProfile?.id ?? null;
            const userInStaffList = cachedStaff.find(
              (staff) => String(staff.id) === String(loggedInUserId)
            );
            if (userInStaffList) {
              updateForm((draft) => {
                draft.collectedByPersonId = String(loggedInUserId);
              });
            }
          } else {
            const staffRes = await getBranchUsers(
              form.branchId || tokenBranchId
            );
            const staffList = unwrapArray(staffRes);
            setCollectedByOptions(staffList);
            setCache(cacheKey, staffList);

            // Auto-select the current user if they are in the list
            const loggedInUserId =
              userProfile?.user?.id ?? userProfile?.id ?? null;
            const userInStaffList = staffList.find(
              (staff) => String(staff.id) === String(loggedInUserId)
            );
            if (userInStaffList) {
              updateForm((draft) => {
                draft.collectedByPersonId = String(loggedInUserId);
              });
            }
          }
        } else {
          setCollectedByOptions([]);
        }
      } catch {
        setCollectedByOptions([]);
        setMsg({
          text: "Failed to load list for the selected role.",
          variant: "error",
        });
      }
    },
    [
      options.collectRoles,
      updateForm,
      form.branchId,
      tokenBranchId,
      userProfile,
    ]
  );

  /* ---------- BOX HELPERS ---------- */
  const getNextBoxNumber = useCallback(() => {
    const nums = boxes
      .map((b) => Number(b.box_number))
      .filter((n) => Number.isFinite(n));
    return nums.length
      ? String(Math.max(...nums) + 1)
      : String(boxes.length + 1);
  }, [boxes]);

const addBox = useCallback(() => {
    // 🛑 VALIDATION: Max 45 items check
    const currentTotal = boxes.reduce((sum, b) => sum + (b.items?.length || 0), 0);
    if (currentTotal >= 45) {
      showToast("45 items exceeded. Only 45 items allowed per invoice.", "error");
      return;
    }

    const nextNo = getNextBoxNumber();
    updateBoxes((draft) => {
      draft.push({
        box_number: nextNo,
        box_weight: 0,
        items: [{ name: "", pieces: 1, item_weight: 0 }],
      });
    });
  }, [getNextBoxNumber, updateBoxes, boxes, showToast]);

  const removeBox = useCallback(
    (boxIndex) => {
      if (boxes.length <= 1) return;
      updateBoxes((draft) => {
        draft.splice(boxIndex, 1);
      });
    },
    [boxes.length, updateBoxes]
  );

  const setBoxWeight = useCallback(
    (boxIndex, val) => {
      updateBoxes((draft) => {
        const box = draft[boxIndex];
        if (!box) return;
        const n = Number.parseFloat(val);
        box.box_weight = Number.isFinite(n) ? Math.max(0, n) : 0;
      });
    },
    [updateBoxes]
  );

const addItemToBox = useCallback(
    (boxIndex) => {
      // 🛑 VALIDATION: Max 45 items check
      const currentTotal = boxes.reduce((sum, b) => sum + (b.items?.length || 0), 0);
      if (currentTotal >= 45) {
        showToast("45 items exceeded. Only 45 items allowed per invoice.", "error");
        return;
      }

      updateBoxes((draft) => {
        draft[boxIndex]?.items.push({ name: "", pieces: 1, item_weight: 0 });
      });
    },
    [updateBoxes, boxes, showToast]
  );

  const removeItemFromBox = useCallback(
    (boxIndex, itemIndex) => {
      if (boxes[boxIndex]?.items.length <= 1) {
        showToast("At least one item per box is required", "error");
        return;
      }
      updateBoxes((draft) => {
        draft[boxIndex]?.items.splice(itemIndex, 1);
      });
    },
    [boxes, showToast, updateBoxes]
  );

  const setBoxItem = useCallback(
    (boxIdx, itemIdx, key, val) => {
      updateBoxes((draft) => {
        const it = draft?.[boxIdx]?.items?.[itemIdx];
        if (!it) return;
        if (key === "pieces") {
          const n = Number.parseInt(val || 0, 10);
          it.pieces = Number.isNaN(n) ? 0 : Math.max(0, n);
        } else if (key === "name") {
          it.name = val;
        } else if (key === "item_weight") {
          const n = Number.parseFloat(val);
          it.item_weight = Number.isFinite(n) ? Math.max(0, n) : 0;
        }
      });
    },
    [updateBoxes]
  );

  const handleItemKeyDown = useCallback(
    (e, boxIndex) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        addItemToBox(boxIndex);
        const nextItemIndex = boxes[boxIndex].items.length;
        setFocusTarget({ boxIndex, itemIndex: nextItemIndex, field: 'name' });
      }
    },
    [addItemToBox, boxes]
  );

  /* selected parties + sync to form */
  const selectedSender = useMemo(
    () =>
      options.senders.find((s) => String(idOf(s)) === String(form.senderId)) ||
      null,
    [options.senders, form.senderId]
  );
  const selectedReceiver = useMemo(
    () =>
      options.receivers.find(
        (r) => String(idOf(r)) === String(form.receiverId)
      ) || null,
    [options.receivers, form.receiverId]
  );

  useEffect(() => {
    updateForm((draft) => {
      draft.senderAddress = addressFromParty(selectedSender) || "";
      draft.senderPhone = phoneFromParty(selectedSender) || "";
      draft.receiverAddress = addressFromParty(selectedReceiver) || "";
      draft.receiverPhone = phoneFromParty(selectedReceiver) || "";
    });
  }, [selectedSender, selectedReceiver, updateForm]);

  /* validation */
  const validateBeforeSubmit = useCallback(() => {
    const missing = [];
    if (!form.branchId) missing.push("Branch");
    if (!form.senderId) missing.push("Sender");
    if (!form.receiverId) missing.push("Receiver");
    if (!form.shippingMethodId) missing.push("Shipping Method");
    if (!form.paymentMethodId) missing.push("Payment Method");
    if (!form.statusId) missing.push("Status");
    if (!form.deliveryTypeId) missing.push("Delivery Type");
    if (!form.date) missing.push("Date");
    if (!form.time) missing.push("Time");
    if (!form.collectedByRoleId || !form.collectedByRoleName)
      missing.push("Collected By (Role)");
    if (!form.collectedByPersonId) missing.push("Collected By (Person)");
    const anyInvalid = boxes.some((b) => {
      const n = Number(b.box_weight ?? b.weight ?? 0);
      return !Number.isFinite(n) || n < 0;
    });
    if (anyInvalid) missing.push("Each box weight must be a number (≥ 0)");
    return missing;
  }, [form, boxes]);

const softResetForNext = useCallback((branchId, nextInvoiceNo) => {
      // 1. Get current dropdown options from state
      const { collectRoles, methods, paymentMethods, deliveryTypes } = options;
      const profile = userProfile;

      updateForm((draft) => {
        // 2. Start with a fresh form
        const newForm = buildInitialForm(branchId);
        
        // 3. Keep critical fields
        newForm.invoiceNo = nextInvoiceNo || "BR:000001";
        newForm.branchId = String(branchId);
        newForm.branchName = draft.branchName; 

        // --- ⚡️ FORCE DEFAULTS IMMEDIATELY (Fixes Empty Selects) ---
        
        // Shipping Method: Look for "IND SEA", fallback to first option
        const defMethod = methods.find(m => (m.name || "").toUpperCase().includes("IND SEA")) || methods[0];
        if (defMethod) newForm.shippingMethodId = String(idOf(defMethod));

        // Payment Method: Look for "CASH", fallback to first option
        const defPayment = paymentMethods.find(p => (p.name || "").toUpperCase().includes("CASH")) || paymentMethods[0];
        if (defPayment) newForm.paymentMethodId = String(idOf(defPayment));

        // Delivery Type: Look for "DOOR", fallback to first option
        const defDelivery = deliveryTypes.find(d => (d.name || "").toUpperCase().includes("DOOR")) || deliveryTypes[0];
        if (defDelivery) newForm.deliveryTypeId = String(idOf(defDelivery));

        // Collected By: Restore "Office" + Current User
        const officeRole = collectRoles.find((r) => r.name === "Office");
        const loggedInUserId = profile?.user?.id ?? profile?.id ?? null;
        if (officeRole && loggedInUserId) {
          newForm.collectedByRoleId = String(officeRole.id);
          newForm.collectedByRoleName = officeRole.name;
          newForm.collectedByPersonId = String(loggedInUserId);
        }
        
        return newForm;
      });

      // 4. Reset boxes
      updateBoxes([{ box_number: "1", box_weight: 0, items: [{ name: "", pieces: 1, item_weight: 0 }] }]);
      
  }, [updateForm, updateBoxes, options, userProfile]); // ✅ Added 'options' and 'userProfile' dependencies/ ✅ Added 'options' to dependency array

  const onResetClick = useCallback(() => {
    const nextBranchId = form.branchId || tokenBranchId || "";
    updateForm(buildInitialForm(nextBranchId));
    setCollectedByOptions([]);
    updateBoxes([
      {
        box_number: "1",
        box_weight: 0,
        items: [{ name: "", pieces: 1, item_weight: 0 }],
      },
    ]);
    setInvoiceShipment(null);
    showToast("Form reset.", "success");
  }, [form.branchId, tokenBranchId, showToast, updateForm, updateBoxes]);

  const handleChargeChange = useCallback(
    (key, field, value) => {
      updateForm((draft) => {
        if (draft.charges[key]) {
          if (field === "qty" && key !== "total_weight") {
            draft.charges[key].qty = Number(value || 0);
          } else if (field === "rate") {
            draft.charges[key].rate = Number(value || 0);
          }
        }
      });
    },
    [updateForm]
  );

  const handlePrint = () => {
    const payload = buildCargoPayload(form, boxes, derived, options.methods);

    // The invoice component needs sender/receiver names, which might not be in the payload.
    // We'll merge them from the form state and the fetched details to ensure they appear on the invoice.
    const dataForInvoice = {
      ...payload,
      sender: selectedSender, // Use the full sender object
      receiver: selectedReceiver, // Use the full receiver object
      sender_name: selectedSender?.name || form.sender_name || "",
      receiver_name: selectedReceiver?.name || form.receiver_name || "",
      sender_address: form.senderAddress || "",
      receiver_address: form.receiverAddress || "",
      sender_phone: form.senderPhone || "",
      receiver_phone: form.receiverPhone || "",
      collected_by_person: collectedBy?.full_name || collectedBy?.staff_name || collectedBy?.name || form.collected_by_person || "",
      branch_name: form.branchName,
      shipping_method: getShipmentMethodName(form.shippingMethodId, options.methods),
      payment_method: options.paymentMethods.find(m => String(m.id) === String(form.paymentMethodId))?.name || "",
    };

    setBillData(dataForInvoice);
    setBillModalOpen(true);
  };

  const getShipmentMethodName = (methodId, methods) => {
    const method = methods.find((m) => String(m.id) === String(methodId));
    return method?.name || "";
  };

  const buildCargoPayload = (
    currentForm,
    currentBoxes,
    derivedValues,
    shipmentMethods = []
  ) => {
    const { subtotal, billCharges, totalAmount, rows: R } = derivedValues;
    const totalWeightVal = Number(totalWeight.toFixed(3));
    const vatPercentageVal = Number(currentForm.vatPercentage || 0);
    const vatCostVal = Number(((subtotal * vatPercentageVal) / 100).toFixed(2));

    const flatItems = [];
    currentBoxes.forEach((box, bIdx) => {
      const bn = String(box.box_number ?? bIdx + 1);
      // Removed the logic that forced box weight onto the first item
      const list =
        Array.isArray(box.items) && box.items.length
          ? box.items
          : [{ name: "", pieces: 0, item_weight: 0 }];
      
      list.forEach((it, i) => {
        const name =
          (it.name && String(it.name).trim()) || `Box ${bn} contents`;
        const pcs = Number.isFinite(Number(it.pieces)) ? Number(it.pieces) : 0;
        const w = Number(it.item_weight ?? 0); // Use item weight specifically

        flatItems.push({
          slno: String(i + 1),
          box_number: bn,
          name,
          piece_no: String(pcs),
          unit_price: "0.00",
          total_price: "0.00",
          weight: w.toFixed(3), // CORRECTED: Now using item weight directly
        });
      });
    });

    const boxWeights = [...currentBoxes]
      .sort((a, b) => Number(a.box_number ?? 0) - Number(b.box_number ?? 0))
      .map((box) => {
        const w = Number(box.box_weight ?? box.weight ?? 0);
        const wn = Number.isFinite(w) ? Math.max(0, w) : 0;
        return wn.toFixed(3);
      });

    const methodName = getShipmentMethodName(
      currentForm.shippingMethodId,
      shipmentMethods
    );
    return {
      branch_id: Number(currentForm.branchId),
      booking_no: currentForm.invoiceNo,
      sender_id: Number(currentForm.senderId),
      receiver_id: Number(currentForm.receiverId),
      shipping_method_id: Number(currentForm.shippingMethodId),
      payment_method_id: Number(currentForm.paymentMethodId),
      status_id: Number(currentForm.statusId || DEFAULT_STATUS_ID),
      date: currentForm.date,
      time: currentForm.time,
      collected_by: currentForm.collectedByRoleName || "",
      collected_by_id: Number(currentForm.collectedByRoleId),
      name_id: Number(currentForm.collectedByPersonId),
      lrl_tracking_code: currentForm.lrlTrackingCode || null,
      delivery_type_id: Number(currentForm.deliveryTypeId),
      special_remarks: currentForm.specialRemarks || null,
      items: flatItems,
      method: methodName,
      total_cost: +subtotal.toFixed(2),
      vat_percentage: +vatPercentageVal.toFixed(2),
      vat_cost: +vatCostVal.toFixed(2),
      net_total: +totalAmount.toFixed(2),
      total_weight: totalWeightVal,
      box_weight: boxWeights,
      boxes: {}, // Simplified, as ordered was not used elsewhere
      quantity_total_weight: R.total_weight.qty,
      unit_rate_total_weight: R.total_weight.rate,
      amount_total_weight: R.total_weight.amount,
      quantity_duty: R.duty.qty,
      unit_rate_duty: R.duty.rate,
      amount_duty: R.duty.amount,
      quantity_packing_charge: R.packing_charge.qty,
      unit_rate_packing_charge: R.packing_charge.rate,
      amount_packing_charge: R.packing_charge.amount,
      quantity_additional_packing_charge: R.additional_packing_charge.qty,
      unit_rate_additional_packing_charge: R.additional_packing_charge.rate,
      amount_additional_packing_charge: R.additional_packing_charge.amount,
      quantity_insurance: R.insurance.qty,
      unit_rate_insurance: R.insurance.rate,
      amount_insurance: R.insurance.amount,
      quantity_awb_fee: R.awb_fee.qty,
      unit_rate_awb_fee: R.awb_fee.rate,
      amount_awb_fee: R.awb_fee.amount,
      quantity_vat_amount: R.vat_amount.qty,
      unit_rate_vat_amount: R.vat_amount.rate,
      amount_vat_amount: R.vat_amount.amount,
      quantity_volume_weight: R.volume_weight.qty,
      unit_rate_volume_weight: R.volume_weight.rate,
      amount_volume_weight: R.volume_weight.amount,
      quantity_other_charges: R.other_charges.qty,
      unit_rate_other_charges: R.other_charges.rate,
      amount_other_charges: R.other_charges.amount,
      quantity_discount: R.discount.qty,
      unit_rate_discount: R.discount.rate,
      amount_discount: R.discount.amount,
      bill_charges: +billCharges.toFixed(2),
      total_amount: totalAmount,
      no_of_pieces: Number(currentForm.charges.no_of_pieces || 0),
    };
  };

  const submit = useCallback(async (e) => {
      e.preventDefault();
      const missing = validateBeforeSubmit();
      if (missing.length) { 
        setMsg({ text: `Missing: ${missing.join(", ")}`, variant: "error" }); 
        return; 
      }

      // 1. Build Payload from Form State
      const payload = buildCargoPayload(form, boxes, derived, options.methods);
      
      try {
        setIsSubmitting(true);
        
        // 2. Re-check Invoice Number (Concurrency Safety)
        const freshBookingNo = await getNextInvoiceNo(form.branchId).catch(() => null);
        if (freshBookingNo) {
             let validatedBookingNo = freshBookingNo;
             const currentBranchCode = form.invoiceNo.split(':')[0];
             // Preserve branch prefix if present
             if (currentBranchCode && currentBranchCode.length >= 2 && !freshBookingNo.includes(':')) {
                 const numPart = getNumericPart(freshBookingNo);
                 validatedBookingNo = `${currentBranchCode}:${String(numPart).padStart(6, "0")}`;
             }
             payload.booking_no = validatedBookingNo;
        }

        const res = await createCargo(payload);
        const normalized = normalizeCargoToInvoice({ ...payload, ...res });
        if (!normalized.boxes || Object.keys(normalized.boxes).length === 0) {
           normalized.boxes = {};
           boxes.forEach((b, idx) => {
              const bn = String(b.box_number || idx + 1);
              normalized.boxes[bn] = {
                 ...b,
                 box_weight: b.box_weight, 
                 items: b.items
              };
           });
        }

        // Ensure booking number is visible
        if (!normalized.booking_no) {
            normalized.booking_no = payload.booking_no;
        }
        
        // 5. Show Invoice
        setInvoiceShipment(normalized);
        setInvoiceOpen(true);

        // 6. Reset Form for Next Entry
        const savedNo = res?.booking_no || payload.booking_no;
        const nextNo = incrementInvoiceString(savedNo);
        softResetForNext(form.branchId, nextNo);
        
        showToast("Cargo created. Invoice ready.", "success");

      } catch (e2) {
        console.error("Create failed", e2);
        setMsg({ text: e2.message || "Failed to create cargo.", variant: "error" });
      } finally {
        setIsSubmitting(false);
      }
    }, [form, validateBeforeSubmit, softResetForNext, derived, boxes, options.methods]);

  useEffect(() => {
    if (!invoiceOpen || !invoiceShipment?.booking_no) return;
    const prev = document.title;
    document.title = String(invoiceShipment.booking_no).replace(
      /[\\/:*?"<>|]/g,
      "-"
    );
    const restore = () => {
      document.title = prev;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("afterprint", restore);
      document.title = prev;
    };
  }, [invoiceOpen, invoiceShipment?.booking_no]);

const reloadParties = useCallback(async () => {
    try {
      const [sendersRes, receiversRes] = await Promise.all([
        getPartiesByCustomerType(1),
        getPartiesByCustomerType(2),
      ]);

      const senders = unwrapArray(sendersRes?.data ?? sendersRes);
      const receivers = unwrapArray(receiversRes?.data ?? receiversRes);

      // --- FIX 1: Update the Cache so reloads work ---
      setCache("cargo_senders", senders);
      setCache("cargo_receivers", receivers);

      setOptions((prev) => ({
        ...prev,
        senders,
        receivers,
      }));

      return { senders, receivers };
    } catch (err) {
      console.error("reloadParties error:", err);
      showToast("Failed to refresh parties", "error");
      return null;
    }
  }, [showToast]); // Remove setCache from dependencies as it is likely stable or non-dep

const onPartyCreated = useCallback(
    async (created, role) => {
      const newParty =
        created?.party ||
        created?.data?.party ||
        created?.data ||
        created;
      if (!newParty?.id) {
        showToast("Party creation failed — invalid response", "error");
        return;
      }

      const newId = String(newParty.id);
      const normalizedParty = {
        id: newId,
        name: newParty.name || newParty.full_name || "Unnamed",
        address: newParty.address || "",
        phone: newParty.phone || "",
        ...newParty,
      };

      // 1️⃣ Optimistic Update: Instantly show it in the list so the UI feels fast
      setOptions((prev) => {
        const key = role === "sender" ? "senders" : "receivers";
        const list = prev[key] || [];
        // Prevent duplicate if user clicks fast, though unlikely here
        if (list.some((p) => String(p.id) === newId)) return prev;

        return {
          ...prev,
          [key]: [normalizedParty, ...list],
        };
      });

      // 2️⃣ Instantly select it in the form
      updateForm((draft) => {
        if (role === "sender") {
          draft.senderId = newId;
          draft.senderAddress = normalizedParty.address;
          draft.senderPhone = normalizedParty.phone;
        } else {
          draft.receiverId = newId;
          draft.receiverAddress = normalizedParty.address;
          draft.receiverPhone = normalizedParty.phone;
        }
      });

      // 3️⃣ Close the modal
      if (role === "sender") setSenderOpen(false);
      else setReceiverOpen(false);

      showToast(
        `${role === "sender" ? "Sender" : "Receiver"} added successfully.`,
        "success"
      );

      // 4️⃣ Background Refresh (FIX 2: Just call reload. Do NOT merge manually again)
      // The reloadParties function now updates the state AND the cache correctly.
      await reloadParties(); 
    },
    [reloadParties, updateForm, showToast, setOptions]
  );
// Total Boxes
const totalBoxes = boxes.length;

// Total Items across all boxes
const totalItems = boxes.reduce(
  (sum, b) => sum + (b.items?.length || 0),
  0
);

  /* ---------------------- UI ---------------------- */
  return (
    <>
      {/* Toast */}
      <div
        className="fixed top-4 right-4 z-50"
        style={{
          transform: toast.visible ? "translateX(0)" : "translateX(120%)",
          transition: "transform 300ms ease",
        }}
      >
        <div
          className={`min-w-[260px] max-w-[360px] rounded-xl border px-2 py-2 shadow ${
            toast.variant === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 text-sm">{toast.text}</div>
            <button
              type="button"
              onClick={hideToast}
              className="ml-2 text-xs opacity-70 hover:opacity-100"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-screen">
        <div className="w-full max-w-6xl mx-auto bg-white md:rounded-2xl rounded-none">
          <div>
            <div className="flex gap-6 text-right text-sm text-slate-500">
              <div>
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div>{new Date().toLocaleTimeString()}</div>
            </div>
            <PageHeader title="Create Cargo" />
          </div>
            <form
              onSubmit={submit}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  e.target.tagName.toLowerCase() !== "textarea"
                ) {
                  e.preventDefault();
                }
              }}
              className="space-y-6"
            >
              <CollectionDetails
                form={form}
                onRoleChange={onRoleChange}
                updateForm={updateForm}
                collectedByOptions={collectedByOptions}
                collectRoles={options.collectRoles}
              />
              <PartyInfo
                form={form}
                updateForm={updateForm}
                options={options}
                loading={loading}
                onSenderAdd={() => setSenderOpen(true)}
                onReceiverAdd={() => setReceiverOpen(true)}
                selectedSender={selectedSender}
                selectedReceiver={selectedReceiver}
              />
              <ShipmentDetails
                form={form}
                updateForm={updateForm}
                options={options}
                loading={loading}
              />
              {/* <ScheduleDetails form={form} updateForm={updateForm} /> */}
              <BoxesSection
                boxes={boxes}
                addBox={addBox}
                removeBox={removeBox}
                setBoxWeight={setBoxWeight}
                addItemToBox={addItemToBox}
                removeItemFromBox={removeItemFromBox}
                setBoxItem={setBoxItem}
                onItemKeyDown={handleItemKeyDown}
                itemOptions={itemOptions}
                itemRefs={itemInputRefs}
                setFocusTarget={setFocusTarget}
              />
              <ChargesAndSummary
                form={form}
                updateForm={updateForm}
                onChargeChange={handleChargeChange}
                totalWeight={totalWeight}
                derived={derived}
                subtotal={subtotal}
                billCharges={billCharges}
                vatCost={vatCost}
                netTotal={netTotal}
                toMoney={toMoney}
              />
              {/* Add Box + Actions */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="cargo-add-box-btn">
                  <div className="cargo-items-counter">
                    <h3>{totalItems}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addBox}
                    title="Add a new box; box number will auto-increment"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
                  >
                    + Add Box
                  </button>
                </div>
                <div className="flex items-center justify-end gap-3">
                  {/* <button
                    type="button"
                    onClick={handlePrint}
                    className="mr-auto border px-4 py-2 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100"
                  >
                    Print Invoice
                  </button> */}
                  <button
                    type="button"
                    onClick={onResetClick}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-slate-800 hover:bg-slate-200"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`rounded-lg px-4 py-2 text-white ${
                      isSubmitting
                        ? "bg-slate-400"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {isSubmitting ? "Saving..." : "Save & Generate Invoice"}
                  </button>
                </div>
              </div>
            </form>
        </div>
      </div>
      <Toaster position="top-right" />
      <SenderModal
        open={senderOpen}
        onClose={() => setSenderOpen(false)}
        onCreated={(data) => onPartyCreated(data, "sender")}
      />
      <ReceiverModal
        open={receiverOpen}
        onClose={() => setReceiverOpen(false)}
        onCreated={(data) => onPartyCreated(data, "receiver")}
      />
      <InvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        shipment={invoiceShipment}
      />
      <BillModal
        open={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        shipment={billData}
      />
    </>
  );
}