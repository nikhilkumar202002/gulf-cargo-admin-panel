import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";

/* ---------------- Skeleton chip ---------------- */
const Skel = ({ w = 120, h = 14, r = 8, className = "" }) => (
  <span
    className={`skel ${className}`}
    style={{
      display: "inline-block",
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      borderRadius: r,
    }}
    aria-hidden="true"
  />
);

/* ---------------- Status Toggle ---------------- */
const StatusToggle = ({ value, onChange, disabled }) => {
  const active = Number(value) === 1;
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(active ? 0 : 1)}
      className={`inline-flex items-center rounded-full px-2 py-1 text-sm font-medium transition
        ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}
        ${disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-sm"}
      `}
      aria-pressed={active}
    >
      <span
        className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-slate-500"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </button>
  );
};

/* -------------- helpers -------------- */
const onlyDigits = (s = "") => (s || "").replace(/\D+/g, "");

const unwrapBranch = (res) =>
  res?.data?.branch ?? res?.data?.data ?? res?.data ?? null;

const coerceStatus = (s) => {
  if (s === 1 || s === "1" || s === true || s === "Active") return 1;
  return 0;
};

const getReturnedLogoUrl = (res) =>
  res?.data?.branch?.logo_url ??
  res?.data?.data?.logo_url ??
  res?.data?.logo_url ??
  res?.data?.branch?.logo ??
  res?.data?.data?.logo ??
  res?.data?.logo ??
  "";

const getFirstErrorMessage = (e) => {
  const msg = e?.response?.data?.message || e?.message;
  const errors = e?.response?.data?.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors)?.[0];
    if (Array.isArray(first) && first.length) return first[0];
  }
  return msg || "Something went wrong.";
};

const emptyBranch = {
  branch_name: "",
  branch_name_ar: "", // REQUIRED by backend
  branch_code: "",
  branch_contact_number: "",
  branch_alternative_number: "",
  branch_email: "",
  branch_location: "",
  branch_website: "",
  branch_address: "",
  status: 1,
  logo_url: "",
  // NEW
  start_number: "", // exactly 6 digits
};

const MAX_LOGO_MB = 2;

const EditBranch = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [branch, setBranch] = useState(emptyBranch);
  const [initial, setInitial] = useState(emptyBranch);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // logo state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoRemoved, setLogoRemoved] = useState(false);

  // strict mode guard
  const fetchedRef = useRef(false);

  useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();

    const fetchBranch = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await api.get(`/branch/${id}`, { signal: ctrl.signal });
        const b = unwrapBranch(res);
        if (!b) throw new Error("Branch details not found.");

        // tolerate different API keys for start number
        const startNo =
          b.start_number ??
          b.invoice_start_number ??
          b.invoice_start ??
          b.startNo ??
          "";

        const normalized = {
          branch_name: b.branch_name || "",
          branch_name_ar: b.branch_name_ar || "",
          branch_code: b.branch_code || "",
          branch_contact_number: b.branch_contact_number || "",
          branch_alternative_number: b.branch_alternative_number || "",
          branch_email: b.branch_email || "",
          branch_location: b.branch_location || "",
          branch_website: b.branch_website || "",
          branch_address: b.branch_address || "",
          status: coerceStatus(b.status),
          logo_url: b.logo_url || b.logo || "",
          start_number: onlyDigits(String(startNo)).slice(0, 6) || "",
        };

        if (!aborted) {
          setBranch(normalized);
          setInitial(normalized);
          setLogoPreview(normalized.logo_url || "");
          setLogoFile(null);
          setLogoRemoved(false);
        }
      } catch (e) {
        if (aborted || e?.name === "CanceledError") return;
        const msg = getFirstErrorMessage(e);
        setErr(msg);
        toast.error(msg);
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchBranch();
    } else {
      fetchBranch();
    }

    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [id]);

  const dirty = useMemo(() => {
    const coreDirty = JSON.stringify(branch) !== JSON.stringify(initial);
    const logoDirty =
      logoRemoved || !!logoFile || (initial.logo_url || "") !== (branch.logo_url || "");
    return coreDirty || logoDirty;
  }, [branch, initial, logoFile, logoRemoved]);

  const setField = (name, value) => {
    setBranch((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "status") {
      setField(name, coerceStatus(value));
    } else if (name === "branch_code") {
      setField(name, value.toUpperCase());
    } else if (name === "start_number") {
      // digits only, clamp to 6
      setField(name, onlyDigits(value).slice(0, 6));
    } else {
      setField(name, value);
    }
  };

  const validate = () => {
    if (!branch.branch_name.trim()) return "Branch name is required.";
    if (!branch.branch_name_ar.trim()) return "Branch name (Arabic) is required.";
    if (!branch.branch_code.trim()) return "Branch code is required.";
    if (
      branch.branch_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(branch.branch_email)
    ) {
      return "Please enter a valid email address.";
    }
    if (
      branch.branch_website &&
      !/^https?:\/\/[^\s.]+\.[^\s]{2,}/i.test(branch.branch_website.trim())
    ) {
      return "Website should start with http:// or https://";
    }
    // NEW: enforce exactly 6 digits
    if (!/^\d{6}$/.test(branch.start_number)) {
      return "Invoice starting number must be exactly 6 digits.";
    }
    return "";
  };

  const doSave = async (goBackAfter) => {
    const v = validate();
    if (v) {
      setErr(v);
      toast.error(v);
      return;
    }
    setErr("");
    setSaving(true);

    const payload = {
      branch_name: branch.branch_name.trim(),
      branch_name_ar: branch.branch_name_ar.trim(), // REQUIRED
      branch_code: branch.branch_code.trim(),
      branch_contact_number: branch.branch_contact_number.trim(),
      branch_alternative_number: branch.branch_alternative_number.trim(),
      branch_email: branch.branch_email.trim(),
      branch_location: branch.branch_location.trim(),
      branch_website: branch.branch_website.trim(),
      branch_address: branch.branch_address.trim(),
      status: Number(branch.status),
      // NEW
      start_number: branch.start_number, // 6-digit string
    };

    const needsMultipart = !!logoFile || logoRemoved;

    try {
      let res;
      if (!needsMultipart) {
        // JSON POST
        res = await toast.promise(
          api.post(`/branch/${id}`, payload),
          {
            loading: "Updating branch…",
            success: "Branch updated successfully.",
            error: (e) => getFirstErrorMessage(e),
          },
          { success: { duration: 1800 } }
        );
      } else {
        // multipart POST
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v ?? ""));
        if (logoFile) fd.append("logo", logoFile);
        if (logoRemoved && !logoFile) fd.append("logo_remove", "1");

        res = await toast.promise(
          api.post(`/branch/${id}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          }),
          {
            loading: logoFile ? "Uploading logo…" : "Updating…",
            success: "Branch updated successfully.",
            error: (e) => getFirstErrorMessage(e),
          },
          { success: { duration: 1800 } }
        );
      }

      const returnedLogo = getReturnedLogoUrl(res);
      const nextLogoUrl = logoRemoved ? "" : (returnedLogo || branch.logo_url || initial.logo_url);

      const nextInitial = { ...payload, logo_url: nextLogoUrl };
      setInitial(nextInitial);
      setBranch(nextInitial);
      setLogoPreview(nextLogoUrl);
      setLogoFile(null);
      setLogoRemoved(false);

      if (goBackAfter) navigate("/branches");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- file helpers ---------- */
  const fileInputRef = useRef(null);

  const fileToDataURL = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const validateAndPreview = async (f) => {
    if (!f) return false;
    if (!/^image\//i.test(f.type)) {
      toast.error("Please choose an image file (PNG/JPG/WebP).");
      return false;
    }
    if (f.size > MAX_LOGO_MB * 1024 * 1024) {
      toast.error(`Logo must be ≤ ${MAX_LOGO_MB} MB.`);
      return false;
    }
    const dataURL = await fileToDataURL(f);
    setLogoFile(f);
    setLogoPreview(dataURL);
    setLogoRemoved(false);
    return true;
  };

  const openPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleLogoPick = async (e) => {
    const f = e.target.files?.[0];
    try {
      await validateAndPreview(f);
    } catch {
      toast.error("Failed to read image preview.");
    }
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoPreview("");
    setLogoRemoved(true);
  };

  // drag & drop on dropzone
  const onDrop = async (ev) => {
    ev.preventDefault();
    const f = ev.dataTransfer?.files?.[0];
    try {
      await validateAndPreview(f);
    } catch {
      toast.error("Failed to read image preview.");
    }
  };

  const onDragOver = (ev) => ev.preventDefault();

  /* -------------------- UI -------------------- */
  if (loading) {
    return (
      <div className="px-4 py-10 flex justify-center">
        <div className="w-full max-w-5xl bg-white shadow-lg rounded-2xl p-8">
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div>
              <Skel w={180} h={22} />
              <div className="mt-2"><Skel w={260} /></div>
            </div>
            <Skel w={96} h={40} r={10} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <Skel w={96} />
                <div className="mt-2"><Skel w="100%" h={42} r={10} /></div>
              </div>
            ))}
            <div className="md:col-span-2">
              <Skel w={96} />
              <div className="mt-2"><Skel w="100%" h={96} r={12} /></div>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3 mt-2">
              <Skel w={110} h={42} r={10} />
              <Skel w={150} h={42} r={10} />
              <Skel w={150} h={42} r={10} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-10 px-4">
      <div className="w-full max-w-5xl bg-white shadow-lg rounded-2xl p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Edit Branch</h2>
            <p className="text-sm text-slate-500">Update branch profile, contact details & logo.</p>
          </div>
          <button
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 border border-slate-300 px-4 py-2 rounded-lg transition"
            onClick={() => navigate(-1)}
            type="button"
          >
            <FiArrowLeft size={18} />
            Back
          </button>
        </div>

        {/* Error banner */}
        {err && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {err}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving) doSave(true); // Save & Back
          }}
          className="space-y-8"
        >
          {/* ---- Identity ---- */}
          <fieldset className="border rounded-xl p-5">
            <legend className="text-sm font-semibold text-slate-700 px-2">Branch Identity</legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
              {/* Branch Name */}
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">Branch Name</span>
                <input
                  type="text"
                  name="branch_name"
                  value={branch.branch_name}
                  onChange={handleChange}
                  placeholder="Eg. Kochi HQ"
                  className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </label>

              {/* Branch Name (Arabic) */}
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">Branch Name (Arabic)</span>
                <input
                  type="text"
                  name="branch_name_ar"
                  value={branch.branch_name_ar}
                  onChange={handleChange}
                  placeholder="مثال: كوتشي HQ"
                  className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </label>

              {/* Branch Code */}
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">Branch Code</span>
                <input
                  type="text"
                  name="branch_code"
                  value={branch.branch_code}
                  onChange={handleChange}
                  placeholder="Eg. KCHI01"
                  className="mt-1 w-full border rounded-lg p-3 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </label>

              {/* Logo Uploader */}
              <div className="md:col-span-1">
                <span className="block text-sm font-medium text-slate-700">Branch Logo</span>
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  className="mt-2 flex items-center gap-4"
                >
                  <div className="h-16 w-28 rounded-lg border bg-slate-50 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Branch logo preview" className="max-h-16 object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400">No logo</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoPick}
                      disabled={saving}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={openPicker}
                      className="bg-slate-800 text-white px-3 py-2 rounded-lg shadow hover:bg-slate-900"
                      disabled={saving}
                    >
                      {logoPreview ? "Replace Logo" : "Upload Logo"}
                    </button>

                    {logoPreview && (
                      <button
                        type="button"
                        onClick={handleLogoRemove}
                        className="border border-rose-300 text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg"
                        disabled={saving}
                      >
                        Remove
                      </button>
                    )}

                    <p className="text-xs text-slate-500 w-full">
                      Drag & drop or click to choose. PNG/JPG/WebP, up to {MAX_LOGO_MB} MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>

          {/* ---- Contact ---- */}
          <fieldset className="border rounded-xl p-5">
            <legend className="text-sm font-semibold text-slate-700 px-2">Contact & Location</legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
              {/* Contact Number */}
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">Contact Number</span>
                <input
                  type="text"
                  name="branch_contact_number"
                  value={branch.branch_contact_number}
                  onChange={handleChange}
                  placeholder="Eg. +91 98XXXXXXX"
                  className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </label>

              {/* Alternative Number */}
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">Alternative Number</span>
                <input
                  type="text"
                  name="branch_alternative_number"
                  value={branch.branch_alternative_number}
                  onChange={handleChange}
                  placeholder="Optional"
                  className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              {/* Email */}
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  name="branch_email"
                  value={branch.branch_email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              {/* NEW: Start Number (six digits) */}
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">Invoice starting (6 digits)</span>
                <input
                  type="text"
                  name="start_number"
                  value={branch.start_number}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="e.g., 100001"
                  className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-describedby="start-number-help"
                  required
                />
                <span id="start-number-help" className="text-xs text-slate-500">
                  Exactly 6 digits. Only numbers allowed.
                </span>
              </label>

              {/* Location */}
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">City / Location</span>
                <input
                  type="text"
                  name="branch_location"
                  value={branch.branch_location}
                  onChange={handleChange}
                  placeholder="Eg. Kakkanad, Kochi"
                  className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              {/* Website */}
              <label className="block md:col-span-2">
                <span className="block text-sm font-medium text-slate-700">Website</span>
                <input
                  type="text"
                  name="branch_website"
                  value={branch.branch_website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              {/* Address */}
              <label className="block md:col-span-2">
                <span className="block text-sm font-medium text-slate-700">Address</span>
                <textarea
                  name="branch_address"
                  value={branch.branch_address}
                  onChange={handleChange}
                  placeholder="Full postal address..."
                  className="mt-1 w-full min-h-[96px] border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>
          </fieldset>

          {/* ---- Status ---- */}
          <fieldset className="border rounded-xl p-5">
            <legend className="text-sm font-semibold text-slate-700 px-2">Visibility</legend>

            <div className="grid grid-cols-1 gap-4 mt-3">
              <div className="flex items-center gap-3">
                <StatusToggle
                  value={branch.status}
                  onChange={(v) => setField("status", Number(v))}
                  disabled={saving}
                />
                <select
                  name="status"
                  value={branch.status}
                  onChange={handleChange}
                  className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-end">
            <button
              type="button"
              className="border border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-lg transition"
              onClick={() => navigate(-1)}
              disabled={saving}
            >
              Cancel
            </button>

            {/* Save & Back */}
            <button
              type="submit"
              className="bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-lg shadow transition disabled:opacity-60"
              disabled={saving || !dirty}
              title={!dirty ? "No changes to save" : ""}
            >
              {saving ? "Saving…" : "Save & Back"}
            </button>
          </div>
        </form>
      </div>

      {/* skeleton css */}
      <style>{`
        .skel { background:#e5e7eb; position:relative; overflow:hidden; }
        .skel::after { content:""; position:absolute; inset:0; transform:translateX(-100%);
          background:linear-gradient(90deg, rgba(229,231,235,0) 0%, rgba(255,255,255,.75) 50%, rgba(229,231,235,0) 100%);
          animation: skel-shimmer 1.2s infinite;
        }
        @keyframes skel-shimmer { 100% { transform: translateX(100%); } }
      `}</style>
    </div>
  );
};

export default EditBranch;
