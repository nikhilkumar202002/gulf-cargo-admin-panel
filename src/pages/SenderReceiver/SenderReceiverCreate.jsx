// src/pages/SenderReceiver/SenderReceiverCreate.jsx
import React from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { FaUserTie } from "react-icons/fa";

/* APIs */
import { getProfile } from "../../api/accountApi";
import { getDocumentTypes } from "../../api/documentTypeApi";
import {
  getCountries,
  getStatesByCountry,
  getDistrictsByState
} from "../../api/worldApi";
import { getPhoneCodes } from "../../api/phoneCodeApi";
import { createParty } from "../../api/partiesApi";

/* Components */
import CreateReceiverSenderModal from "../../components/CreateReceiverSenderModal";
import ErrorBoundary from "../../components/ErrorBoundary";

/* Styles */
import "./CustomerStyles.css";

/* ---------------- constants / utils ---------------- */
const fieldBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring";
const fieldDisabled = "disabled:cursor-not-allowed disabled:bg-slate-50";

const labelOf = (obj) =>
  obj?.name ?? obj?.country ?? obj?.state ?? obj?.district_name ?? obj?.title ?? `#${getId(obj)}`;

const Label = ({ children, required }) => (
  <label className="mb-1 block text-sm font-medium text-slate-700">
    {children} {required ? <span className="text-rose-600">*</span> : null}
  </label>
);
const ErrorMsg = ({ children }) =>
  children ? <p className="mt-1 text-sm text-rose-700">{children}</p> : null;
const Skel = ({ h = 40, w = "100%", className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} style={{ height: h, width: w }} />
);

const CUSTOMER_TYPE = { sender: 1, receiver: 2 };

const normalizeList = (p) => {
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.data?.data)) return p.data.data;
  if (Array.isArray(p?.districts)) return p.districts;
  if (Array.isArray(p?.states)) return p.states;
  if (Array.isArray(p?.countries)) return p.countries;
  const firstArray = p && typeof p === "object" ? Object.values(p).find(Array.isArray) : null;
  return Array.isArray(firstArray) ? firstArray : [];
};
const getId = (o) => String(o?.id ?? o?._id ?? o?.code ?? o?.uuid ?? o?.value ?? "");
const DOC_LABELS = ["document_type","doc_type","type_name","documentName","document","name","title","label","type"];
const getDocId = (d) => String(d?.id ?? d?._id ?? d?.code ?? d?.uuid ?? d?.value ?? "");
const getDocLabel = (d) => DOC_LABELS.map(k => d?.[k]).find(v => typeof v === "string" && v.trim()) || `Doc ${getDocId(d)}`;

/* phone code helpers */
const getDialCode = (o) =>
  String(o?.dial_code ?? o?.phone_code ?? o?.code ?? o?.calling_code ?? o?.isd ?? o?.prefix ?? "").replace(/\s+/g, "");
const getDialLabel = (o) => {
  const name = o?.country ?? o?.country_name ?? o?.name ?? o?.title ?? o?.label ?? "—";
  const dc = getDialCode(o);
  return dc ? `${name} (${dc})` : name;
};
const composeE164 = (code, local) => {
  const c = String(code || "").trim();
  const n = String(local || "").trim();
  if (!c && !n) return "";
  if (n.startsWith("+")) return n.replace(/\s+/g, "");
  const cc = c.startsWith("+") ? c : `+${c}`;
  return (cc + n.replace(/[^\d]/g, "")).replace(/\s+/g, "");
};

/* uploads */
const MAX_FILE_MB = 8, MAX_TOTAL_MB = 24, MAX_DIMENSION = 2000, WEBP_QUALITY = 0.82;
const bytesToMB = (b) => b / (1024 * 1024);
const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
async function compressIfImage(file) {
  if (!file.type.startsWith("image/")) return file;
  try {
    const img = await loadImageFromFile(file);
    let { width, height } = img;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    if (scale < 1) { width = Math.round(width * scale); height = Math.round(height * scale); }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", WEBP_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp", lastModified: Date.now() });
  } catch { return file; }
}

/* profile → branch helpers */
const safeDecodeJwt = (jwt) => {
  if (!jwt || typeof jwt !== "string" || !jwt.includes(".")) return null;
  try { return JSON.parse(atob(jwt.split(".")[1])); } catch { return null; }
};
const pickBranchId = (profileLike) => {
  const x = profileLike?.data ?? profileLike ?? null;
  const user = x?.user ?? x ?? null;
  return user?.branch_id ?? user?.branchId ?? user?.branch?.id ?? null;
};
const branchNameFromProfileObj = (profile) =>
  profile?.user?.branch?.name ||
  profile?.branch?.name ||
  profile?.user?.branch_name ||
  profile?.branch_name ||
  "";

/* ---------------- component ---------------- */
export default function SenderReceiverCreate({
  asModal = false,
  initialRole,
  lockRole = false,
  onClose,
  onCreated,
} = {}) {
  /* routing: derive role from URL/state */
const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
const normalizedRole = (val) =>
  (String(val || "").toLowerCase() === "receiver" ? "receiver" : "sender");

const [role, setRole] = React.useState(() =>
  normalizedRole(initialRole || searchParams.get("role") || location?.state?.role || "sender")
);
  React.useEffect(() => {
    const next = normalizedRole(searchParams.get("role") || location?.state?.role || role);
    if (next !== role) setRole(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, location?.state]);

  const onRoleChange = (e) => {
    const v = e.target.value;
    setRole(v);
    setFieldErrors({});
    setSubmitError("");
    const sp = new URLSearchParams(searchParams);
    sp.set("role", v);
    setSearchParams(sp, { replace: true });
  };

  /* profile / branch */
  const [userProfile, setUserProfile] = React.useState(null);
  const [branchId, setBranchId] = React.useState("");
  const [branchName, setBranchName] = React.useState("");
  const token = React.useMemo(() => localStorage.getItem("token") || "", []);
  const tokenClaims = React.useMemo(() => safeDecodeJwt(token), [token]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await getProfile();
        if (!alive) return;
        setUserProfile(me?.data ?? me ?? null);
      } catch {
        setUserProfile(null);
      }
    })();
    return () => { alive = false; };
  }, []);
  React.useEffect(() => {
    const bidRaw = pickBranchId(userProfile) ?? tokenClaims?.branch_id ?? tokenClaims?.branchId ?? null;
    const bid = bidRaw != null ? String(bidRaw) : "";
    const bname = branchNameFromProfileObj(userProfile) || (bid ? `Branch #${bid}` : "");
    setBranchId(bid);
    setBranchName(bname);
  }, [userProfile, tokenClaims]);

  /* selects, codes, loaders */
  const [docTypes, setDocTypes] = React.useState([]);
  const [docsLoading, setDocsLoading] = React.useState(true);
  const [docsError, setDocsError] = React.useState("");

  const [countries, setCountries] = React.useState([]);
  const [states, setStates] = React.useState([]);
  const [districts, setDistricts] = React.useState([]);
  const [countryLoading, setCountryLoading] = React.useState(false);
  const [stateLoading, setStateLoading] = React.useState(false);
  const [districtLoading, setDistrictLoading] = React.useState(false);
  const [countryError, setCountryError] = React.useState("");
  const [stateError, setStateError] = React.useState("");
  const [districtError, setDistrictError] = React.useState("");

  const [phoneCodes, setPhoneCodes] = React.useState([]);
  const [phoneCodesLoading, setPhoneCodesLoading] = React.useState(true);
  const [phoneCodesError, setPhoneCodesError] = React.useState("");
  const [contactCode, setContactCode] = React.useState("+966");   // Saudi default
  const [whatsappCode, setWhatsappCode] = React.useState("+966"); // Saudi default

  // Unique dial codes for selects (codes only, keep +966 first)
  const allDialCodes = React.useMemo(() => {
    const raw = (Array.isArray(phoneCodes) ? phoneCodes : [])
      .map((pc) =>
        String(
          pc?.dial_code ??
          pc?.phone_code ??
          pc?.code ??
          pc?.calling_code ??
          pc?.isd ??
          pc?.prefix ??
          ""
        )
          .trim()
          .replace(/\s+/g, "")
      )
      .filter(Boolean);

    const uniq = Array.from(new Set(raw));
    if (uniq.length === 0) return ["+966"];
    const withoutSaudi = uniq.filter((c) => c !== "+966");
    return ["+966", ...withoutSaudi];
  }, [phoneCodes]);

  /* forms */
  const initSender = React.useMemo(() => ({
    role: "sender",
    name: "", contactNumber: "", whatsappNumber: "",
    senderIdType: "", senderId: "", documents: [],
  }), []);
  const initReceiver = React.useMemo(() => ({
    role: "receiver",
    name: "", whatsappNumber: "", useSameForContact: true,
    contactNumber: "",
    receiverIdType: "", receiverId: "", documents: [],
    country: "", state: "", district: "", city: "", zipCode: "", address: "",
  }), []);

  const [sender, setSender] = React.useState(initSender);
  const [receiver, setReceiver] = React.useState(initReceiver);

  const [fileKey, setFileKey] = React.useState(0);
  const [submitLoading, setSubmitLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [submitNotice, setSubmitNotice] = React.useState("");

  const [showSuccess, setShowSuccess] = React.useState(false);
  const [createdData, setCreatedData] = React.useState(null);
  const [displayDetails, setDisplayDetails] = React.useState(null);

  /* bootstrap */
  React.useEffect(() => {
    (async () => {
      try {
        setDocsLoading(true); setDocsError("");
        const docsRes = await getDocumentTypes({ per_page: 1000 });
        setDocTypes(normalizeList(docsRes));
      } catch {
        setDocTypes([]); setDocsError("Failed to load document types.");
      } finally { setDocsLoading(false); }
    })();
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPhoneCodesLoading(true); setPhoneCodesError("");
        const list = await getPhoneCodes({ per_page: 1000 }, token);
        if (!alive) return;
        setPhoneCodes(Array.isArray(list) ? list : []);
      } catch {
        if (!alive) return;
        setPhoneCodesError("Failed to load phone codes.");
        setPhoneCodes([]);
      } finally {
        if (!alive) return;
        setPhoneCodesLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // Countries
  React.useEffect(() => {
    if (role !== "receiver") return;
    let alive = true;
    (async () => {
      try {
        setCountryLoading(true); setCountryError("");
        const res = await getCountries({ per_page: 500 }, token);
        if (!alive) return;
        setCountries(normalizeList(res));
      } catch (e) {
        if (!alive) return;
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load countries.";
        setCountries([]);
        setCountryError(msg);
        console.error("Countries fetch failed:", e);
      } finally {
        if (alive) setCountryLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [role, token]);

  // States
  React.useEffect(() => {
    if (role !== "receiver") return;
    if (!receiver.country) { setStates([]); return; }
    let alive = true;
    (async () => {
      try {
        setStateLoading(true); setStateError(""); setStates([]);
        const res = await getStatesByCountry(Number(receiver.country), { per_page: 1000 }, token);
        if (!alive) return;
        let list = normalizeList(res);
        list = list.filter(s => String(s.country_id ?? s.countryId ?? s?.country?.id ?? s?.country?._id) === String(receiver.country));
        setStates(list);
      } catch (e) {
        if (!alive) return;
        const msg = e?.response?.data?.message || e?.message || "Failed to load states.";
        setStates([]);
        setStateError(msg);
        console.error("States fetch failed:", e);
      } finally {
        if (alive) setStateLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, receiver.country, token]);

  // Districts
  React.useEffect(() => {
    if (role !== "receiver") return;
    if (!receiver.state) { setDistricts([]); return; }
    let alive = true;
    (async () => {
      try {
        setDistrictLoading(true); setDistrictError(""); setDistricts([]);
        const res = await getDistrictsByState(Number(receiver.state), { per_page: 1000 }, token);
        if (!alive) return;
        let list = normalizeList(res);
        list = list.filter(d => String(d.state_id ?? d.stateId ?? d?.state?.id ?? d?.state?._id) === String(receiver.state));
        setDistricts(list);
      } catch (e) {
        if (!alive) return;
        const msg = e?.response?.data?.message || e?.message || "Failed to load districts.";
        setDistricts([]);
        setDistrictError(msg);
        console.error("Districts fetch failed:", e);
      } finally {
        if (alive) setDistrictLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, receiver.state, token]);

  /* when country changes, update phone codes */
  React.useEffect(() => {
    if (role !== "receiver" || !receiver.country || !phoneCodes.length) return;

    const phoneCode = phoneCodes.find(
      (p) => String(p.country_id) === String(receiver.country)
    );

    if (phoneCode) {
      const dialCode = getDialCode(phoneCode);
      setWhatsappCode(dialCode);
      setContactCode(dialCode);
    }
  }, [role, receiver.country, phoneCodes]);

  /* handlers */
  const onSenderChange = async (e) => {
    const { name, value, files } = e.target;

    // PHONE: pure setter to avoid caret jump
    if (name === "contactNumber" || name === "whatsappNumber") {
      return setSender((p) => ({ ...p, [name]: value }));
    }

    if (name === "documents") {
      setSubmitNotice("");
      const picked = Array.from(files || []);
      const processed = await Promise.all(picked.map(compressIfImage));
      const overs = processed.filter((f) => bytesToMB(f.size) > MAX_FILE_MB);
      if (overs.length) setSubmitNotice(`Some files exceed ${MAX_FILE_MB}MB: ${overs.map(f => f.name).join(", ")}`);
      const kept = processed.filter((f) => bytesToMB(f.size) <= MAX_FILE_MB);
      const totalMB = kept.reduce((s, f) => s + bytesToMB(f.size), 0);
      if (totalMB > MAX_TOTAL_MB) {
        let running = 0, trimmed = [];
        for (const f of kept) { const next = running + bytesToMB(f.size); if (next > MAX_TOTAL_MB) break; running = next; trimmed.push(f); }
        setSender((p) => ({ ...p, documents: trimmed }));
        setSubmitNotice(`Total attachments trimmed to ${MAX_TOTAL_MB}MB. Kept ${trimmed.length}/${processed.length}.`);
        return;
      }
      return setSender((p) => ({ ...p, documents: kept }));
    }

    setSender((p) => ({ ...p, [name]: value }));
  };

  const onReceiverChange = async (e) => {
    const { name, value, type, checked, files } = e.target;

    if (name === "useSameForContact") {
      return setReceiver((p) => {
        const next = { ...p, useSameForContact: checked };
        if (checked) next.contactNumber = p.whatsappNumber;
        return next;
      });
    }

    // PHONE: pure setters (no code auto-detect while typing)
    if (name === "whatsappNumber" || name === "contactNumber") {
      return setReceiver((p) => {
        const next = { ...p, [name]: value };
        if (p.useSameForContact && name === "whatsappNumber") next.contactNumber = value;
        return next;
      });
    }

    if (name === "country") {
      setStates([]); setDistricts([]);
      return setReceiver((p) => ({ ...p, country: value || "", state: "", district: "" }));
    }
    if (name === "state") {
      setDistricts([]);
      return setReceiver((p) => ({ ...p, state: value || "", district: "" }));
    }

    if (name === "documents") {
      setSubmitNotice("");
      const picked = Array.from(files || []);
      const processed = await Promise.all(picked.map(compressIfImage));
      const overs = processed.filter((f) => bytesToMB(f.size) > MAX_FILE_MB);
      if (overs.length) setSubmitNotice(`Some files exceed ${MAX_FILE_MB}MB: ${overs.map(f => f.name).join(", ")}`);
      const kept = processed.filter((f) => bytesToMB(f.size) <= MAX_FILE_MB);
      const totalMB = kept.reduce((s, f) => s + bytesToMB(f.size), 0);
      if (totalMB > MAX_TOTAL_MB) {
        let running = 0, trimmed = [];
        for (const f of kept) { const next = running + bytesToMB(f.size); if (next > MAX_TOTAL_MB) break; running = next; trimmed.push(f); }
        setReceiver((p) => ({ ...p, documents: trimmed }));
        setSubmitNotice(`Total attachments trimmed to ${MAX_TOTAL_MB}MB. Kept ${trimmed.length}/${processed.length}.`);
        return;
      }
      return setReceiver((p) => ({ ...p, documents: kept }));
    }

    setReceiver((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  /* payloads */
  const buildSenderPayload = () => {
    const files = Array.isArray(sender.documents) ? sender.documents : [];
    const map = {
      name: sender.name,
      customer_type_id: CUSTOMER_TYPE.sender, // 1
      contact_number: composeE164(contactCode, sender.contactNumber),
      whatsapp_number: composeE164(whatsappCode, sender.whatsappNumber),
      document_type_id: sender.senderIdType ? Number(sender.senderIdType) : "",
      document_id: sender.senderId,
      branch_id: branchId ? Number(branchId) : "",
    };
    const filtered = Object.fromEntries(Object.entries(map).filter(([, v]) => v !== "" && v != null));
    if (!files.length) return filtered;
    const f = new FormData();
    for (const [k, v] of Object.entries(filtered)) f.append(k, v);
    files.forEach((file) => f.append("documents[]", file, file.name));
    if (files.length === 1) f.append("document", files[0], files[0].name);
    return f;
  };

  const buildReceiverPayload = () => {
    const files = Array.isArray(receiver.documents) ? receiver.documents : [];
    const map = {
      name: receiver.name,
      customer_type_id: CUSTOMER_TYPE.receiver, // 2
      contact_number: composeE164(contactCode, receiver.contactNumber || receiver.whatsappNumber),
      whatsapp_number: composeE164(whatsappCode, receiver.whatsappNumber),
      document_type_id: receiver.receiverIdType ? Number(receiver.receiverIdType) : "",
      document_id: receiver.receiverId,
      branch_id: branchId ? Number(branchId) : "",
      country_id: receiver.country ? Number(receiver.country) : "",
      state_id: receiver.state ? Number(receiver.state) : "",
      district_id: receiver.district ? Number(receiver.district) : "",
      city: receiver.city,
      postal_code: receiver.zipCode,
      address: receiver.address,
    };
    const filtered = Object.fromEntries(Object.entries(map).filter(([, v]) => v !== "" && v != null));
    if (!files.length) return filtered;
    const f = new FormData();
    for (const [k, v] of Object.entries(filtered)) f.append(k, v);
    files.forEach((file) => f.append("documents[]", file, file.name));
    if (files.length === 1) f.append("document", files[0], files[0].name);
    return f;
  };

  /* submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(""); setFieldErrors({});

    if (role === "sender") {
      if (!sender.name || !sender.senderIdType || !sender.senderId) {
        return setSubmitError("Sender: Name, ID Type and Document ID are required.");
      }
    } else {
      if (!receiver.name || !receiver.receiverIdType || !receiver.receiverId || !receiver.address) {
        return setSubmitError("Receiver: Name, ID Type, Document ID and Address are required.");
      }
    }

    try {
      setSubmitLoading(true);
      const payload = role === "sender" ? buildSenderPayload() : buildReceiverPayload();

      const created = await toast.promise(
        createParty(payload),
        { loading: "Submitting…", success: "Saved successfully", error: (e) => e?.response?.data?.message || "Failed to submit form." },
        { position: "top-right" }
      );

      const details = role === "sender"
        ? {
            Role: "Sender",
            Name: sender.name,
            Phone: composeE164(contactCode, sender.contactNumber),
            WhatsApp: composeE164(whatsappCode, sender.whatsappNumber),
            "ID Type": (docTypes.find(d => getDocId(d) === String(sender.senderIdType)) && getDocLabel(docTypes.find(d => getDocId(d) === String(sender.senderIdType)))) || sender.senderIdType,
            "Document ID": sender.senderId,
            Branch: branchName || branchId || "—",
            Attachments: sender.documents?.length ? sender.documents.map(f => f.name).join(", ") : "—",
          }
        : {
            Role: "Receiver",
            Name: receiver.name,
            Phone: composeE164(contactCode, receiver.contactNumber || receiver.whatsappNumber),
            WhatsApp: composeE164(whatsappCode, receiver.whatsappNumber),
            "ID Type": (docTypes.find(d => getDocId(d) === String(receiver.receiverIdType)) && getDocLabel(docTypes.find(d => getDocId(d) === String(receiver.receiverIdType)))) || receiver.receiverIdType,
            "Document ID": receiver.receiverId,
            Branch: branchName || branchId || "—",
            Country: receiver.country || "—",
            State: receiver.state || "—",
            District: receiver.district || "—",
            City: receiver.city || "—",
            "Zip Code": receiver.zipCode || "—",
            Address: receiver.address || "—",
            Attachments: receiver.documents?.length ? receiver.documents.map(f => f.name).join(", ") : "—",
          };

      setCreatedData(created ?? null);
      setDisplayDetails(details);
      setShowSuccess(true);
      setFileKey((k) => k + 1);

try {
  if (typeof onCreated === "function") onCreated(created);
} catch {}
    } catch (err) {
      const apiMsg = err?.response?.data?.message || "Failed to submit form.";
      setSubmitError(apiMsg);
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors && typeof apiErrors === "object") setFieldErrors(apiErrors);
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setSender(initSender); setReceiver(initReceiver);
    setFieldErrors({}); setSubmitError(""); setSubmitNotice("");
    setFileKey((k) => k + 1);
  };

  /* ---------------- render ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <Toaster position="top-right" />
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* header */}
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-600 text-white shadow-sm"><FaUserTie /></div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900">Create Sender / Receiver</h2>
              <p className="mt-0.5 text-xs text-slate-500">Branch is auto-filled from your profile. Forms switch dynamically by role.</p>
            </div>
            <nav aria-label="Breadcrumb" className="text-sm">
              <ol className="flex items-center gap-2">
                <li><Link to="/dashboard" className="text-slate-500 hover:text-slate-700 hover:underline">Home</Link></li>
                <li className="text-slate-400">/</li>
                <li aria-current="page" className="font-medium text-slate-800">Add Party</li>
              </ol>
            </nav>
          </div>

          {/* single form body */}
          <form onSubmit={handleSubmit} className="space-y-6 px-5 py-5">
            {/* role + branch */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
           {!lockRole ? (
  <div>
    <Label required>Party Role</Label>
    <select value={role} onChange={onRoleChange} className={fieldBase}>
      <option value="sender">Sender</option>
      <option value="receiver">Receiver</option>
    </select>
  </div>
) : (
  <input type="hidden" name="role" value={role} />
)}
              <div className="md:col-span-2">
                <Label required>Branch</Label>
                <input
                  type="text"
                  readOnly
                  className={[
                    fieldBase,
                    "border border-slate-300/70",
                    "read-only:bg-slate-100 read-only:text-slate-700 read-only:placeholder-slate-400",
                    "read-only:cursor-default read-only:shadow-inner",
                    "focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-0",
                    "read-only:focus:border-slate-400",
                    "transition-colors"
                  ].join(" ")}
                  value={branchName || (branchId ? `Branch #${branchId}` : "")}
                  placeholder="No branch in profile"
                />
                <input type="hidden" name="branch_id" value={branchId || ""} />
                {!branchId && <ErrorMsg>No branch found on profile.</ErrorMsg>}
              </div>
            </div>

            {/* sender */}
            {role === "sender" && (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <Label required>Name</Label>
                    <input name="name" value={sender.name} onChange={onSenderChange} className={fieldBase} placeholder="Full name" />
                    <ErrorMsg>{fieldErrors.name?.[0]}</ErrorMsg>
                  </div>

                  {/* Sender Contact: code select + number input */}
                  <div>
                    <Label>Contact Number</Label>
                    <div className="grid grid-cols-[120px,1fr] gap-2">
                      {phoneCodesLoading ? (
                        <Skel />
                      ) : (
                        <select
                          value={contactCode}
                          onChange={(e) => setContactCode(e.target.value)}
                          className={`${fieldBase} ${fieldDisabled}`}
                          disabled={phoneCodesLoading}
                        >
                          {allDialCodes.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        name="contactNumber"
                        value={sender.contactNumber ?? ""}
                        onChange={onSenderChange}
                        className={fieldBase}
                        placeholder="e.g., 5XXXXXXXX"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <Label required>ID Type</Label>
                    {docsLoading ? <Skel /> : (
                      <select name="senderIdType" value={String(sender.senderIdType || "")} onChange={onSenderChange} className={`${fieldBase} ${fieldDisabled}`} disabled={docsLoading}>
                        <option value="">{docsLoading ? "Loading..." : "Select ID Type"}</option>
                        {!docsLoading && docTypes.map((d) => <option key={getDocId(d)} value={getDocId(d)}>{getDocLabel(d)}</option>)}
                      </select>
                    )}
                    {docsError && <ErrorMsg>{docsError}</ErrorMsg>}
                    <ErrorMsg>{fieldErrors.document_type_id?.[0]}</ErrorMsg>
                  </div>
                  <div>
                    <Label required>Document ID</Label>
                    <input name="senderId" value={sender.senderId} onChange={onSenderChange} className={fieldBase} placeholder="e.g., ABC12345" />
                    <ErrorMsg>{fieldErrors.document_id?.[0]}</ErrorMsg>
                  </div>
                  <div>
                    <Label>Attachments</Label>
                    <input key={fileKey} type="file" name="documents" multiple accept="image/*,application/pdf" onChange={onSenderChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black" />
                  </div>
                </div>
                {submitNotice && <p className="mt-1 text-xs text-amber-700">{submitNotice}</p>}
              </>
            )}

            {/* receiver */}
            {role === "receiver" && (
              <>
                {/* address */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <Label>Country</Label>
                    {countryLoading ? <Skel /> : (
                      <select
                        name="country"
                        value={String(receiver.country || "")}
                        onChange={onReceiverChange}
                        className={`${fieldBase} ${fieldDisabled}`}
                        disabled={countryLoading}
                      >
                        <option value="">{countryLoading ? "Loading..." : "Select Country"}</option>
                        {!countryLoading &&
                          countries.map((c) => (
                            <option key={getId(c)} value={getId(c)}>
                              {labelOf(c)}
                            </option>
                          ))}
                      </select>
                    )}
                    {countryError && <ErrorMsg>{countryError}</ErrorMsg>}
                  </div>
                  <div>
                    <Label>State</Label>
                    {stateLoading ? <Skel /> : (
                      <select
                        name="state"
                        value={String(receiver.state || "")}
                        onChange={onReceiverChange}
                        className={`${fieldBase} ${fieldDisabled}`}
                        disabled={!receiver.country || stateLoading}
                      >
                        <option value="">
                          {!receiver.country ? "Select Country first" : stateLoading ? "Loading..." : "Select State"}
                        </option>
                        {!stateLoading && receiver.country &&
                          states.map((s) => (
                            <option key={getId(s)} value={getId(s)}>
                              {labelOf(s)}
                            </option>
                          ))}
                      </select>
                    )}
                    {stateError && <ErrorMsg>{stateError}</ErrorMsg>}
                  </div>
                  <div>
                    <Label>District</Label>
                    {districtLoading ? <Skel /> : (
                      <select
                        name="district"
                        value={String(receiver.district || "")}
                        onChange={onReceiverChange}
                        className={`${fieldBase} ${fieldDisabled}`}
                        disabled={!receiver.state || districtLoading}
                      >
                        <option value="">
                          {!receiver.state ? "Select State first" : districtLoading ? "Loading..." : "Select District"}
                        </option>
                        {!districtLoading && receiver.state &&
                          districts.map((d) => (
                            <option key={getId(d)} value={getId(d)}>
                              {labelOf(d)}
                            </option>
                          ))}
                      </select>
                    )}
                    {districtError && <ErrorMsg>{districtError}</ErrorMsg>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <Label>City</Label>
                    <input name="city" value={receiver.city} onChange={onReceiverChange} className={fieldBase} placeholder="City" />
                  </div>
                  <div>
                    <Label>Zip / Postal Code</Label>
                    <input name="zipCode" value={receiver.zipCode} onChange={onReceiverChange} className={`${fieldBase} font-mono`} placeholder="e.g., 682001" />
                  </div>
                </div>

                <div>
                  <Label required>Address</Label>
                  <textarea name="address" value={receiver.address} onChange={onReceiverChange} className={`${fieldBase} min-h-[96px]`} placeholder="Street, Building, Landmark" />
                </div>

                {/* Receiver – Identity (3 columns, code selects + plain inputs) */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  {/* 1) Name */}
                  <div>
                    <Label required>Name</Label>
                    <input
                      name="name"
                      value={receiver.name}
                      onChange={onReceiverChange}
                      className={fieldBase}
                      placeholder="Full name"
                    />
                    <ErrorMsg>{fieldErrors.name?.[0]}</ErrorMsg>
                  </div>

                  {/* 2) WhatsApp (code + number) + checkbox */}
                  <div>
                    <Label>WhatsApp Number</Label>
                    <div className="grid grid-cols-[120px,1fr] gap-2">
                      {phoneCodesLoading ? (
                        <Skel />
                      ) : (
                        <select
                          value={whatsappCode}
                          onChange={(e) => setWhatsappCode(e.target.value)}
                          className={`${fieldBase} ${fieldDisabled}`}
                          disabled={phoneCodesLoading}
                        >
                          {allDialCodes.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        name="whatsappNumber"
                        value={receiver.whatsappNumber ?? ""}
                        onChange={onReceiverChange}
                        className={fieldBase}
                        placeholder="e.g., 5XXXXXXXX"
                      />
                    </div>

                    <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="useSameForContact"
                        checked={receiver.useSameForContact}
                        onChange={onReceiverChange}
                      />
                      Use same as Contact Number
                    </label>
                  </div>

                  {/* 3) Contact (code + number; mirrors WhatsApp when checked) */}
                  <div>
                    <Label>Contact Number</Label>
                    <div className="grid grid-cols-[120px,1fr] gap-2">
                      {phoneCodesLoading ? (
                        <Skel />
                      ) : (
                        <select
                          value={contactCode}
                          onChange={(e) => setContactCode(e.target.value)}
                          className={`${fieldBase} ${fieldDisabled}`}
                          disabled={phoneCodesLoading || receiver.useSameForContact}
                        >
                          {allDialCodes.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        name="contactNumber"
                        value={(receiver.useSameForContact ? receiver.whatsappNumber : receiver.contactNumber) ?? ""}
                        onChange={onReceiverChange}
                        className={fieldBase}
                        placeholder="e.g., 5XXXXXXXX"
                        readOnly={receiver.useSameForContact}
                      />
                    </div>
                    {receiver.useSameForContact && (
                      <p className="mt-1 text-xs text-slate-500">Mirrors WhatsApp number</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <Label required>ID Type</Label>
                    {docsLoading ? <Skel /> : (
                      <select name="receiverIdType" value={String(receiver.receiverIdType || "")} onChange={onReceiverChange} className={`${fieldBase} ${fieldDisabled}`} disabled={docsLoading}>
                        <option value="">{docsLoading ? "Loading..." : "Select ID Type"}</option>
                        {!docsLoading && docTypes.map((d) => <option key={getDocId(d)} value={getDocId(d)}>{getDocLabel(d)}</option>)}
                      </select>
                    )}
                    {docsError && <ErrorMsg>{docsError}</ErrorMsg>}
                    <ErrorMsg>{fieldErrors.document_type_id?.[0]}</ErrorMsg>
                  </div>
                  <div>
                    <Label required>Document ID</Label>
                    <input name="receiverId" value={receiver.receiverId} onChange={onReceiverChange} className={fieldBase} placeholder="e.g., XYZ98765" />
                    <ErrorMsg>{fieldErrors.document_id?.[0]}</ErrorMsg>
                  </div>
                  <div>
                    <Label>Attachments</Label>
                    <input key={fileKey} type="file" name="documents" multiple accept="image/*,application/pdf" onChange={onReceiverChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black" />
                  </div>
                </div>

              </>
            )}

            {/* actions + errors */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-slate-700 hover:bg-slate-50" onClick={resetForm} disabled={submitLoading}>Cancel</button>
              <button type="submit" disabled={submitLoading} className={`rounded-lg px-5 py-2 text-white transition ${submitLoading ? "cursor-not-allowed bg-rose-400" : "bg-rose-600 hover:bg-rose-700"}`}>{submitLoading ? "Submitting…" : "Submit"}</button>
            </div>

            {submitError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</div>
            )}
          </form>
        </div>
      </div>

      {/* success modal */}
      <ErrorBoundary onClose={() => setShowSuccess(false)}>
        <CreateReceiverSenderModal open={showSuccess} onClose={() => setShowSuccess(false)} data={createdData} details={displayDetails} />
      </ErrorBoundary>
    </div>
  );
}
