import React from "react";
import { Toaster, toast } from "react-hot-toast";

import { getProfile } from "../../services/authService";
import { getActiveDocumentTypes, getPhoneCodes } from "../../services/coreService";
import { updateParty } from "../../services/partyService";

import {
  normalizeList,
  getDocId,
  getDocLabel,
  getDialCode,
  onlyDigits,
  composeE164,
  useSelectDigitTypeahead,
} from "../../utils/receiverFormHelper";

const CUSTOMER_TYPE_SENDER = 1;

// Consistent Styling
const fieldBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring focus:border-emerald-500 transition-colors";
const fieldDisabled = "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

/**
 * Splits an E.164 number into a country code and local number.
 */
function splitE164(value, codeListDigits) {
  if (!value) return null;
  const s = String(value).replace(/\D/g, "");
  if (!s) return null;

  for (const code of codeListDigits) {
    if (s.startsWith(code)) {
      return { code, local: s.substring(code.length) };
    }
  }
  return null;
}

/**
 * Detects code from pasted text (e.g. "+91 98765...")
 */
function detectCodeFromFreeText(value, codeListDigits) {
  if (!value) return null;
  let s = String(value).trim().replace(/\s+/g, "");
  if (!(s.startsWith("+") || s.startsWith("00"))) return null;
  if (s.startsWith("00")) s = s.replace(/^00/, "+");
  for (let len = 4; len >= 1; len--) {
    const candDigits = s.slice(1, 1 + len);
    if (codeListDigits.includes(candDigits)) {
      return { code: candDigits, rest: s.slice(1 + len) };
    }
  }
  return null;
}

export default function EditSenderParty({ partyId, initialParty, onClose, onSuccess }) {
  /* branch */
  const [branchId, setBranchId] = React.useState("");
  const [branchName, setBranchName] = React.useState("");

  /* doc types */
  const [docTypes, setDocTypes] = React.useState([]);
  const [docsLoading, setDocsLoading] = React.useState(true);
  const [docsError, setDocsError] = React.useState("");

  /* phone codes */
  const [phoneCodes, setPhoneCodes] = React.useState([]);
  const [phoneCodesLoading, setPhoneCodesLoading] = React.useState(true);
  const [phoneCodesError, setPhoneCodesError] = React.useState("");
  const [whatsappCode, setWhatsappCode] = React.useState("966");
  const [contactCode, setContactCode] = React.useState("966");

  /* form */
  const [form, setForm] = React.useState({
    name: "",
    whatsappNumber: "",
    contactNumber: "",
    useSameAsContact: false, // Logic: WA matches Contact
    senderIdType: "",
    senderId: "",
    documents: [],
  });
  const [submitLoading, setSubmitLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");

  /* profile (branch) */
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await getProfile();
        if (!alive) return;
        const u = me?.data?.user ?? me?.user ?? null;
        const bid = u?.branch_id ?? u?.branchId ?? u?.branch?.id ?? "";
        const bname = u?.branch?.name ?? u?.branch_name ?? "";
        setBranchId(bid ? String(bid) : "");
        setBranchName(bname || (bid ? `Branch #${bid}` : ""));
      } catch {
        if (!alive) return;
        setBranchId("");
        setBranchName("");
      }
    })();
    return () => { alive = false; };
  }, []);

  /* docs */
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setDocsLoading(true);
        setDocsError("");
        const docsRes = await getActiveDocumentTypes({ per_page: 1000 });
        if (!alive) return;
        setDocTypes(normalizeList(docsRes));
      } catch {
        if (!alive) return;
        setDocTypes([]);
        setDocsError("Failed to load document types.");
      } finally {
        if (alive) setDocsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* phone codes */
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPhoneCodesLoading(true);
        setPhoneCodesError("");
        const list = await getPhoneCodes({ per_page: 1000 });
        if (!alive) return;
        setPhoneCodes(Array.isArray(list) ? list : []);
      } catch {
        if (!alive) return;
        setPhoneCodes([]);
        setPhoneCodesError("Failed to load phone codes.");
      } finally {
        if (alive) setPhoneCodesLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const phoneCodeOptions = React.useMemo(() => {
    const raw = (phoneCodes || []).map(getDialCode).map(onlyDigits).filter(Boolean);
    const uniq = Array.from(new Set(raw));
    if (uniq.length === 0) return ["966"];
    const rest = uniq.filter((c) => c !== "966").sort((a, b) => Number(a) - Number(b));
    return uniq.includes("966") ? ["966", ...rest] : rest;
  }, [phoneCodes]);

  /* ===== PREFILL from initialParty ===== */
  React.useEffect(() => {
    if (!initialParty || !phoneCodeOptions.length) return;

    let waLocal = "";
    let waCodeVal = "966";
    let contactLocal = "";
    let contactCodeVal = "966";

    const wa = splitE164(initialParty.whatsapp_number, phoneCodeOptions);
    if (wa) {
      waCodeVal = wa.code;
      waLocal = wa.local;
    } else {
      waLocal = onlyDigits(initialParty.whatsapp_number || "");
    }

    const contact = splitE164(initialParty.contact_number, phoneCodeOptions);
    if (contact) {
      contactCodeVal = contact.code;
      contactLocal = contact.local;
    } else {
      contactLocal = onlyDigits(initialParty.contact_number || "");
    }

    setWhatsappCode(waCodeVal);
    setContactCode(contactCodeVal);

    setForm((prev) => ({
      ...prev,
      name: initialParty.name || "",
      whatsappNumber: waLocal,
      contactNumber: contactLocal,
      senderIdType: initialParty.document_type_id ? String(initialParty.document_type_id) : "",
      senderId: initialParty.document_id || "",
      // If contact & WA are same, check the box
      useSameAsContact: (contactLocal === waLocal && contactCodeVal === waCodeVal && contactLocal !== "")
    }));
  }, [initialParty, phoneCodeOptions]);

  const waTypeahead = useSelectDigitTypeahead(phoneCodeOptions, setWhatsappCode);
  const contactTypeahead = useSelectDigitTypeahead(phoneCodeOptions, setContactCode);

  /* Logic: Sync WA with Contact when checked */
  React.useEffect(() => {
    if (form.useSameAsContact) {
      setForm((f) => ({ ...f, whatsappNumber: f.contactNumber }));
      setWhatsappCode(contactCode);
    }
  }, [form.useSameAsContact, form.contactNumber, contactCode]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'useSameAsContact') {
      return setForm(prev => {
        const next = { ...prev, [name]: checked };
        if (checked) {
          next.whatsappNumber = prev.contactNumber;
          setWhatsappCode(contactCode);
        }
        return next;
      });
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  /* Phone Handlers (Contact) */
  const handleContactChange = (e) => {
    const val = e.target.value;
    if (/^(?:\+|00)/.test(val)) {
      const det = detectCodeFromFreeText(val, phoneCodeOptions);
      if (det) {
        setContactCode(det.code);
        setForm((f) => ({ ...f, contactNumber: det.rest.replace(/\D/g, "") }));
        return;
      }
    }
    setForm((f) => ({ ...f, contactNumber: val.replace(/\D/g, "") }));
  };

  const handleContactPaste = (e) => {
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const det = detectCodeFromFreeText(text, phoneCodeOptions);
    if (det) {
      e.preventDefault();
      setContactCode(det.code);
      setForm((f) => ({ ...f, contactNumber: det.rest.replace(/\D/g, "") }));
    }
  };

  /* Phone Handlers (WhatsApp) */
  const handleWaChange = (e) => {
    if (form.useSameAsContact) return;
    const val = e.target.value;
    if (/^(?:\+|00)/.test(val)) {
      const det = detectCodeFromFreeText(val, phoneCodeOptions);
      if (det) {
        setWhatsappCode(det.code);
        setForm((f) => ({ ...f, whatsappNumber: det.rest.replace(/\D/g, "") }));
        return;
      }
    }
    setForm((f) => ({ ...f, whatsappNumber: val.replace(/\D/g, "") }));
  };

  const handleWaPaste = (e) => {
    if (form.useSameAsContact) return;
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const det = detectCodeFromFreeText(text, phoneCodeOptions);
    if (det) {
      e.preventDefault();
      setWhatsappCode(det.code);
      setForm((f) => ({ ...f, whatsappNumber: det.rest.replace(/\D/g, "") }));
    }
  };

  const buildPayload = () => {
    const map = {
      customer_type_id: CUSTOMER_TYPE_SENDER,
      name: form.name,
      whatsapp_number: composeE164(whatsappCode, form.whatsappNumber),
      contact_number: composeE164(contactCode, form.contactNumber),
      document_type_id: form.senderIdType ? Number(form.senderIdType) : "",
      document_id: form.senderId,
      branch_id: branchId ? Number(branchId) : "",
    };
    return Object.fromEntries(
      Object.entries(map).filter(([, v]) => v !== "" && v != null)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      return setSubmitError("Sender name is required.");
    }
    try {
      setSubmitLoading(true);
      const payload = buildPayload();
      await toast.promise(
        updateParty(partyId, payload),
        { loading: "Updating…", success: "Updated successfully", error: "Failed to update sender." },
        { position: "top-right" }
      );
      if (typeof onSuccess === "function") onSuccess();
      if (typeof onClose === "function") onClose();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Failed to update sender.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-slate-50">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <Toaster position="top-right" />

        <div className="mx-auto max-w-4xl space-y-6">

          {/* SECTION 1: Personal & Contact */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">1</div>
              <h3 className="font-semibold text-slate-900">Personal & Contact Info</h3>
            </header>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    className={fieldBase}
                    placeholder="Enter full name"
                  />
                </div>

                {/* Contact Number (First) */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Contact Number</label>
                  <div className="grid grid-cols-[110px,1fr] gap-2">
                    {phoneCodesLoading ? (
                      <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
                    ) : (
                      <select
                        value={contactCode}
                        onChange={(e) => setContactCode(e.target.value)}
                        onKeyDown={contactTypeahead.onKeyDown}
                        className={`${fieldBase} ${fieldDisabled}`}
                        disabled={phoneCodesLoading}
                      >
                        {phoneCodeOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
                      </select>
                    )}
                    <input
                      type="tel"
                      name="contactNumber"
                      value={form.contactNumber}
                      onChange={handleContactChange}
                      onPaste={handleContactPaste}
                      className={fieldBase}
                      inputMode="numeric"
                      placeholder="e.g. 501234567"
                    />
                  </div>
                </div>

                {/* WhatsApp Number (Second) */}
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>WhatsApp Number</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="wa_same_sender"
                        name="useSameAsContact"
                        checked={form.useSameAsContact}
                        onChange={onChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="wa_same_sender" className="cursor-pointer text-xs font-normal text-slate-500">
                        Same as Contact
                      </label>
                    </div>
                  </label>
                  <div className="grid grid-cols-[110px,1fr] gap-2">
                    {phoneCodesLoading ? (
                      <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
                    ) : (
                      <select
                        value={whatsappCode}
                        onChange={(e) => setWhatsappCode(e.target.value)}
                        onKeyDown={waTypeahead.onKeyDown}
                        className={`${fieldBase} ${fieldDisabled}`}
                        disabled={phoneCodesLoading || form.useSameAsContact}
                      >
                        {phoneCodeOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
                      </select>
                    )}
                    <input
                      type="tel"
                      name="whatsappNumber"
                      value={form.whatsappNumber}
                      onChange={handleWaChange}
                      onPaste={handleWaPaste}
                      className={fieldBase}
                      inputMode="numeric"
                      placeholder="e.g. 501234567"
                      readOnly={form.useSameAsContact}
                      disabled={form.useSameAsContact}
                    />
                  </div>
                  {phoneCodesError && <p className="mt-1 text-xs text-rose-700">{phoneCodesError}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Documents */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">2</div>
              <h3 className="font-semibold text-slate-900">Documents</h3>
            </header>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">ID Type</label>
                  {docsLoading ? (
                    <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
                  ) : (
                    <select
                      name="senderIdType"
                      value={String(form.senderIdType || "")}
                      onChange={onChange}
                      className={fieldBase}
                      disabled={docsLoading}
                    >
                      <option value="">Select ID Type</option>
                      {docTypes.map((d) => (<option key={getDocId(d)} value={getDocId(d)}>{getDocLabel(d)}</option>))}
                    </select>
                  )}
                  {docsError && <p className="mt-1 text-sm text-rose-700">{docsError}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Document ID</label>
                  <input
                    name="senderId"
                    value={form.senderId}
                    onChange={onChange}
                    className={fieldBase}
                    placeholder="Enter ID number"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Branch Info (Visual) */}
          <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            <span>Branch: <span className="font-semibold">{branchName || `ID: ${branchId}`}</span></span>
          </div>

        </div>
      </div>

      {/* STICKY FOOTER */}
      <div className="shrink-0 border-t border-slate-200 bg-white p-4">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-3">
          {submitError && <span className="mr-auto text-sm text-rose-600 font-medium">{submitError}</span>}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitLoading}
            className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all
              ${submitLoading
                ? "cursor-not-allowed bg-indigo-400"
                : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-md focus:ring-4 focus:ring-indigo-100"
              }`}
          >
            {submitLoading ? "Updating..." : "Update Sender"}
          </button>
        </div>
      </div>
    </form>
  );
}