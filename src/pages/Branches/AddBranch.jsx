import { useEffect, useMemo, useState, useCallback } from "react";
import { storeBranch } from "../../api/branchApi";
import { getPhoneCodes } from "../../api/phoneCodeApi";
import { Link } from "react-router-dom";
import { IoGitBranch } from "react-icons/io5";
import BranchModal from "./components/BranchModal";
import { Toaster, toast } from "react-hot-toast";
import "./BranchStyles.css";

/* ---------- helpers ---------- */
const onlyDigits = (s = "") => (s || "").replace(/\D+/g, "");
const normalizeCode = (code) => {
  if (!code) return "";
  const c = String(code).trim();
  if (!c) return "";
  if (c.startsWith("+")) return c;
  if (c.startsWith("00")) return `+${c.slice(2)}`;
  return `+${c}`;
};
const dialDigits = (code) => onlyDigits(normalizeCode(code) || "");

// find the longest matching dial code at the start of a typed/pasted string
// accepts with or without '+' (e.g., "+9665..." or "9665...")
const sniffDialFromTyped = (val, dialPlusSet, dialDigitSet) => {
  if (!val) return null;
  const m = val.match(/^\+?(\d{1,5})/);
  if (!m) return null;
  const digits = m[1];
  for (let len = digits.length; len >= 1; len--) {
    const tryDigits = digits.slice(0, len);   // "966"
    const tryPlus = `+${tryDigits}`;          // "+966"
    if (dialPlusSet.has(tryPlus) || dialDigitSet.has(tryDigits)) {
      return tryDigits; // return digits only for state
    }
  }
  return null;
};

export default function AddBranch() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // form state
  const [form, setForm] = useState({
    branchName: "",
    branchNamear: "",
    location: "",
    branchCode: "",
    branchAddress: "",
    branchEmail: "",
    website: "",
    status: 1,
    // default Saudi Arabia (digits only in UI)
    contactDial: "966",
    contactNumber: "",
    altDial: "966",
    altNumber: "",
    // invoice start number (6 digits)
    startNumber: "",
    // logo
    logoFile: null,
    logoPreview: "",
  });

  // phone code list
  const [codes, setCodes] = useState([]);

  // sets for fast lookups (both styles)
  const dialPlusSet = useMemo(
    () => new Set(codes.map((c) => `+${c.dial}`)),
    [codes]
  );
  const dialDigitSet = useMemo(
    () => new Set(codes.map((c) => c.dial)),
    [codes]
  );

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const list = await getPhoneCodes({}, token);
        const norm = (list || [])
          .map((it) => {
            const d = dialDigits(
              it?.dial_code || it?.dialCode || it?.code || it?.dialCodeNumber
            );
            return d ? { label: d, dial: d } : null; // digits only
          })
          .filter(Boolean)
          .reduce((acc, cur) => {
            if (!acc.find((x) => x.dial === cur.dial)) acc.push(cur);
            return acc;
          }, [])
          .sort((a, b) => a.dial.localeCompare(b.dial));

        // Ensure 966 exists even if API missed it
        if (!norm.find((x) => x.dial === "966")) {
          norm.unshift({ label: "966", dial: "966" });
        }
        setCodes(norm);
      } catch {
        // Fallback: include SA (966) and India (91)
        setCodes([
          { label: "966", dial: "966" },
          { label: "91", dial: "91" },
        ]);
      }
    })();
  }, []);

  const update = (patch) => setForm((p) => ({ ...p, ...patch }));

  /* ---------- phone handlers (INSIDE component) ---------- */

  // type freely: never mutates dial while typing
  const handlePhoneChange = useCallback(
    (fieldNum) => (e) => {
      const digits = (e.target.value || "").replace(/\D+/g, "");
      setForm((p) => ({ ...p, [fieldNum]: digits }));
    },
    []
  );

  // paste smart: if a +code (or code) is pasted, set dial and strip it
  const handlePhonePaste = useCallback(
    (fieldDial, fieldNum) => (e) => {
      const text =
        (e.clipboardData || window.clipboardData)?.getData("text") || "";
      const foundDigits = sniffDialFromTyped(text, dialPlusSet, dialDigitSet);
      if (foundDigits) {
        e.preventDefault();
        const stripped = text.replace(new RegExp(`^\\+?${foundDigits}`), "");
        setForm((p) => ({
          ...p,
          [fieldDial]: foundDigits,
          [fieldNum]: (stripped || "").replace(/\D+/g, ""),
        }));
      }
    },
    [dialPlusSet, dialDigitSet]
  );

  const onSelectDial = (fieldDial) => (e) =>
    setForm((p) => ({ ...p, [fieldDial]: e.target.value }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    update({ [name]: name === "status" ? Number(value) : value });
  };

  // start_number: digits-only, max 6
  const handleStartNumberChange = (e) => {
    const digits = onlyDigits(e.target.value).slice(0, 6);
    setForm((p) => ({ ...p, startNumber: digits }));
  };

  // Database typically wants E.164 with +; keep outbound consistent
  const composeE164 = (dialDigitsStr, number) => {
    const n = onlyDigits(number);
    const d = onlyDigits(dialDigitsStr || "");
    return `+${d}${n}`;
  };

  // --- Logo handlers ---
  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      update({ logoFile: null, logoPreview: "" });
      return;
    }
    const validTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/avif",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload PNG/JPG/WEBP/AVIF/SVG only.");
      e.target.value = "";
      return;
    }
    const maxMB = 5;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`Logo must be ≤ ${maxMB} MB.`);
      e.target.value = "";
      return;
    }
    const preview = URL.createObjectURL(file);
    update({ logoFile: file, logoPreview: preview });
  };

  const clearLogo = () => {
    update({ logoFile: null, logoPreview: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("⚠️ You are not logged in!");
        setLoading(false);
        return;
      }

      // Validate 6-digit start number
      if (!/^\d{6}$/.test(form.startNumber)) {
        throw new Error("Invoice starting number must be exactly 6 digits.");
      }

      // Build base payload
      const payload = {
        branch_name: form.branchName.trim(),
        branch_name_ar: form.branchNamear.trim(),
        branch_code: form.branchCode.trim(),
        branch_contact_number: composeE164(
          form.contactDial,
          form.contactNumber
        ),
        branch_alternative_number: form.altNumber
          ? composeE164(form.altDial, form.altNumber)
          : null,
        branch_email: form.branchEmail.trim() || null,
        branch_address: form.branchAddress.trim(),
        branch_location: form.location.trim(),
        branch_website: form.website.trim() || null,
        status: Number(form.status) || 0,
        // NEW: start number to backend
        start_number: form.startNumber, // 6-digit string
      };

      if (!payload.branch_name) throw new Error("Branch name is required.");
      if (!payload.branch_code) throw new Error("Branch code is required.");
      if (!form.contactNumber) throw new Error("Enter a valid contact number.");

      // If logo is attached, send multipart with both `branch_logo` (preferred) and `logo` (legacy)
      let created;
      if (form.logoFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) fd.append(k, String(v));
        });
        fd.append("branch_logo", form.logoFile); // preferred
        fd.append("logo", form.logoFile);        // legacy/alternate key
        created = await storeBranch(fd, token);  // must forward as multipart/form-data
      } else {
        created = await storeBranch(payload, token);
      }

      const record = created?.branch || created?.data || created || payload;

      toast.success("Branch created successfully");
      setModalData(record);
      setModalOpen(true);

      // Reset
      setForm(() => ({
        branchName: "",
        branchNamear: "",
        location: "",
        branchCode: "",
        branchAddress: "",
        branchEmail: "",
        website: "",
        status: 1,
        contactDial: "966",
        contactNumber: "",
        altDial: "966",
        altNumber: "",
        startNumber: "",
        logoFile: null,
        logoPreview: "",
      }));
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create branch.";
      setMessage("❌ " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-5xl p-6">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="add-cargo-header flex justify-between items-center">
            <h2 className="header-cargo-heading flex items-center gap-2">
              <span className="header-cargo-icon">
                <IoGitBranch />
              </span>
              Create New Branch
            </h2>
            <nav aria-label="Breadcrumb" className="">
              <ol className="flex items-center gap-2 text-sm">
                <li>
                  <Link
                    to="/dashboard"
                    className="text-gray-500 hover:text-gray-700 hover:underline"
                  >
                    Home
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li>
                  <Link
                    to="/branches"
                    className="text-gray-500 hover:text-gray-700 hover:underline"
                  >
                    Branches
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li aria-current="page" className="text-gray-800 font-medium">
                  Add Branch
                </li>
              </ol>
            </nav>
          </div>

          {message ? (
            <div
              className={`mb-4 rounded-lg px-3 py-2 text-sm ${
                message.startsWith("✅")
                  ? "bg-emerald-50 text-emerald-700"
                  : message.startsWith("⚠️")
                  ? "bg-amber-50 text-amber-800"
                  : message.startsWith("❌")
                  ? "bg-rose-50 text-rose-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="form-grid">
            {/* 1) Code + Logo + Status */}
            <div className="grid grid-cols-3 gap-4">
              <div className="my-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Branch Code
                </label>
                <input
                  name="branchCode"
                  value={form.branchCode}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                  placeholder="e.g., BR-001"
                  required
                />
              </div>

              <div className="my-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Branch Logo (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                    onChange={handleLogo}
                    className="file-input-red block w-full text-sm text-slate-700"
                  />
                  {form.logoPreview ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={form.logoPreview}
                        alt="Logo preview"
                        className="h-12 w-12 rounded border object-contain bg-white"
                      />
                      <button
                        type="button"
                        onClick={clearLogo}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  PNG/JPG/WEBP/AVIF/SVG, max 5 MB.
                </p>
              </div>

              <div className="my-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>

            {/* 2) Names + Location */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Branch Name
                </label>
                <input
                  name="branchName"
                  value={form.branchName}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                  placeholder="e.g., Riyadh HQ"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Branch Name (Arabic)
                </label>
                <input
                  name="branchNamear"
                  value={form.branchNamear}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                  placeholder="e.g., شركة سواحل الخليج"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Location
                </label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                  placeholder="City / Area"
                  required
                />
              </div>
            </div>

            {/* 3) Address */}
            <div className="md:col-span-2 my-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Address
              </label>
              <textarea
                name="branchAddress"
                value={form.branchAddress}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                placeholder="Street, Building, Landmark"
              />
            </div>

            {/* 4) Website + Email */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 my-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Website (Optional)
                </label>
                <input
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Branch Email
                </label>
                <input
                  type="email"
                  name="branchEmail"
                  value={form.branchEmail}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                  placeholder="branch@company.com"
                />
              </div>
            </div>

            {/* NEW: start_number (right after email) */}
            <div className="my-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Invoice starting (6 digits)
              </label>
              <input
                name="startNumber"
                value={form.startNumber}
                onChange={handleStartNumberChange}
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="e.g., 100001"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                aria-describedby="start-number-help"
                required
              />
              <p id="start-number-help" className="mt-1 text-xs text-slate-500">
                Exactly 6 digits. Only numbers allowed.
              </p>
            </div>

            {/* 5) Contacts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="my-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Primary Contact
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.contactDial}
                    onChange={onSelectDial("contactDial")}
                    className="w-36 shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring"
                  >
                    {codes.length ? (
                      codes.map((c) => (
                        <option key={c.dial} value={c.dial}>
                          {c.label /* digits only */}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="966">966</option>
                        <option value="91">91</option>
                      </>
                    )}
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="tel"
                    name="contactNumber"
                    value={form.contactNumber}
                    onChange={handlePhoneChange("contactNumber")}
                    onPaste={handlePhonePaste("contactDial", "contactNumber")}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                    placeholder="Type number, or paste +9665XXXXXXXX"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Tip: Paste like{" "}
                  <code className="rounded bg-slate-100 px-1">9665XXXXXXXX</code>{" "}
                  or{" "}
                  <code className="rounded bg-slate-100 px-1">+9665XXXXXXXX</code>.
                </p>
              </div>
              <div className="my-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Alternative Contact (Optional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.altDial}
                    onChange={onSelectDial("altDial")}
                    className="w-36 shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring"
                  >
                    {codes.length ? (
                      codes.map((c) => (
                        <option key={c.dial} value={c.dial}>
                          {c.label /* digits only */}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="966">966</option>
                        <option value="91">91</option>
                      </>
                    )}
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="tel"
                    name="altNumber"
                    value={form.altNumber}
                    onChange={handlePhoneChange("altNumber")}
                    onPaste={handlePhonePaste("altDial", "altNumber")}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                    placeholder="Optional — paste +9665XXXXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="md:col-span-2 mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setForm(() => ({
                    branchName: "",
                    branchNamear: "",
                    location: "",
                    branchCode: "",
                    branchAddress: "",
                    branchEmail: "",
                    website: "",
                    status: 1,
                    contactDial: "966",
                    contactNumber: "",
                    altDial: "966",
                    altNumber: "",
                    startNumber: "",
                    logoFile: null,
                    logoPreview: "",
                  }))
                }
                className="rounded-lg border border-slate-300 px-5 py-2 text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`rounded-lg px-5 py-2 text-white transition ${
                  loading
                    ? "cursor-not-allowed bg-emerald-400"
                    : "bg-[#ED2624] hover:bg-[#ca0c09]"
                }`}
              >
                {loading ? "Submitting…" : "Create Branch"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <BranchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />
    </section>
  );
}
