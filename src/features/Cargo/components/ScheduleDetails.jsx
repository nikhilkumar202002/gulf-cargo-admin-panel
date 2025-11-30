import React from 'react';

export const ScheduleDetails = React.memo(({ form, updateForm }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-wide text-slate-700">
          Schedule & Tracking
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Date
          </label>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.date}
            onChange={(e) => updateForm(draft => { draft.date = e.target.value; })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Time
          </label>
          <input
            type="time"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.time}
            onChange={(e) => updateForm(draft => { draft.time = e.target.value; })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            LRL Tracking Code
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.lrlTrackingCode}
            onChange={(e) =>
              updateForm(draft => {
                draft.lrlTrackingCode = e.target.value;
              })
            }
            placeholder="LRL-XXXX (optional)"
          />
        </div>
      </div>
    </div>
  );
});