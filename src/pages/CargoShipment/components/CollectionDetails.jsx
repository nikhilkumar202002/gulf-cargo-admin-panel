import React from 'react';
import { labelOf, prettyDriver } from '../../../utils/cargoHelpers';
import { RiFileList2Line } from "react-icons/ri";

export const CollectionDetails = React.memo(({ form, onRoleChange, updateForm, collectedByOptions, collectRoles }) => {
  const isOfficeRoleAutoSelected = form.collectedByRoleName === 'Office' && form.collectedByPersonId;

  const selectedPerson = React.useMemo(() => {
    if (!form.collectedByPersonId || !collectedByOptions.length) return null;
    return collectedByOptions.find(opt => {
      const valueId = form.collectedByRoleName === "Driver"
        ? opt?.id ?? opt?.driver_id ?? null
        : opt?.user_id ?? opt?.staff_id ?? opt?.id ?? null;
      return String(valueId) === String(form.collectedByPersonId);
    });
  }, [form.collectedByPersonId, form.collectedByRoleName, collectedByOptions]);

  const selectedPersonLabel = React.useMemo(() => {
    if (!selectedPerson) return '';
    return form.collectedByRoleName === "Driver" ? prettyDriver(selectedPerson) : labelOf(selectedPerson);
  }, [selectedPerson, form.collectedByRoleName]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
        <RiFileList2Line className="text-lg text-indigo-600" />
        <h3 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
          Collection Details
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Invoice No */}
          <div className='space-y-1.5'>
            <label className="block text-xs font-semibold text-slate-500 uppercase">Invoice No</label>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-base font-bold text-slate-800 border border-slate-200">
              {form.invoiceNo || "BR:000001"}
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(form.invoiceNo || "")}
                className="ml-2 rounded bg-white border border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm active:bg-slate-100"
              >
                COPY
              </button>
            </div>
          </div>

          {/* Branch */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase">Branch</label>
            <div className="flex items-center rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 border border-slate-200 h-[44px]">
              {form.branchName || "--"}
            </div>
          </div>

        {/* Role */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase">
            Collected By (Role)
          </label>
          {isOfficeRoleAutoSelected ? (
            <input
              type="text"
              readOnly
              className="w-full rounded-lg border-slate-200 bg-slate-100 text-slate-500 px-3 py-2.5 h-[44px] text-sm font-medium focus:ring-0"
              value={form.collectedByRoleName}
            />
          ) : (
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 h-[44px] text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={form.collectedByRoleId}
                onChange={onRoleChange}
              >
                <option value="">Select role...</option>
                {collectRoles.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          )}
        </div>

        {/* Person */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase">
            Collected By (Person)
          </label>
          {isOfficeRoleAutoSelected ? (
            <input
              type="text"
              readOnly
              className="w-full rounded-lg border-slate-200 bg-slate-100 text-slate-500 px-3 py-2.5 h-[44px] text-sm font-medium focus:ring-0"
              value={selectedPersonLabel}
            />
          ) : (
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 h-[44px] text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                value={form.collectedByPersonId}
                onChange={(e) => updateForm(draft => { draft.collectedByPersonId = e.target.value; })}
                disabled={!form.collectedByRoleName}
              >
                <option value="">Select person...</option>
                {collectedByOptions.map((opt, i) => {
                  const valueId = form.collectedByRoleName === "Driver" ? opt?.id ?? opt?.driver_id ?? null : opt?.staff_id ?? opt?.user_id ?? opt?.id ?? null;
                  if (!valueId) return null;
                  const label = form.collectedByRoleName === "Driver" ? prettyDriver(opt) : labelOf(opt);
                  return (<option key={`${valueId}-${i}`} value={String(valueId)}>{label}</option>);
                })}
              </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});