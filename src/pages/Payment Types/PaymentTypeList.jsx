import React, { useEffect, useState, useCallback } from "react";
import { getAllPaymentMethods, createPaymentMethod } from "../../api/paymentMethod";
import { useLocation, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

/* ---------------- utils ---------------- */
function classNames(...cls) { return cls.filter(Boolean).join(" "); }
const Spinner = ({ className = "h-4 w-4 text-indigo-600" }) => (
  <svg className={classNames("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);
const StatusBadge = ({ active }) => (
  <span
    className={classNames(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
      active ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
             : "bg-gray-100 text-gray-700 ring-gray-400/20"
    )}
  >
    <span className={classNames("mr-1 h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-gray-400")} />
    {active ? "Active" : "Inactive"}
  </span>
);

/* ---------------- modal ---------------- */
function Modal({ open, title = "", onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title || "Dialog"}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      {/* Panel */}
      <div className="absolute inset-0 flex items-start justify-center overflow-y-auto p-4">
        <div
          className="mt-16 w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* -------- create form (inline) -------- */
function CreatePaymentMethodForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({ name: "", status: "1" }); // 1=Active, 0=Inactive
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback(() => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    else if (form.name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    if (!["0", "1"].includes(form.status)) e.status = "Pick Active or Inactive.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Fix the errors and try again.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name: form.name.trim(), status: Number(form.status) };
      await createPaymentMethod(payload);
      toast.success(`"${payload.name}" added.`);
      onSuccess?.({
        title: "Payment method created",
        message: `"${payload.name}" has been added successfully.`,
      });
      setForm({ name: "", status: "1" });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to create payment method.";
      setErrors((s) => ({ ...s, _server: msg }));
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors._server ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{errors._server}</div>
      ) : null}

      {/* Name */}
      <div>
        <label htmlFor="pm-name" className="mb-1 block text-sm font-medium text-gray-800">
          Name <span className="text-red-600">*</span>
        </label>
        <input
          id="pm-name"
          name="name"
          type="text"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          placeholder="e.g., Cash, Credit Card, UPI"
          className={classNames(
            "w-full rounded-lg border px-3 py-2 text-gray-900 outline-none focus:ring-2",
            errors.name ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-indigo-200"
          )}
          disabled={submitting}
          autoFocus
        />
        {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
      </div>

      {/* Status */}
      <div>
        <label htmlFor="pm-status" className="mb-1 block text-sm font-medium text-gray-800">
          Status
        </label>
        <select
          id="pm-status"
          name="status"
          value={form.status}
          onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
          className={classNames(
            "w-full rounded-lg border px-3 py-2 text-gray-900 outline-none focus:ring-2",
            errors.status ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-indigo-200"
          )}
          disabled={submitting}
        >
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
        {errors.status ? <p className="mt-1 text-xs text-red-600">{errors.status}</p> : null}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={classNames(
            "inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm",
            "hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/20",
            submitting && "opacity-70"
          )}
        >
          {submitting ? <Spinner className="h-4 w-4 text-white" /> : null}
          {submitting ? "Saving..." : "Create"}
        </button>
      </div>
    </form>
  );
}

/* --------------- main list --------------- */
export default function PaymentTypeList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" }); // keeping this for optional bottom banner
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openCreate, setOpenCreate] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setMsg({ text: "", variant: "" });
    try {
      const response = await getAllPaymentMethods();
      const list = response?.data ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      const msgText = err?.response?.data?.message || "Failed to load payment types.";
      setMsg({ text: msgText, variant: "error" });
      toast.error(msgText);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // If any route pushed a toast via navigate(..., { state: { toast: ... }})
  useEffect(() => {
    if (location.state?.toast) {
      const t = location.state.toast;
      // accept {type?: 'success'|'error'|'message', title?, message?}
      const label = [t.title, t.message].filter(Boolean).join(" — ");
      if (t.type === "error") toast.error(label || "Something went wrong.");
      else toast.success(label || "Done.");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // simple client filters
  const filteredRows = rows.filter((r) => {
    const matchesQuery = String(r?.name || "").toLowerCase().includes(query.toLowerCase());
    const active = String(r?.status).toLowerCase() === "active" || r?.status === 1 || r?.status === "1";
    const matchesStatus =
      statusFilter === "all" ? true :
      statusFilter === "1" ? active : !active;
    return matchesQuery && matchesStatus;
  });

  return (
    <section className="mx-auto max-w-6xl p-4">
      {/* Hot Toast portal */}
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">Payment Types</h1>

          <div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
            {/* Search */}
            <label className="relative w-full sm:max-w-xs">
              <span className="sr-only">Search by name</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
              <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </label>

            {/* Status filter */}
            <label className="relative">
              <span className="sr-only">Filter by status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-w-[11rem] appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                title="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
              </svg>
            </label>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchRows}
              disabled={loading}
              className={classNames(
                "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition",
                "hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/20",
                loading && "opacity-60"
              )}
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4 text-white" /> Refreshing…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M12 4a8 8 0 017.446 5.032.75.75 0 01-1.392.536A6.5 6.5 0 105.5 12h1.75a.75.75 0 010 1.5H4.25A.75.75 0 013.5 12v-3a.75.75 0 011.5 0v1.26A8 8 0 0112 4zm6.75 6.5a.75.75 0 01.75.75v3a.75.75 0 01-.75.75H15a.75.75 0 010-1.5h1.76A6.5 6.5 0 1112 5.5a.75.75 0 010 1.5 5 5 0 105 5h1.75z" />
                  </svg>
                  Refresh
                </>
              )}
            </button>

            {/* Add New (opens modal) */}
            <button
              type="button"
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M12 4.5a.75.75 0 01.75.75v6h6a.75.75 0 010 1.5h-6v6a.75.75 0 01-1.5 0v-6h-6a.75.75 0 010-1.5h6v-6A.75.75 0 0112 4.5z"/>
              </svg>
              Add New
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-700">
              <tr className="border-b border-gray-200">
                <th className="w-16 px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="w-40 px-4 py-3 font-semibold">Status</th>
                {/* <th className="w-44 px-4 py-3 font-semibold">Actions</th> */}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    Loading payment types...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    No payment types found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => {
                  const active =
                    String(r?.status).toLowerCase() === "active" ||
                    r?.status === 1 ||
                    r?.status === "1";
                  return (
                    <tr
                      key={r?.id ?? idx}
                      className="odd:bg-white even:bg-gray-50 transition-colors hover:bg-indigo-50/40"
                    >
                      <td className="px-4 py-4 text-gray-700">{idx + 1}</td>
                      <td className="px-4 py-4 text-gray-900">{r?.name ?? "-"}</td>
                      <td className="px-4 py-4"><StatusBadge active={active} /></td>
                      {/* <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => alert(`Edit "${r?.name}" (id: ${r?.id})`)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 hover:shadow focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.65-1.65a1.875 1.875 0 112.652 2.652l-11 11a4.5 4.5 0 01-1.897 1.13l-3.288.94a.375.375 0 01-.46-.46l.94-3.288a4.5 4.5 0 011.13-1.897l10.273-10.273z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
                            </svg>
                            Edit
                          </button>
                        </div>
                      </td> */}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* bottom error (optional) */}
        {msg.text && (
          <div
            className={classNames(
              "border-t px-4 py-3 text-sm",
              msg.variant === "error" ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-800 border-amber-100"
            )}
          >
            {msg.text}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={openCreate}
        title="Create Payment Method"
        onClose={() => setOpenCreate(false)}
      >
        <CreatePaymentMethodForm
          onCancel={() => setOpenCreate(false)}
          onSuccess={async () => {
            setOpenCreate(false);
            await fetchRows();
            // success toast already fired inside form; this keeps route/state toasts optional
          }}
        />
      </Modal>
    </section>
  );
}
