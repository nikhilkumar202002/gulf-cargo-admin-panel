// src/features/CRM/forms/SenderForm.jsx
import React from "react";
import { Toaster, toast } from "react-hot-toast";

/* APIs */
import { getProfile } from "../../../services/authService";
import { createParty } from "../../../services/partyService";
import { 
  getDocumentTypes, 
  getPhoneCodes, 
  getBranchByIdSmart 
} from "../../../services/coreService";
/* Helpers */
import {
  normalizeList,
  getDocId,
  getDocLabel,
  getDialCode,
  composeE164,
  useSelectDigitTypeahead,
} from "../../../utils/senderFormHelper";

const CUSTOMER_TYPE_SENDER = 1;
const fieldBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring";
const fieldDisabled = "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export default function SenderForm({ onClose, onCreated }) {
  const [branchId, setBranchId] = React.useState("");
  const [branchName, setBranchName] = React.useState("");

  const [docTypes, setDocTypes] = React.useState([]);
  const [docsLoading, setDocsLoading] = React.useState(true);
  const [docsError, setDocsError] = React.useState("");

  const [phoneCodes, setPhoneCodes] = React.useState([]);
  const [phoneCodesLoading, setPhoneCodesLoading] = React.useState(true);

  // Phone Codes State (Initialized without +)
  const [contactCode, setContactCode] = React.useState("966");
  const [whatsappCode, setWhatsappCode] = React.useState("966");
  
  const [isWhatsappSame, setIsWhatsappSame] = React.useState(false);

  const [form, setForm] = React.useState({
    name: "",
    contactNumber: "",
    whatsappNumber: "", 
    senderIdType: "",
    senderId: "",
    documents: [],
    city: "",
  });
  const [fileKey, setFileKey] = React.useState(0);
  const [submitLoading, setSubmitLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");

  /* ---------------- Profile ---------------- */
  React.useEffect(() => {
    (async () => {
      try {
        const [profileRes, docsRes, codesRes] = await Promise.all([
          getProfile(),
          getDocumentTypes({ per_page: 1000 }),
          getPhoneCodes({ per_page: 1000 }),
        ]);

        const profileData = profileRes?.data?.user || profileRes?.user || profileRes?.data || profileRes || {};
        const branchDetails = profileData?.branch || profileData?.branch_details || {};
        const profileBranchId = branchDetails?.id || profileData?.branch_id || profileData?.branchId || "";
        const profileBranchName = branchDetails?.branch_name || branchDetails?.name || "Branch";

        setBranchId(String(profileBranchId));
        setBranchName(profileBranchName || (profileBranchId ? `Branch #${profileBranchId}` : ""));

        const initialCity = branchDetails?.branch_location || branchDetails?.location || branchDetails?.city || "Riyadh";
        setForm((f) => ({ ...f, city: initialCity }));

        if (profileBranchId) {
          getBranchByIdSmart(profileBranchId)
            .then(branchRes => {
              const branchData = branchRes?.data || branchRes || {};
              const branchLocation = branchData?.branch_location || branchData?.location || branchData?.city || initialCity;
              setForm((f) => ({ ...f, city: branchLocation }));
            })
            .catch(err => console.error("❌ Failed to fetch branch details:", err));
        }

        setDocTypes(normalizeList(docsRes));
        setDocsLoading(false);

        setPhoneCodes(Array.isArray(codesRes) ? codesRes : []);
        setPhoneCodesLoading(false);

      } catch (err) {
        console.error("❌ Failed to fetch profile/branch:", err);
        setBranchId("");
        setBranchName("");
        setForm((f) => ({ ...f, city: "Riyadh" }));
        setDocsError("Failed to load document types.");
        setDocsLoading(false);
        setPhoneCodesLoading(false);
      }
    })();
  }, []);

  /* ---------------- Sync WhatsApp Logic ---------------- */
  React.useEffect(() => {
    if (isWhatsappSame) {
      setContactCode(whatsappCode);
      setForm((prev) => ({ ...prev, contactNumber: prev.whatsappNumber }));
    }
  }, [isWhatsappSame, whatsappCode, form.whatsappNumber]);

  /* ---------------- Helpers ---------------- */
  const allDialCodes = React.useMemo(() => {
    const raw = (Array.isArray(phoneCodes) ? phoneCodes : [])
      .map(getDialCode)
      .map(c => c.replace(/^\+/, '')) // Remove leading +
      .filter(Boolean);
    const uniq = Array.from(new Set(raw));
    
    if (uniq.length === 0) return ["966"];
    
    const rest = uniq
      .filter((c) => c !== "966")
      .sort((a, b) => Number(a) - Number(b));
      
    return uniq.includes("966") ? ["966", ...rest] : rest;
  }, [phoneCodes]);

  const contactCodeTypeahead = useSelectDigitTypeahead(allDialCodes, setContactCode);
  const whatsappCodeTypeahead = useSelectDigitTypeahead(allDialCodes, setWhatsappCode);

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "documents") {
      setForm((f) => ({ ...f, documents: Array.from(files || []) }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const toggleWhatsappSame = (e) => {
    const checked = e.target.checked;
    setIsWhatsappSame(checked);
    if (checked) {
      setContactCode(whatsappCode);
      setForm((f) => ({ ...f, contactNumber: f.whatsappNumber }));
    }
  };

  const buildPayload = () => {
    // Re-add '+' for E.164 compliance when sending to API
    const safeContactCode = contactCode.startsWith('+') ? contactCode : `+${contactCode}`;
    const safeWhatsappCode = whatsappCode.startsWith('+') ? whatsappCode : `+${whatsappCode}`;

    const map = {
      customer_type_id: CUSTOMER_TYPE_SENDER,
      name: form.name,
      contact_number: composeE164(safeContactCode, form.contactNumber),
      whatsapp_number: composeE164(safeWhatsappCode, form.whatsappNumber),
      document_type_id: form.senderIdType ? Number(form.senderIdType) : "",
      document_id: form.senderId,
      branch_id: branchId ? Number(branchId) : "",
      city: form.city || "Riyadh",
    };
    const filtered = Object.fromEntries(
      Object.entries(map).filter(([, v]) => v !== "" && v != null)
    );
    if (!form.documents?.length) return filtered;
    const f = new FormData();
    for (const [k, v] of Object.entries(filtered)) f.append(k, v);
    form.documents.forEach((file) => f.append("documents[]", file, file.name));
    return f;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      setSubmitError("Sender name is required.");
      return;
    }
    try {
      setSubmitLoading(true);
      const payload = buildPayload();
      const created = await toast.promise(
        createParty(payload),
        {
          loading: "Submitting…",
          success: "Saved successfully",
          error: "Failed to submit form.",
        },
        { position: "top-right" }
      );
      if (typeof onCreated === "function") onCreated(created, "sender");
      setForm({
        name: "",
        contactNumber: "",
        whatsappNumber: "",
        senderIdType: "",
        senderId: "",
        documents: [],
        city: form.city, 
      });
      setIsWhatsappSame(false);
      setFileKey((k) => k + 1);
      if (typeof onClose === "function") onClose();
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message || err?.message || "Failed to submit form."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Toaster position="top-right" />

      {/* ========== Section 1: Branch ========== */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div>
          <input
            type="text"
            className={[
              fieldBase,
              "bg-slate-100 text-black cursor-default",
              "focus:ring-0 focus:border-slate-300",
              "text-[20px] font-semibold",
            ].join(" ")}
            value={branchName || (branchId ? `Branch #${branchId}` : "")}
            readOnly
          />
          <input type="hidden" name="branch_id" value={branchId || ""} />
        </div>
      </section>

      {/* ========== Section 2: Sender Identity ========== */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-[11px] font-semibold text-white">
            1
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            Sender Identity
          </h3>
        </header>

        {/* Name + City */}
        <div className="grid grid-cols-1 gap-5 px-4 py-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name <span className="text-rose-600">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              className={fieldBase}
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              City
            </label>
            <input
              name="city"
              value={form.city}
              onChange={onChange}
              className={fieldBase}
              placeholder="Riyadh"
            />
          </div>
        </div>

        {/* WhatsApp + Contact (Swapped Order) */}
        <div className="grid grid-cols-1 gap-5 px-4 pb-4 md:grid-cols-2 border-b border-slate-100 mb-4">
          
          {/* 1. WhatsApp Number (Now First) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              WhatsApp Number
            </label>
            <div className="grid grid-cols-[90px,1fr] gap-2">
              {phoneCodesLoading ? (
                <div className="h-[40px] animate-pulse rounded-lg bg-slate-200/80" />
              ) : (
                <select
                  value={whatsappCode}
                  onChange={(e) => setWhatsappCode(e.target.value)}
                  onKeyDown={whatsappCodeTypeahead.onKeyDown}
                  className={`${fieldBase} ${fieldDisabled}`}
                  disabled={phoneCodesLoading}
                >
                  {allDialCodes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <input
                name="whatsappNumber"
                value={form.whatsappNumber}
                onChange={onChange}
                className={fieldBase}
                inputMode="numeric"
                placeholder="501234567"
              />
            </div>
            {/* Checkbox */}
            <div className="mt-2 flex items-center">
              <input
                id="wa_same"
                type="checkbox"
                checked={isWhatsappSame}
                onChange={toggleWhatsappSame}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="wa_same" className="ml-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                Use as Contact Number
              </label>
            </div>
          </div>

          {/* 2. Contact Number (Now Second) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contact Number
            </label>
            <div className="grid grid-cols-[90px,1fr] gap-2">
              {phoneCodesLoading ? (
                <div className="h-[40px] animate-pulse rounded-lg bg-slate-200/80" />
              ) : (
                <select
                  value={contactCode}
                  onChange={(e) => setContactCode(e.target.value)}
                  onKeyDown={contactCodeTypeahead.onKeyDown}
                  className={`${fieldBase} ${fieldDisabled}`}
                  disabled={phoneCodesLoading || isWhatsappSame}
                >
                  {allDialCodes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <input
                name="contactNumber"
                value={form.contactNumber}
                onChange={onChange}
                className={`${fieldBase} ${isWhatsappSame ? 'bg-slate-50 text-slate-500' : ''}`}
                inputMode="numeric"
                placeholder="501234567"
                readOnly={isWhatsappSame}
              />
            </div>
            {isWhatsappSame && (
              <p className="mt-1 text-xs text-indigo-600">Synced from WhatsApp</p>
            )}
          </div>

        </div>

        {/* ID Type + Document ID + Uploads */}
        <div className="grid grid-cols-1 gap-5 px-4 pb-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              ID Type
            </label>
            <select
              name="senderIdType"
              value={String(form.senderIdType || "")}
              onChange={onChange}
              className={`${fieldBase} ${fieldDisabled}`}
              disabled={docsLoading}
            >
              <option value="">
                {docsLoading ? "Loading..." : "Select ID Type"}
              </option>
              {docTypes.map((d) => (
                <option key={getDocId(d)} value={getDocId(d)}>
                  {getDocLabel(d)}
                </option>
              ))}
            </select>
            {docsError && (
              <p className="mt-1 text-sm text-rose-700">{docsError}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Document ID
            </label>
            <input
              name="senderId"
              value={form.senderId}
              onChange={onChange}
              className={fieldBase}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Upload Documents
            </label>
            <input
              key={fileKey}
              type="file"
              name="documents"
              accept="image/*,.pdf"
              multiple
              onChange={onChange}
              className={fieldBase}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {submitError && (
          <p className="mr-auto text-sm text-rose-700">{submitError}</p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitLoading}
          className={`rounded-lg px-5 py-2 text-white transition ${
            submitLoading
              ? "cursor-not-allowed bg-rose-400"
              : "bg-rose-600 hover:bg-rose-700"
          }`}
        >
          {submitLoading ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}