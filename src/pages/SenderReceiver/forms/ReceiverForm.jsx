import React from "react";
import { Toaster, toast } from "react-hot-toast";
import { getProfile } from "../../../api/accountApi";
import { getDocumentTypes } from "../../../api/documentTypeApi";
import { getCountries, getStatesByCountry, getDistrictsByState } from "../../../api/worldApi";
import { getPhoneCodes } from "../../../api/phoneCodeApi";
import { createParty } from "../../../api/partiesApi";

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
} from "../../../utils/receiverFormHelper";

const CUSTOMER_TYPE_RECEIVER = 2;
const fieldBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring";
const fieldDisabled = "disabled:cursor-not-allowed disabled:bg-slate-50";

/* Local helper to detect code out of free-text like +91..., 0091..., 91... (we only react when + or 00 is present) */
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

export default function ReceiverForm({ onClose, onCreated }) {
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

  /* phone codes (digits only in UI) */
  const [phoneCodes, setPhoneCodes] = React.useState([]);
  const [phoneCodesLoading, setPhoneCodesLoading] = React.useState(true);
  const [phoneCodesError, setPhoneCodesError] = React.useState("");
  const [whatsappCode, setWhatsappCode] = React.useState("966");
  const [contactCode, setContactCode] = React.useState("966");

  /* form */
  const [form, setForm] = React.useState({
    name: "",
    whatsappNumber: "",
    useSameForContact: false, // editable by default
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

  /* build code list like ["966","91","1", ...]; keep 966 first */
  const phoneCodeOptions = React.useMemo(() => {
    const raw = (phoneCodes || []).map(getDialCode).map(onlyDigits).filter(Boolean);
    const uniq = Array.from(new Set(raw));
    if (uniq.length === 0) return ["966"];
    const rest = uniq.filter((c) => c !== "966").sort((a, b) => Number(a) - Number(b));
    return uniq.includes("966") ? ["966", ...rest] : rest;
  }, [phoneCodes]);

  /* type-ahead for selects */
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
    return () => {
      alive = false;
    };
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
        const all =
          Array.isArray(raw) ? raw :
          Array.isArray(raw?.states) ? raw.states :
          Array.isArray(raw?.data?.data) ? raw.data.data :
          Array.isArray(raw?.data) ? raw.data :
          Array.isArray(raw?.items) ? raw.items :
          normalizeList(raw);

        const countryIdStr = String(toApiId(form.country));
        const filtered = (all || []).filter(
          (s) =>
            String(s.country_id ?? s.countryId ?? s?.country?.id ?? s?.country?._id) ===
            countryIdStr
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
    return () => {
      alive = false;
    };
  }, [form.country]);

  /* districts – strictly filter by selected state */
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
        const all =
          Array.isArray(raw) ? raw :
          Array.isArray(raw?.districts) ? raw.districts :
          Array.isArray(raw?.data?.data) ? raw.data.data :
          Array.isArray(raw?.data) ? raw.data :
          Array.isArray(raw?.items) ? raw.items :
          normalizeList(raw);

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
    return () => {
      alive = false;
    };
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
        if (name === "useSameForContact" && checked) {
          next.contactNumber = f.whatsappNumber;
          setContactCode((prev) => (prev ? prev : whatsappCode));
        }
        return next;
      });
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  /* keep contact mirrored when checkbox ON */
  React.useEffect(() => {
    if (form.useSameForContact) {
      setForm((f) => ({ ...f, contactNumber: f.whatsappNumber }));
      setContactCode(whatsappCode);
    }
  }, [form.useSameForContact, form.whatsappNumber, whatsappCode]);

  /* when country changes, update phone codes */
  React.useEffect(() => {
    if (!form.country || !phoneCodes.length) return;
    const countryId = toApiId(form.country);
    const phoneCode = phoneCodes.find(
      (p) => String(p.country_id) === String(countryId)
    );
    if (phoneCode) {
      const digits = onlyDigits(getDialCode(phoneCode));
      setWhatsappCode(digits);
      setContactCode(digits);
    }
  }, [form.country, phoneCodes]);

  /* --- Phone number handlers (LOCAL, robust) --- */
  const handleWaChange = (e) => {
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

  /* payload */
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
    const filtered = Object.fromEntries(Object.entries(map).filter(([, v]) => v !== "" && v != null));
    if (!form.documents?.length) return filtered;
    const f = new FormData();
    for (const [k, v] of Object.entries(filtered)) f.append(k, v);
    form.documents.forEach((file) => f.append("documents[]", file, file.name));
    if (form.documents.length === 1) f.append("document", form.documents[0], form.documents[0].name);
    return f;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
        if (!form.name) {
        return setSubmitError("Receiver name is required.");
      }
    try {
      setSubmitLoading(true);
      const payload = buildPayload();
      const created = await toast.promise(
        createParty(payload),
        { loading: "Submitting…", success: "Saved successfully", error: "Failed to submit form." },
        { position: "top-right" }
      );
      if (typeof onCreated === "function") onCreated(created, "receiver");

      // reset & close
      setForm({
        name: "",
        whatsappNumber: "",
        useSameForContact: false,
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
      setWhatsappCode("966");
      setContactCode("966");
      setFileKey((k) => k + 1);
      if (typeof onClose === "function") onClose();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Failed to submit form.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Toaster position="top-right" />

      {/* Branch (read-only) */}
      <div className="bg-white">
     
        <div>
          <div>
            <input
              type="text"
              className={[
                fieldBase,
                "bg-slate-100 text-black cursor-default",
                "focus:ring-0 focus:border-slate-300",
                "read-only:bg-slate-100 read-only:text-slate-700 read-only:cursor-default",
                "text-[20px] font-semibold",
              ].join(" ")}
              value={branchName || (branchId ? `Branch #${branchId}` : "")}
              readOnly
              title="Auto-filled from your profile"
            />
            <input type="hidden" name="branch_id" value={branchId || ""} />
          </div>
        </div>
      </div>

               {/* Address & Geo */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-[11px] font-semibold text-white">1</div>
          <h3 className="text-sm font-semibold text-slate-900">Address</h3>
        </header>

        {/* Country / State / District */}
        <div className="grid grid-cols-1 gap-5 px-4 py-4 md:grid-cols-3">
          {/* Country */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Country</label>
            {countryLoading ? (
              <div className="h-[40px] animate-pulse rounded-lg bg-slate-200/80" />
            ) : (
              <select
                name="country"
                value={String(form.country || "")}
                onChange={(e) => {
                  onChange(e);
                  setForm((f) => ({ ...f, state: "", district: "" }));
                }}
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
            {countryError && <p className="mt-1 text-sm text-rose-700">{countryError}</p>}
          </div>

          {/* State */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">State</label>
            {stateLoading ? (
              <div className="h-[40px] animate-pulse rounded-lg bg-slate-200/80" />
            ) : (
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
                <option value="">
                  {!form.country ? "Select Country fi..." : stateLoading ? "Loading..." : "Select State"}
                </option>
                {!stateLoading &&
                  form.country &&
                  states.map((s) => (
                    <option key={getId(s)} value={getId(s)}>
                      {labelOf(s)}
                    </option>
                  ))}
              </select>
            )}
            {stateError && <p className="mt-1 text-sm text-rose-700">{stateError}</p>}
          </div>

          {/* District */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">District</label>
            {districtLoading ? (
              <div className="h-[40px] animate-pulse rounded-lg bg-slate-200/80" />
            ) : (
              <select
                name="district"
                value={String(form.district || "")}
                onChange={onChange}
                className={`${fieldBase} ${fieldDisabled}`}
                disabled={!form.state || districtLoading}
              >
                <option value="">
                  {!form.state ? "Select State fi..." : districtLoading ? "Loading..." : "Select District"}
                </option>
                {!districtLoading &&
                  form.state &&
                  districts.map((d) => (
                    <option key={getId(d)} value={getId(d)}>
                      {labelOf(d)}{/* e.g. "Krishna" */}
                    </option>
                  ))}
              </select>
            )}
            {districtError && <p className="mt-1 text-sm text-rose-700">{districtError}</p>}
          </div>
        </div>

        {/* City / Post / Postal Code */}
        <div className="grid grid-cols-1 gap-5 px-4 py-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">City</label>
            <input
              name="city"
              value={form.city}
              onChange={onChange}
              className={fieldBase}
              placeholder="Enter city"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Post</label>
            <input
              name="post"
              value={form.post}
              onChange={onChange}
              className={fieldBase}
              placeholder="Post office / locality"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Postal Code</label>
            <input
              name="postal_code"
              value={form.postal_code}
              onChange={onChange}
              className={fieldBase}
              inputMode="numeric"
              placeholder="PIN / ZIP"
            />
          </div>
        </div>

        {/* Address */}
        <div className="grid grid-cols-1 gap-5 px-4 pb-5 md:grid-cols-3">
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Address 
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={onChange}
              className={fieldBase}
              rows={3}
              placeholder="House / Building, Street"
            />
          </div>
        </div>
      </div>

      {/* Receiver identity */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-[11px] font-semibold text-white">2</div>
          <h3 className="text-sm font-semibold text-slate-900">Receiver Identity</h3>
        </header>

        <div className="grid grid-cols-1 gap-5 px-4 py-4 md:grid-cols-3">
          {/* Name */}
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
              aria-describedby="name_help"
            />
            <p id="name_help" className="mt-1 text-xs text-slate-500">As per ID / official records.</p>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp Number</label>
            <div className="grid grid-cols-[120px,1fr] gap-2">
              {phoneCodesLoading ? (
                <div className="h-[40px] animate-pulse rounded-lg bg-slate-200/80" />
              ) : (
                <select
                  value={whatsappCode}
                  onChange={(e) => setWhatsappCode(e.target.value)}
                  onKeyDown={waTypeahead.onKeyDown}
                  className={`${fieldBase} ${fieldDisabled}`}
                  disabled={phoneCodesLoading}
                  title="Tip: focus here and type digits like 91 to jump to 91"
                >
                  {phoneCodeOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
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
                placeholder="501234567"
                autoComplete="tel"
              />
            </div>
            {phoneCodesError && <p className="mt-1 text-xs text-rose-700">{phoneCodesError}</p>}
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="useSameForContact"
                checked={form.useSameForContact}
                onChange={onChange}
              />
              Use same for Contact Number
            </label>
          </div>

          {/* Contact */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Contact Number</label>
            <div className="grid grid-cols-[120px,1fr] gap-2">
              {phoneCodesLoading ? (
                <div className="h-[40px] animate-pulse rounded-lg bg-slate-200/80" />
              ) : (
                <select
                  value={contactCode}
                  onChange={(e) => setContactCode(e.target.value)}
                  onKeyDown={contactTypeahead.onKeyDown}
                  className={`${fieldBase} ${fieldDisabled}`}
                  disabled={phoneCodesLoading || form.useSameForContact}
                  title="Tip: focus here and type digits like 91 to jump to 91"
                >
                  {phoneCodeOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
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
                placeholder="501234567"
                readOnly={form.useSameForContact}
                autoComplete="tel"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 px-4 py-4 md:grid-cols-3">
          
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              ID Type 
            </label>
            {docsLoading ? (
              <div className="h-[40px] animate-pulse rounded-lg bg-slate-200/80" />
            ) : (
              <select
                name="receiverIdType"
                value={String(form.receiverIdType || "")}
                onChange={onChange}
                className={`${fieldBase} ${fieldDisabled}`}
                disabled={docsLoading}
              >
                <option value="">{docsLoading ? "Loading..." : "Select ID Type"}</option>
                {docTypes.map((d) => (
                  <option key={getDocId(d)} value={getDocId(d)}>
                    {getDocLabel(d)}
                  </option>
                ))}
              </select>
            )}
            {docsError && <p className="mt-1 text-sm text-rose-700">{docsError}</p>}
          </div>

          {/* ID Number */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Document ID
            </label>
            <input
              name="receiverId"
              value={form.receiverId}
              onChange={onChange}
              className={fieldBase}
              placeholder="Document number"
            />
          </div>

          {/* Uploads */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Upload Documents</label>
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
      </div>

      {/* actions */}
      <div className="flex items-center justify-end gap-3">
        {submitError && <p className="mr-auto text-sm text-rose-700">{submitError}</p>}
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
            submitLoading ? "cursor-not-allowed bg-rose-400" : "bg-rose-600 hover:bg-rose-700"
          }`}
        >
          {submitLoading ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
