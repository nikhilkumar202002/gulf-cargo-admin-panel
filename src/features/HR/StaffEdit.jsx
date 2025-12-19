import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { Toaster, toast } from "react-hot-toast";
import { FaUserEdit } from "react-icons/fa";
import "../Styles/Styles.css"; 

import { getStaffById, updateStaff } from "../../services/staffService";
import { 
  getActiveBranches, 
  getRoles, 
  getVisaTypes, 
  getDocumentTypes, 
  getPhoneCodes 
} from "../../services/coreService";

/* ---------- Helpers ---------- */
const toList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

const getId = (x) => x?.id ?? x?._id ?? x?.value ?? "";
const getBranchLabel = (b) => b?.branch_name ?? b?.name ?? `Branch #${b?.id}`;
const getRoleLabel = (r) => r?.role_name ?? r?.name ?? `Role #${r?.id}`;
const getDocTypeLabel = (d) => d?.name ?? d?.document_name ?? `Doc #${d?.id}`;
const getVisaTypeLabel = (v) => v?.type_name ?? v?.name ?? `Visa #${v?.id}`;

const normalizeCode = (code) => {
  if (!code) return "";
  const c = String(code).trim();
  if (c.startsWith("+")) return c;
  if (c.startsWith("00")) return `+${c.slice(2)}`;
  return `+${c}`;
};

const extractDial = (c) => {
  const raw = c?.dial_code ?? c?.code ?? c?.phone_code ?? "";
  return normalizeCode(raw);
};

const parseDate = (dateStr) => {
  if (!dateStr) return "";
  if (String(dateStr).match(/^\d{2}-\d{2}-\d{4}$/)) {
    const [d, m, y] = dateStr.split('-');
    return `${y}-${m}-${d}`;
  }
  if (dateStr.includes("T")) return dateStr.split("T")[0];
  return String(dateStr).substring(0, 10);
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRe = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export default function StaffEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- Dropdown Data ---
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [visas, setVisas] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [phoneCodes, setPhoneCodes] = useState([]);

  // --- Loading States ---
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // --- Form Fields ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); 
  const [showPwd, setShowPwd] = useState(false);
  
  const [contactNumber, setContactNumber] = useState("");
  const [phoneCodeId, setPhoneCodeId] = useState("");
  const [phoneCode, setPhoneCode] = useState("");

  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [status, setStatus] = useState("1"); 
  
  const [appointmentDate, setAppointmentDate] = useState("");
  
  // Visa
  const [selectedVisaType, setSelectedVisaType] = useState("");
  const [visaExpiryDate, setVisaExpiryDate] = useState("");
  const [visaStatus, setVisaStatus] = useState("1");

  // Document
  const [selectedDocType, setSelectedDocType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");

  // --- File Handling ---
  const [avatarPreview, setAvatarPreview] = useState(""); 
  const [existingDocs, setExistingDocs] = useState([]); 
  // const [removeDocIds, setRemoveDocIds] = useState(new Set()); // Usage if API supports deletion

  // --- Validation ---
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitMsg, setSubmitMsg] = useState({ text: "", variant: "" });

  const photoRef = useRef(null);
  const docRef = useRef(null);

  // --- Fetch Data ---
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingData(true);
        
        const [br, rl, vs, dt, pc] = await Promise.all([
            getActiveBranches().catch(() => []),
            getRoles().catch(() => []),
            getVisaTypes().catch(() => []),
            getDocumentTypes({ status: 1 }).catch(() => []),
            getPhoneCodes().catch(() => [])
        ]);

        if (cancel) return;

        const branchList = toList(br);
        const roleList = toList(rl);
        const visaList = toList(vs);
        const docList = toList(dt);
        const codeList = toList(pc);

        setBranches(branchList);
        setRoles(roleList);
        setVisas(visaList);
        setDocTypes(docList);
        setPhoneCodes(codeList);

        const res = await getStaffById(id);
        const staff = res.user || res; 
        
        if(!staff) throw new Error("Staff not found");

        setName(staff.name || "");
        setEmail(staff.email || "");
        
        const branchId = staff.branch_id || staff.branch?.id || "";
        const roleId = staff.role_id || staff.role?.id || "";
        
        setSelectedBranch(String(branchId));
        setSelectedRole(String(roleId));
        
        const isActive = String(staff.status).toLowerCase() === "active" || staff.status === 1 || staff.status === true || staff.status === "1";
        setStatus(isActive ? "1" : "0");

        setAppointmentDate(parseDate(staff.appointment_date));

        const visa = staff.visa || {};
        setSelectedVisaType(String(visa.type_id || staff.visa_type_id || ""));
        setVisaExpiryDate(parseDate(visa.expiry || staff.visa_expiry_date));
        const isVisaActive = String(visa.status).toLowerCase() === "active" || visa.status === 1;
        setVisaStatus(isVisaActive ? "1" : "0");

        const doc = staff.documents || {};
        setSelectedDocType(String(doc.document_type_id || staff.document_type_id || ""));
        setDocumentNumber(doc.document_number || staff.document_number || "");

        // --- FIX PHONE LOGIC ---
        const fullPhone = staff.contact_number || staff.phone || "";
        const normalizedPhone = normalizeCode(fullPhone);

        // Try to match the start of the phone string with one of the available codes
        // Sort codes by length desc to match longest code first (+971 vs +97)
        const sortedCodes = [...codeList].sort((a, b) => extractDial(b).length - extractDial(a).length);
        const matchedCode = sortedCodes.find(c => normalizedPhone.startsWith(extractDial(c)));

        if (matchedCode) {
            setPhoneCodeId(String(getId(matchedCode)));
            setPhoneCode(extractDial(matchedCode));
            // Remove the dial code from the number part
            setContactNumber(normalizedPhone.slice(extractDial(matchedCode).length));
        } else {
            // Default Fallback
            const defaultCode = codeList.find(c => extractDial(c) === "+966");
            if (defaultCode) {
                 setPhoneCodeId(String(getId(defaultCode)));
                 setPhoneCode(extractDial(defaultCode));
            }
            // Just remove leading + if no code matched
            setContactNumber(fullPhone.replace(/^\+/, '')); 
        }
        // -----------------------

        const avatarUrl = staff.profile_pic || staff.avatar_url;
        if(avatarUrl) setAvatarPreview(avatarUrl);

        if(doc.files && Array.isArray(doc.files)) {
            setExistingDocs(doc.files.map((url, i) => ({ id: `exist-${i}`, url, name: `Document ${i+1}` })));
        }

      } catch (e) {
        console.error(e);
        toast.error("Failed to load staff details.");
      } finally {
        if(!cancel) setLoadingData(false);
      }
    })();
    return () => { cancel = true; };
  }, [id]);

  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));
  const err = (k) => touched[k] && errors[k];

  const inputClass = (k) =>
    `mt-1 w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 ${
      err(k)
        ? "border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50/40"
        : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200 bg-white"
    }`;

  const validateAll = () => {
    const next = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!emailRe.test(email)) next.email = "Enter a valid email.";
    if (password && !passwordRe.test(password)) next.password = "Min 6 chars, include letters & numbers.";
    if (!selectedRole) next.selectedRole = "Select a role.";
    if (!selectedBranch) next.selectedBranch = "Select a branch.";
    if (!appointmentDate) next.appointmentDate = "Select appointment date.";
    return { next };
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
        setAvatarPreview(URL.createObjectURL(file));
        markTouched("profile_pic");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMsg({ text: "", variant: "" });

    const { next } = validateAll();
    setErrors(next);

    if (Object.keys(next).length > 0) {
      setTouched((t) => {
        const all = { ...t };
        Object.keys(next).forEach((k) => (all[k] = true));
        return all;
      });
      setSubmitMsg({ text: "Please fix highlighted fields.", variant: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      // Method spoofing for file upload updates in Laravel/PHP backends
      fd.append("_method", "POST"); 

      fd.append("name", name);
      fd.append("email", email);
      if(password) fd.append("password", password);

      // Construct full contact number
      const dial = phoneCode.startsWith("+") ? phoneCode : `+${phoneCode}`;
      const cleanNum = contactNumber.replace(/\D/g, "");
      fd.append("contact_number", `${dial}${cleanNum}`);
      
      fd.append("branch_id", selectedBranch);
      fd.append("role_id", selectedRole);
      fd.append("status", status);

      fd.append("appointment_date", appointmentDate);
      fd.append("visa_expiry_date", visaExpiryDate);
      fd.append("visa_type_id", selectedVisaType);
      fd.append("visa_status", visaStatus);

      fd.append("document_type_id", selectedDocType);
      fd.append("document_number", documentNumber);

      const photo = photoRef.current?.files?.[0];
      if(photo) fd.append("profile_pic", photo); 

      const newDocFiles = Array.from(docRef.current?.files ?? []);
      newDocFiles.forEach(f => fd.append("documents[]", f));

      await updateStaff(id, fd);
      
      // ✅ Success Toast
      toast.success("Staff updated successfully!");
      
      // ✅ Redirect to List
      setTimeout(() => {
          navigate("/hr&staff/allstaffs"); 
      }, 500);

    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.message || "Update failed.";
      setSubmitMsg({ text: msg, variant: "error" });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if(loadingData) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading Staff Details...</div>;

  return (
    <div className="min-h-screen w-full flex items-start justify-center p-6 bg-gray-50">
      <div className="w-full max-w-5xl">
        <Toaster position="top-right" />
        
        {/* Header + Breadcrumb */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <FaUserEdit className="text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Edit Staff</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Update staff details and documents.
              </p>
            </div>
          </div>

          <nav aria-label="Breadcrumb">
            <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-800 hover:underline">Cancel</button>
          </nav>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-slate-100">
          <form className="space-y-8" onSubmit={handleSubmit} noValidate>
            
            {/* --- Basic Details --- */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Basic Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div data-field="name">
                  <label className="block text-xs font-medium text-slate-700">Staff Name *</label>
                  <input
                    type="text"
                    className={inputClass("name")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => markTouched("name")}
                    required
                  />
                  {err("name") && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                </div>

                <div data-field="profile_pic">
                  <label className="block text-xs font-medium text-slate-700">Profile Photo</label>
                  <div className="mt-1 flex items-center gap-4">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">?</div>
                        )}
                    </div>
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      onChange={handleAvatarChange}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div data-field="email">
                  <label className="block text-xs font-medium text-slate-700">Staff Email *</label>
                  <input
                    type="email"
                    className={inputClass("email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => markTouched("email")}
                    required
                  />
                  {err("email") && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                <div data-field="password">
                  <label className="block text-xs font-medium text-slate-700">New Password (Optional)</label>
                  <div className="mt-1 relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="Leave empty to keep current"
                      className={`${inputClass("password")} pr-10`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
                      {showPwd ? <IoEyeOff size={18} /> : <IoEye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* --- Contact & Role --- */}
            <section className="space-y-4 pt-1 border-t border-slate-100">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Contact & Role</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div data-field="contactNumber">
                  <label className="block text-xs font-medium text-slate-700">Contact Number *</label>
                  <div className="mt-1 flex gap-2">
                    <div className="w-32 shrink-0">
                      <select className={inputClass("phoneCodeId")} value={phoneCodeId} onChange={(e) => {
                            setPhoneCodeId(e.target.value);
                            const obj = phoneCodes.find(c => String(getId(c)) === e.target.value);
                            if(obj) setPhoneCode(extractDial(obj));
                      }}>
                        <option value="">Code</option>
                        {phoneCodes.map((c) => (
                            <option key={getId(c)} value={String(getId(c))}>{extractDial(c)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <input type="text" className={inputClass("contactNumber")} value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div data-field="selectedRole">
                  <label className="block text-xs font-medium text-slate-700">Staff Role *</label>
                  <select className={inputClass("selectedRole")} value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                    <option value="">Select Role</option>
                    {roles.map((r) => <option key={getId(r)} value={String(getId(r))}>{getRoleLabel(r)}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* --- Branch & Dates --- */}
            <section className="space-y-4 pt-1 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div data-field="selectedBranch">
                  <label className="block text-xs font-medium text-slate-700">Branch *</label>
                  <select className={inputClass("selectedBranch")} value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={getId(b)} value={String(getId(b))}>{getBranchLabel(b)}</option>)}
                  </select>
                </div>

                <div data-field="appointmentDate">
                  <label className="block text-xs font-medium text-slate-700">Date of Appointment *</label>
                  <input type="date" className={inputClass("appointmentDate")} value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
                </div>

                <div data-field="status">
                    <label className="block text-xs font-medium text-slate-700">Status</label>
                    <select className={inputClass("status")} value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>
                </div>
              </div>
            </section>

            {/* --- Visa Details --- */}
            <section className="space-y-4 pt-1 border-t border-slate-100">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Visa Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div data-field="selectedVisaType">
                  <label className="block text-xs font-medium text-slate-700">Type of Visa</label>
                  <select className={inputClass("selectedVisaType")} value={selectedVisaType} onChange={(e) => setSelectedVisaType(e.target.value)}>
                    <option value="">Select Type</option>
                    {visas.map(v => <option key={getId(v)} value={String(getId(v))}>{getVisaTypeLabel(v)}</option>)}
                  </select>
                </div>
                
                <div data-field="visaExpiryDate">
                  <label className="block text-xs font-medium text-slate-700">Visa Expiry Date</label>
                  <input type="date" className={inputClass("visaExpiryDate")} value={visaExpiryDate} onChange={(e) => setVisaExpiryDate(e.target.value)} />
                </div>

                <div data-field="visaStatus">
                    <label className="block text-xs font-medium text-slate-700">Visa Status</label>
                    <select className={inputClass("visaStatus")} value={visaStatus} onChange={(e) => setVisaStatus(e.target.value)}>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>
                </div>
              </div>
            </section>

            {/* --- Documents --- */}
            <section className="space-y-4 pt-1 border-t border-slate-100">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Documents</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div data-field="selectedDocType">
                  <label className="block text-xs font-medium text-slate-700">Document Type</label>
                  <select className={inputClass("selectedDocType")} value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)}>
                    <option value="">Select Type</option>
                    {docTypes.map(d => <option key={getId(d)} value={String(getId(d))}>{getDocTypeLabel(d)}</option>)}
                  </select>
                </div>

                <div data-field="documentNumber">
                  <label className="block text-xs font-medium text-slate-700">Document Number</label>
                  <input type="text" className={inputClass("documentNumber")} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
                </div>

                <div data-field="newDocs">
                  <label className="block text-xs font-medium text-slate-700">Upload New Files</label>
                  <input ref={docRef} type="file" multiple className="mt-1 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                </div>
              </div>

              {/* Existing Documents List */}
              {existingDocs.length > 0 && (
                  <div className="mt-2 text-sm">
                      <span className="font-medium">Existing Files:</span>
                      <ul className="list-disc pl-5 mt-1">
                          {existingDocs.map((doc, i) => (
                              <li key={doc.id} className="text-slate-600">
                                  <a href={doc.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{doc.name}</a>
                              </li>
                          ))}
                      </ul>
                  </div>
              )}
            </section>

            {/* --- Actions --- */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-medium text-white shadow-md hover:bg-indigo-700 disabled:opacity-60">
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}