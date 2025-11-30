import React from "react";
import { addressFromParty, phoneFromParty } from "../../../utils/cargoHelpers";
import { FaUserPlus } from "react-icons/fa";
import { FiSend, FiUserCheck } from "react-icons/fi";

export const PartyInfo = React.memo(
  ({
    form,
    updateForm,
    options,
    loading,
    onSenderAdd,
    onReceiverAdd,
    selectedSender,
    selectedReceiver,
  }) => {
    const handleSelectChange = (e, type) => {
      const id = e.target.value;
      updateForm((d) => {
        if (type === "sender") {
          d.senderId = id;
          d.senderAddress = "";
          d.senderPhone = "";
        } else if (type === "receiver") {
          d.receiverId = id;
          d.receiverAddress = "";
          d.receiverPhone = "";
        }
      });
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================== SENDER INFO ================== */}
        <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:border-l border-l-4 border-l-emerald-500">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700">
              <FiSend className="text-lg" />
              <h3 className="text-sm font-bold tracking-wide uppercase">
                Sender Info
              </h3>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSenderAdd();
              }}
              className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all border border-emerald-200"
            >
              <FaUserPlus />
              <span>Add New</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <select
                key={`${options.senders.length}-${form.senderId}`}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-[44px]"
                value={form.senderId || ""}
                onChange={(e) => handleSelectChange(e, "sender")}
                disabled={loading}
              >
                <option value="">Select Sender...</option>
                {options.senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s.name || "").toUpperCase()}
                  </option>
                ))}
              </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</span>
                <span className="text-slate-800 font-medium line-clamp-2">
                  {addressFromParty(selectedSender) || form.senderAddress || "—"}
                </span>
              </div>
              <div className="flex flex-col border-t border-slate-200 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                <span className="text-slate-800 font-medium">
                  {phoneFromParty(selectedSender) || form.senderPhone || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================== RECEIVER INFO ================== */}
        <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:border-l border-l-4 border-l-indigo-500">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-700">
              <FiUserCheck className="text-lg" />
              <h3 className="text-sm font-bold tracking-wide uppercase">
                Receiver Info
              </h3>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReceiverAdd();
              }}
              className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all border border-indigo-200"
            >
              <FaUserPlus />
              <span>Add New</span>
            </button>
          </div>

          <div className="space-y-3">
             <div className="relative">
              <select
                key={`${options.receivers.length}-${form.receiverId}`}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-[44px]"
                value={form.receiverId || ""}
                onChange={(e) => handleSelectChange(e, "receiver")}
                disabled={loading}
              >
                <option value="">Select Receiver...</option>
                {options.receivers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.name || "").toUpperCase()}
                  </option>
                ))}
              </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</span>
                <span className="text-slate-800 font-medium line-clamp-2">
                  {addressFromParty(selectedReceiver) || form.receiverAddress || "—"}
                </span>
              </div>
              <div className="flex flex-col border-t border-slate-200 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                <span className="text-slate-800 font-medium">
                  {phoneFromParty(selectedReceiver) || form.receiverPhone || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);