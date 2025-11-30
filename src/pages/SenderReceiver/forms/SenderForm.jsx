// src/pages/.../SenderForm.jsx
import React from "react";
import { Toaster, toast } from "react-hot-toast";

/* APIs */
import { getProfile } from "../../../api/accountApi";
import { getDocumentTypes } from "../../../api/documentTypeApi";
import { getPhoneCodes } from "../../../api/phoneCodeApi";
import { createParty } from "../../../api/partiesApi";
import { getBranchByIdSmart } from "../../../api/branchApi";
/* Helpers */
import {
  normalizeList,
  getDocId,
  getDocLabel,
  getDialCode,
  withPlus,
  composeE164,
  useSelectDigitTypeahead,
} from "../../../utils/senderFormHelper";

const CUSTOMER_TYPE_SENDER = 1;
const fieldBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring";
const fieldDisabled = "disabled:cursor-not-allowed disabled:bg-slate-50";

export default function SenderForm({ onClose, onCreated }) {
  const [branchId, setBranchId] = React.useState("");
  const [branchName, setBranchName] = React.useState("");

  const [docTypes, setDocTypes] = React.useState([]);
  const [docsLoading, setDocsLoading] = React.useState(true);
  const [docsError, setDocsError] = React.useState("");

  const [phoneCodes, setPhoneCodes] = React.useState([]);
  const [phoneCodesLoading, setPhoneCodesLoading] = React.useState(true);
  const [phoneCodesError, setPhoneCodesError] = React.useState("");

  const [contactCode, setContactCode] = React.useState("+966");

  const [form, setForm] = React.useState({
    name: "",
    contactNumber: "",
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
      // Fetch profile and other initial data in parallel
      const [profileRes, docsRes, codesRes] = await Promise.all([
        getProfile(),
        getDocumentTypes({ per_page: 1000 }),
        getPhoneCodes({ per_page: 1000 }),
      ]);

      // Process profile and branch
      const profileData = profileRes?.data?.user || profileRes?.user || profileRes?.data || profileRes || {};
      const branchDetails = profileData?.branch || profileData?.branch_details || {};
      const profileBranchId = branchDetails?.id || profileData?.branch_id || profileData?.branchId || "";
      const profileBranchName = branchDetails?.branch_name || branchDetails?.name || "Branch";

      setBranchId(String(profileBranchId));
      setBranchName(profileBranchName || (profileBranchId ? `Branch #${profileBranchId}` : ""));

      // Set city from profile if available, then fetch full branch details to refine it
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

      // Process document types
      setDocTypes(normalizeList(docsRes));
      setDocsLoading(false);

      // Process phone codes
      setPhoneCodes(Array.isArray(codesRes) ? codesRes : []);
      setPhoneCodesLoading(false);

    } catch (err) {
      console.error("❌ Failed to fetch profile/branch:", err);
      setBranchId("");
      setBranchName("");
      setForm((f) => ({ ...f, city: "Riyadh" }));
      setDocsError("Failed to load document types.");
      setPhoneCodesError("Failed to load phone codes.");
      setDocsLoading(false);
      setPhoneCodesLoading(false);
    }
  })();
}, []);


  /* ---------------- Document Types ---------------- */
  React.useEffect(() => {
  }, []);

  /* ---------------- Phone Codes ---------------- */
  React.useEffect(() => {
  }, []);

  /* ---------------- Helpers ---------------- */
  const allDialCodes = React.useMemo(() => {
    const raw = (Array.isArray(phoneCodes) ? phoneCodes : [])
      .map(getDialCode)
      .map(withPlus)
      .filter(Boolean);
    const uniq = Array.from(new Set(raw));
    if (uniq.length === 0) return ["+966"];
    const rest = uniq
      .filter((c) => c !== "+966")
      .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    return uniq.includes("+966") ? ["+966", ...rest] : rest;
  }, [phoneCodes]);

  const codeTypeahead = useSelectDigitTypeahead(allDialCodes, setContactCode);

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "documents") {
      setForm((f) => ({ ...f, documents: Array.from(files || []) }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const buildPayload = () => {
    const map = {
      customer_type_id: CUSTOMER_TYPE_SENDER,
      name: form.name,
      contact_number: composeE164(contactCode, form.contactNumber),
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
        senderIdType: "",
        senderId: "",
        documents: [],
        city: form.city, // Preserve the original city from the profile
      });
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

        {/* Name + Phone + City */}
        <div className="grid grid-cols-1 gap-5 px-4 py-4 md:grid-cols-4">
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

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Phone
            </label>
            <div className="grid grid-cols-[120px,1fr] gap-2">
              {phoneCodesLoading ? (
                <div className="h-[40px] animate-pulse rounded-lg bg-slate-200/80" />
              ) : (
                <select
                  value={contactCode}
                  onChange={(e) => setContactCode(e.target.value)}
                  onKeyDown={codeTypeahead.onKeyDown}
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
                name="contactNumber"
                value={form.contactNumber}
                onChange={onChange}
                className={fieldBase}
                inputMode="numeric"
                placeholder="501234567"
              />
            </div>
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

        {/* ID Type + Document ID + Uploads (optional now) */}
        <div className="grid grid-cols-1 gap-5 px-4 py-4 md:grid-cols-3">
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
