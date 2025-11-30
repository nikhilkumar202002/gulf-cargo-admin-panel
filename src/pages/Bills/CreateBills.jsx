// src/pages/PhysicalBills/CreateBills.jsx
import React, { useEffect, useState } from "react";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { Link } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import "./PhysicalBill.css";
import { getActiveShipmentMethods } from "../../api/shipmentMethodApi";
import { createCustomShipment } from "../../api/billApi"; // <-- NEW

function CreateBills() {
  const FIXED_STATUS = 13; // locked status

  const [form, setForm] = useState({
    bill_no: "",
    pcs: "",
    weight: "",
    shipment_method: "",
    destination: "",
    status: FIXED_STATUS, // keep in state for payload preview
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false); // <-- NEW
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [methodOptions, setMethodOptions] = useState([{ id: "", name: "Loading…" }]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingMethods(true);
        const methods = await getActiveShipmentMethods();
        if (!alive) return;
        const opts = methods?.length
          ? methods.map((m) => ({
              id: String(m?.id ?? m?.code ?? m?.uuid ?? m?.value ?? m?.name ?? ""),
              name: String(m?.name ?? m?.label ?? m?.code ?? "Unnamed"),
            }))
          : [];
        setMethodOptions([{ id: "", name: "Select shipment method" }, ...opts]);
      } catch (err) {
        setMethodOptions([{ id: "", name: "Failed to load methods" }]);
        toast.error("Failed to load shipment methods.");
      } finally {
        setLoadingMethods(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value, status: FIXED_STATUS }));
  };

  const validate = () => {
    const e = {};
    if (!form.bill_no.trim()) e.bill_no = "Invoice/Bill number is required";
    if (!form.pcs) e.pcs = "Pcs is required";
    if (form.pcs && Number(form.pcs) <= 0) e.pcs = "Pcs must be greater than 0";
    if (!form.weight) e.weight = "Weight is required";
    if (form.weight && Number(form.weight) <= 0) e.weight = "Weight must be greater than 0";
    if (!form.shipment_method) e.shipment_method = "Select a shipment method";
    if (!form.destination.trim()) e.destination = "Destination is required";
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    if (Object.keys(eObj).length) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    try {
      setSubmitting(true);

      // Convert selected method ID → name (API sample shows "Air")
      const selectedMethod = methodOptions.find((m) => m.id === form.shipment_method);
      const shipmentMethodName =
        selectedMethod && selectedMethod.name !== "Select shipment method"
          ? selectedMethod.name
          : form.shipment_method;

      // Build API payload:
      // - keep status fixed to "enquiry collected" (backend may override)
      // - map 'destination' → 'des' to match your sample response keys
      const payload = {
        invoice_no: form.bill_no, // if backend expects 'invoice_no'; else change to bill_no
        pcs: Number(form.pcs),
        weight: Number(form.weight),
        shipment_method: shipmentMethodName,
        status: form.status,
        des: form.destination,
      };

      // If your backend expects 'bill_no' not 'invoice_no', swap the key above.
      // Example alt payload:
      // const payload = { bill_no: form.bill_no, ... }

      const { data } = await createCustomShipment(payload);

      if (data?.success) {
        // success toast with details from server
        toast.success(
          data?.message
            ? `${data.message} (Invoice: ${data?.data?.invoice_no ?? form.bill_no})`
            : `Shipment created. Invoice: ${data?.data?.invoice_no ?? form.bill_no}`
        );

        // Reset form (keep fixed status)
        setForm({
          bill_no: "",
          pcs: "",
          weight: "",
          shipment_method: "",
          destination: "",
          status: FIXED_STATUS,
        });
      } else {
        // Generic failure path if success flag missing/false
        toast.error(data?.message || "Failed to create shipment.");
      }
    } catch (err) {
      // Try to surface backend validation errors if present
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Could not create shipment. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldBase =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500";
  const labelBase = "block text-sm font-medium text-slate-700 mb-1";
  const errorBase = "mt-1 text-xs text-rose-600";

  return (
    <>
      <Toaster position="top-right" /> {/* <-- Toast mount */}

      <section className="physical-invoice">
        <div className="physical-invoice-container max-w-5xl mx-auto my-10">
          <div className="physical-invoice-header flex justify-between items-center">
            <h2 className="physical-invoice-header-heading flex items-center gap-2">
              <span className="physical-invoice-header-icon">
                <LiaFileInvoiceDollarSolid />
              </span>
              Create Physical Bills
            </h2>

            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm">
                <li>
                  <Link to="/dashboard" className="text-gray-500 hover:text-gray-700 hover:underline">
                    Home
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li>
                  <Link to="/cargo/allcargolist" className="text-gray-500 hover:text-gray-700 hover:underline">
                    All Physical Bills
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li aria-current="page" className="text-gray-800 font-medium">
                  Add Bills
                </li>
              </ol>
            </nav>
          </div>

          <div className="physical-invoice-form my-4">
            <form
              onSubmit={onSubmit}
              noValidate
              className="bg-white/70 backdrop-blur rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100"
            >
              {/* Locked status indicator + hidden field */}
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-slate-600">Status:</span>
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                  title="Fixed"
                >
                  ● enquiry collected
                </span>
                <input type="hidden" name="status" value={FIXED_STATUS} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-5">
                {/* Invoice / Bill Number */}
                <div>
                  <label htmlFor="bill_no" className={labelBase}>
                    Invoice / Bill Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="bill_no"
                    name="bill_no"
                    type="text"
                    placeholder="e.g., INV-2025-00123"
                    className={fieldBase}
                    value={form.bill_no}
                    onChange={onChange}
                    aria-invalid={!!errors.bill_no}
                    aria-describedby={errors.bill_no ? "err-bill_no" : undefined}
                  />
                  {errors.bill_no && (
                    <p id="err-bill_no" className={errorBase}>
                      {errors.bill_no}
                    </p>
                  )}
                </div>

                {/* Pcs */}
                <div>
                  <label htmlFor="pcs" className={labelBase}>
                    Pcs <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="pcs"
                    name="pcs"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g., 10"
                    className={fieldBase}
                    value={form.pcs}
                    onChange={onChange}
                    aria-invalid={!!errors.pcs}
                    aria-describedby={errors.pcs ? "err-pcs" : undefined}
                  />
                  {errors.pcs && (
                    <p id="err-pcs" className={errorBase}>
                      {errors.pcs}
                    </p>
                  )}
                </div>

                {/* Weight */}
                <div>
                  <label htmlFor="weight" className={labelBase}>
                    Weight (kg) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="weight"
                    name="weight"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 37.80"
                    className={fieldBase}
                    value={form.weight}
                    onChange={onChange}
                    aria-invalid={!!errors.weight}
                    aria-describedby={errors.weight ? "err-weight" : undefined}
                  />
                  {errors.weight && (
                    <p id="err-weight" className={errorBase}>
                      {errors.weight}
                    </p>
                  )}
                </div>

                {/* Shipment Method (fetched) */}
                <div>
                  <label htmlFor="shipment_method" className={labelBase}>
                    Shipment Method <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="shipment_method"
                    name="shipment_method"
                    className={fieldBase}
                    value={form.shipment_method}
                    onChange={onChange}
                    disabled={loadingMethods || methodOptions.length === 0}
                    aria-invalid={!!errors.shipment_method}
                    aria-describedby={errors.shipment_method ? "err-shipment_method" : undefined}
                  >
                    {methodOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  {errors.shipment_method && (
                    <p id="err-shipment_method" className={errorBase}>
                      {errors.shipment_method}
                    </p>
                  )}
                </div>

                {/* Destination */}
                <div className="md:col-span-2">
                  <label htmlFor="destination" className={labelBase}>
                    Destination <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="destination"
                    name="destination"
                    type="text"
                    placeholder="City, State, Country (e.g., Kochi, Kerala, India)"
                    className={fieldBase}
                    value={form.destination}
                    onChange={onChange}
                    aria-invalid={!!errors.destination}
                    aria-describedby={errors.destination ? "err-destination" : undefined}
                  />
                  {errors.destination && (
                    <p id="err-destination" className={errorBase}>
                      {errors.destination}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="w-full mt-6 flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      bill_no: "",
                      pcs: "",
                      weight: "",
                      shipment_method: "",
                      destination: "",
                      status: FIXED_STATUS, // keep fixed
                    })
                  }
                  className="bill-reset-btn"
                  title="Clear form"
                  disabled={submitting}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="bill-submit-btn"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? "Saving…" : "Save Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

export default CreateBills;
