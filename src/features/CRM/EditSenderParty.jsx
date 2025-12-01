import React from "react";
import { Toaster, toast } from "react-hot-toast";

import { getProfile } from "../../api/accountApi";
import { getActiveDocumentTypes } from "../../services/coreService";
import { getPhoneCodes } from "../../api/phoneCodeApi";
import { updateParty } from "../../api/partiesApi";

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
const fieldBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring";
const fieldDisabled = "disabled:cursor-not-allowed disabled:bg-slate-50";

/**
 * Splits an E.164 number into a country code and local number.
 * @param {string} value The full phone number (e.g., "+966501234567").
 * @param {string[]} codeListDigits A list of valid country codes (e.g., ["966", "91", "1"]).
 * @returns {{code: string, local: string} | null}
 */
function splitE164(value, codeListDigits) {
  if (!value) return null;
  const s = String(value).replace(/\D/g, ""); // "966501234567"
  if (!s) return null;

  for (const code of codeListDigits) {
    if (s.startsWith(code)) {
      return { code, local: s.substring(code.length) };
    }
  }
  return null; // No matching code found
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
    return () => {
      alive = false;
    };
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
    return () => {
      alive = false;
    };
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
    return () => {
      alive = false;
    };
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

    const wa = splitE164(initialParty.whatsapp_number, phoneCodeOptions);
    if (wa) {
      setWhatsappCode(wa.code);
      setForm((prev) => ({ ...prev, whatsappNumber: wa.local }));
    } else {
      setForm((prev) => ({ ...prev, whatsappNumber: onlyDigits(initialParty.whatsapp_number || "") }));
    }

    const contact = splitE164(initialParty.contact_number, phoneCodeOptions);
    if (contact) {
      setContactCode(contact.code);
      setForm((prev) => ({ ...prev, contactNumber: contact.local }));
    } else {
      setForm((prev) => ({ ...prev, contactNumber: onlyDigits(initialParty.contact_number || "") }));
    }

    setForm((prev) => ({ ...prev, name: initialParty.name || "" }));
    setForm((prev) => ({ ...prev, senderIdType: initialParty.document_type_id ? String(initialParty.document_type_id) : "" }));
    setForm((prev) => ({ ...prev, senderId: initialParty.document_id || "" }));
  }, [initialParty, phoneCodeOptions]);

  const waTypeahead = useSelectDigitTypeahead(phoneCodeOptions, setWhatsappCode);
  const contactTypeahead = useSelectDigitTypeahead(phoneCodeOptions, setContactCode);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
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
    
    <form onSubmit={handleSubmit} className="space-y-6">
      <Toaster position="top-right" />
      <h2 className="text-xl font-semibold text-slate-800">Edit Sender</h2>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name <span className="text-rose-600">*</span></label>
          <input name="name" value={form.name} onChange={onChange} className={fieldBase} placeholder="Full name" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Branch</label>
          <input type="text" value={branchName || `Branch #${branchId}`} readOnly className={`${fieldBase} bg-slate-100`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Contact Number</label>
          <div className="grid grid-cols-[120px,1fr] gap-2">
            <select value={contactCode} onChange={(e) => setContactCode(e.target.value)} onKeyDown={contactTypeahead.onKeyDown} className={`${fieldBase} ${fieldDisabled}`} disabled={phoneCodesLoading}>
              {phoneCodeOptions.map((c) => (<option key={c} value={c}>+{c}</option>))}
            </select>
            <input type="tel" name="contactNumber" value={form.contactNumber} onChange={onChange} className={fieldBase} placeholder="501234567" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp Number</label>
          <div className="grid grid-cols-[120px,1fr] gap-2">
            <select value={whatsappCode} onChange={(e) => setWhatsappCode(e.target.value)} onKeyDown={waTypeahead.onKeyDown} className={`${fieldBase} ${fieldDisabled}`} disabled={phoneCodesLoading}>
              {phoneCodeOptions.map((c) => (<option key={c} value={c}>+{c}</option>))}
            </select>
            <input type="tel" name="whatsappNumber" value={form.whatsappNumber} onChange={onChange} className={fieldBase} placeholder="501234567" />
          </div>
          {phoneCodesError && <p className="mt-1 text-sm text-rose-700">{phoneCodesError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">ID Type</label>
          <select name="senderIdType" value={String(form.senderIdType || "")} onChange={onChange} className={`${fieldBase} ${fieldDisabled}`} disabled={docsLoading}>
            <option value="">{docsLoading ? "Loading..." : "Select ID Type"}</option>
            {docTypes.map((d) => (<option key={getDocId(d)} value={getDocId(d)}>{getDocLabel(d)}</option>))}
          </select>
          {docsError && <p className="mt-1 text-sm text-rose-700">{docsError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Document ID</label>
          <input name="senderId" value={form.senderId} onChange={onChange} className={fieldBase} placeholder="Document number" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        {submitError && <p className="mr-auto text-sm text-rose-700">{submitError}</p>}
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={submitLoading} className={`rounded-lg px-5 py-2 text-white transition ${submitLoading ? "cursor-not-allowed bg-rose-400" : "bg-rose-600 hover:bg-rose-700"}`}>
          {submitLoading ? "Updating…" : "Update Sender"}
        </button>
      </div>
    </form>
  );
}