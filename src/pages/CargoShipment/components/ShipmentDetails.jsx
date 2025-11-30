import React, { useEffect } from 'react';

// Helper functions defined locally to avoid import errors
const idOf = (item) => item?.id || item?._id;
const labelOf = (item) => item?.name || item?.label || item?.title || '';

export const ShipmentDetails = React.memo(({ form, updateForm, options, loading }) => {
  
  // Effect to set default values when options are loaded and fields are empty
  useEffect(() => {
    if (loading || !options) return;

    updateForm((draft) => {
      // 1. Set Default Shipping Method: "IND SEA"
      // Only set if currently empty so we don't overwrite user changes or existing data
      if (!draft.shippingMethodId && options.methods?.length > 0) {
        const defaultMethod = options.methods.find(m => {
          const name = labelOf(m)?.toUpperCase()?.trim() || '';
          return name === "IND SEA" || name.includes("IND SEA");
        });
        
        if (defaultMethod) {
          draft.shippingMethodId = String(idOf(defaultMethod));
        }
      }

      // 2. Set Default Payment Method: "CASH PAYMENT" or "CASH"
      if (!draft.paymentMethodId && options.paymentMethods?.length > 0) {
        const defaultPayment = options.paymentMethods.find(pm => {
          const name = pm.name?.toUpperCase() || '';
          return name === "CASH PAYMENT" || name === "CASH" || name === "CASH PAYMENT OR CASH";
        });
        if (defaultPayment) {
          draft.paymentMethodId = String(defaultPayment.id);
        }
      }

      // 3. Set Default Delivery Type: "DOOR TO DOOR"
      if (!draft.deliveryTypeId && options.deliveryTypes?.length > 0) {
        const defaultDelivery = options.deliveryTypes.find(t => {
            const name = t.name?.toUpperCase() || '';
            return name === "DOOR TO DOOR";
        });
        if (defaultDelivery) {
          draft.deliveryTypeId = String(defaultDelivery.id);
        }
      }
    });
  }, [options, loading, updateForm]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold tracking-wide text-slate-700 uppercase">
          Shipment Details
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
            Shipping Method
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 h-[44px] text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={form.shippingMethodId}
              onChange={(e) => updateForm(draft => { draft.shippingMethodId = e.target.value; })}
              disabled={loading}
            >
              <option value="">Select Method...</option>
              {options.methods.map((m) => (
                <option key={String(idOf(m))} value={String(idOf(m))}>
                  {labelOf(m)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
            Payment Method
          </label>
           <div className="relative">
            <select
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 h-[44px] text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={form.paymentMethodId}
              onChange={(e) => updateForm(draft => { draft.paymentMethodId = e.target.value; })}
            >
              <option value="">Select Payment...</option>
              {options.paymentMethods.map((pm) => (
                <option key={String(pm.id)} value={String(pm.id)}>
                  {pm.name}
                </option>
              ))}
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
           </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
            Delivery Type
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 h-[44px] text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={form.deliveryTypeId}
              onChange={(e) => updateForm(draft => { draft.deliveryTypeId = e.target.value; })}
            >
              <option value="">Select Type...</option>
              {options.deliveryTypes.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});