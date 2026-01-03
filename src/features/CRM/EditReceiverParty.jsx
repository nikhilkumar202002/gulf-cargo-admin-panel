import React from "react";
import { Toaster, toast } from "react-hot-toast";

import { getProfile } from "../../services/authService";
import { getCountries, getStatesByCountry, getDistrictsByState, getPhoneCodes, getDocumentTypes } from "../../services/coreService";
import { updateParty } from "../../services/partyService";

/* Helpers */
import {
  normalizeList,
  getDocId,
  getDocLabel,
  getId,
  labelOf,
  toApiId,
  getDialCode,
  onlyDigits,
  composeE164,
  useSelectDigitTypeahead,
} from "../../utils/receiverFormHelper";

const CUSTOMER_TYPE_RECEIVER = 2;
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

export default function EditReceiverParty({ partyId, initialParty, onClose, onSuccess }) {
  /* branch */
  const [branchId, setBranchId] = React.useState("");
  const [branchName, setBranchName] = React.useState("");

  /* doc types */
  const [docTypes, setDocTypes] = React.useState([]);
  const [docsLoading, setDocsLoading] = React.useState(true);
  const [docsError, setDocsError] = React.useState("");

  /* world data */
  const [countries, setCountries] = React.useState([]);
  const [states, setStates] = React.useState([]);
  const [districts, setDistricts] = React.useState([]);
  const [countryLoading, setCountryLoading] = React.useState(false);
  const [stateLoading, setStateLoading] = React.useState(false);
  const [districtLoading, setDistrictLoading] = React.useState(false);
  const [countryError, setCountryError] = React.useState("");
  const [stateError, setStateError] = React.useState("");
  const [districtError, setDistrictError] = React.useState("");

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
    useSameAsContact: false, // Changed logic: WA same as Contact
    contactNumber: "",
    receiverIdType: "",
    receiverId: "",
    documents: [],
    country: "",
    state: "",
    district: "",
    city: "",
    post: "",
    postal_code: "",
    address: "",
  });
  const [fileKey, setFileKey] = React.useState(0);
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
        const docsRes = await getDocumentTypes({ per_page: 1000 });
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

  /* build code list */
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
      receiverIdType: initialParty.document_type_id ? String(initialParty.document_type_id) : "",
      receiverId: initialParty.document_id || "",
      country: initialParty.country_id ? String(initialParty.country_id) : "",
      state: initialParty.state_id ? String(initialParty.state_id) : "",
      district: initialParty.district_id ? String(initialParty.district_id) : "",
      city: initialParty.city || "",
      post: initialParty.post || "",
      postal_code: initialParty.postal_code || "",
      address: initialParty.address || "",
      // If contact & WA are same, check the box
      useSameAsContact: (contactLocal === waLocal && contactCodeVal === waCodeVal && contactLocal !== "")
    }));
  }, [initialParty, phoneCodeOptions]);

  const waTypeahead = useSelectDigitTypeahead(phoneCodeOptions, setWhatsappCode);
  const contactTypeahead = useSelectDigitTypeahead(phoneCodeOptions, setContactCode);

  /* countries */
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCountryLoading(true);
        setCountryError("");
        const res = await getCountries({ per_page: 1000 });
        if (!alive) return;
        setCountries(normalizeList(res));
      } catch (e) {
        if (!alive) return;
        setCountries([]);
        setCountryError(e?.response?.data?.message || e?.message || "Failed to load countries.");
      } finally {
        if (alive) setCountryLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* states */
  React.useEffect(() => {
    if (!form.country) {
      setStates([]);
      setDistricts([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setStateLoading(true);
        setStateError("");
        setStates([]);
        const raw = await getStatesByCountry(toApiId(form.country), { per_page: 1000 });
        const all = normalizeList(raw);
        const countryIdStr = String(toApiId(form.country));
        const filtered = (all || []).filter(
          (s) => String(s.country_id ?? s.countryId ?? s?.country?.id ?? s?.country?._id) === countryIdStr
        );
        if (!alive) return;
        setStates(filtered);
      } catch (e) {
        if (!alive) return;
        setStates([]);
        setStateError(e?.response?.data?.message || e?.message || "Failed to load states.");
      } finally {
        if (alive) setStateLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [form.country]);

  /* districts */
  React.useEffect(() => {
    if (!form.state) {
      setDistricts([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setDistrictLoading(true);
        setDistrictError("");
        setDistricts([]);
        const raw = await getDistrictsByState(toApiId(form.state), { per_page: 1000 });
        const all = normalizeList(raw);
        const stateIdStr = String(toApiId(form.state));
        const filtered = (all || []).filter(
          (d) => String(d.state_id ?? d.stateId ?? d?.state?.id ?? d?.state?._id) === stateIdStr
        );
        if (!alive) return;
        setDistricts(filtered);
      } catch (e) {
        if (!alive) return;
        setDistricts([]);
        setDistrictError(e?.response?.data?.message || e?.message || "Failed to load districts.");
      } finally {
        if (alive) setDistrictLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [form.state]);

  /* general change handler */
  const onChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (name === "documents") {
      return setForm((f) => ({ ...f, documents: Array.from(files || []) }));
    }
    if (type === "checkbox") {
      return setForm((f) => {
        const next = { ...f, [name]: checked };
        // Logic: if checked, copy Contact -> WA
        if (name === "useSameAsContact" && checked) {
          next.whatsappNumber = f.contactNumber;
          setWhatsappCode(contactCode);
        }
        return next;
      });
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  /* keep WA mirrored when checkbox ON */
  React.useEffect(() => {
    if (form.useSameAsContact) {
      setForm((f) => ({ ...f, whatsappNumber: f.contactNumber }));
      setWhatsappCode(contactCode);
    }
  }, [form.useSameAsContact, form.contactNumber, contactCode]);

  /* when country changes, update phone codes */
  React.useEffect(() => {
    if (!form.country || !phoneCodes.length) return;
    const countryId = toApiId(form.country);
    const phoneCode = phoneCodes.find(p => String(p.country_id) === String(countryId));
    if (phoneCode) {
      const digits = onlyDigits(getDialCode(phoneCode));
      setWhatsappCode(digits);
      setContactCode(digits);
    }
  }, [form.country, phoneCodes]);

  /* Phone handlers */
  const handleWaChange = (e) => {
    const val = e.target.value;
    if (form.useSameAsContact) return; // Locked
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

  /* payload & submit */
  const buildPayload = () => {
    const map = {
      customer_type_id: CUSTOMER_TYPE_RECEIVER,
      name: form.name,
      whatsapp_number: composeE164(whatsappCode, form.whatsappNumber),
      contact_number: composeE164(contactCode, form.contactNumber),
      country_id: form.country ? toApiId(form.country) : "",
      state_id: form.state ? toApiId(form.state) : "",
      district_id: form.district ? toApiId(form.district) : "",
      city: form.city || "",
      post: form.post || "",
      postal_code: form.postal_code || "",
      address: form.address,
      document_type_id: form.receiverIdType ? Number(form.receiverIdType) : "",
      document_id: form.receiverId,
      branch_id: branchId ? Number(branchId) : "",
    };
    const filtered = Object.fromEntries(
      Object.entries(map).filter(([, v]) => v !== "" && v != null)
    );
    if (!form.documents?.length) return filtered;
    const f = new FormData();
    for (const [k, v] of Object.entries(filtered)) f.append(k, v);
    form.documents.forEach((file) => f.append("documents[]", file, file.name));
    if (form.documents.length === 1) {
      f.append("document", form.documents[0], form.documents[0].name);
    }
    return f;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return setSubmitError("Receiver name is required.");
    try {
      setSubmitLoading(true);
      const payload = buildPayload();
      await toast.promise(
        updateParty(partyId, payload),
        { loading: "Updating…", success: "Updated successfully", error: "Failed to update form." },
        { position: "top-right" }
      );
      if (typeof onSuccess === "function") onSuccess();
      if (typeof onClose === "function") onClose();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Failed to update form.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col bg-slate-50"
    >
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Toaster position="top-right" />

        <div className="mx-auto max-w-4xl space-y-6">

          {/* SECTION 1: Personal Details */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">1</div>
              <h3 className="font-semibold text-slate-900">Personal Details</h3>
            </header>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    className={fieldBase}
                    placeholder="Enter full name as per ID"
                  />
                </div>

                {/* Contact Number (First now) */}
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
                        {phoneCodeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
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

                {/* WhatsApp Number (Second now) */}
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>WhatsApp Number</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="wa_same"
                        name="useSameAsContact"
                        checked={form.useSameAsContact}
                        onChange={onChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="wa_same" className="cursor-pointer text-xs font-normal text-slate-500">
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
                        {phoneCodeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
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
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Address */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">2</div>
              <h3 className="font-semibold text-slate-900">Address Details</h3>
            </header>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Country</label>
                  {countryLoading ? (
                    <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
                  ) : (
                    <select
                      name="country"
                      value={String(form.country || "")}
                      onChange={(e) => {
                        onChange(e);
                        setForm((f) => ({ ...f, state: "", district: "" }));
                      }}
                      className={fieldBase}
                    >
                      <option value="">Select Country</option>
                      {countries.map((c) => (
                        <option key={getId(c)} value={getId(c)}>{labelOf(c)}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">State</label>
                  <select
                    name="state"
                    value={String(form.state || "")}
                    onChange={(e) => {
                      onChange(e);
                      setForm((f) => ({ ...f, district: "" }));
                    }}
                    className={`${fieldBase} ${fieldDisabled}`}
                    disabled={!form.country || stateLoading}
                  >
                    <option value="">Select State</option>
                    {states.map((s) => (
                      <option key={getId(s)} value={getId(s)}>{labelOf(s)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">District</label>
                  <select
                    name="district"
                    value={String(form.district || "")}
                    onChange={onChange}
                    className={`${fieldBase} ${fieldDisabled}`}
                    disabled={!form.state || districtLoading}
                  >
                    <option value="">Select District</option>
                    {districts.map((d) => (
                      <option key={getId(d)} value={getId(d)}>{labelOf(d)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
                  <input name="city" value={form.city} onChange={onChange} className={fieldBase} placeholder="City name" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Post Office</label>
                  <input name="post" value={form.post} onChange={onChange} className={fieldBase} placeholder="PO name" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Postal Code</label>
                  <input name="postal_code" value={form.postal_code} onChange={onChange} className={fieldBase} placeholder="ZIP/PIN" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  className={fieldBase}
                  rows={2}
                  placeholder="House number, street name, etc."
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Documents */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">3</div>
              <h3 className="font-semibold text-slate-900">Documents</h3>
            </header>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">ID Type</label>
                  <select name="receiverIdType" value={String(form.receiverIdType || "")} onChange={onChange} className={fieldBase}>
                    <option value="">Select ID Type</option>
                    {docTypes.map((d) => <option key={getDocId(d)} value={getDocId(d)}>{getDocLabel(d)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">ID Number</label>
                  <input name="receiverId" value={form.receiverId} onChange={onChange} className={fieldBase} placeholder="ID Number" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Upload File</label>
                  <input
                    key={fileKey}
                    type="file"
                    name="documents"
                    accept="image/*,.pdf"
                    multiple
                    onChange={onChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Branch Info (Hidden/Visual only) */}
          <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            <span>Branch: <span className="font-semibold">{branchName || `ID: ${branchId}`}</span></span>
          </div>

        </div>
      </div>

      {/* STICKY FOOTER - Always Visible */}
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
            {submitLoading ? "Saving..." : "Update Party"}
          </button>
        </div>
      </div>
    </form>
  );
}