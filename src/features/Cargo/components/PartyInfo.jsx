import React, { useState, useEffect, useRef, useMemo } from "react";
import { addressFromParty, phoneFromParty } from "../../../utils/cargoHelpers";
import { FaUserPlus, FaChevronDown, FaSearch } from "react-icons/fa";
import { FiSend, FiUserCheck } from "react-icons/fi";

/* --- Helpers for robust field access --- */
const getContact = (p) => p.contact_number || p.phone || p.mobile || "";
const getWA = (p) => p.whatsapp_number || p.whatsapp || p.whats_app || "";

/* --- Custom Auto-Suggest Component with Keyboard Support --- */
const PartySelect = ({ options, value, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Find selected item to display its name initially
  const selectedItem = useMemo(
    () => options.find((op) => String(op.id) === String(value)),
    [options, value]
  );

  // Sync query with selected value only when menu is closed
  useEffect(() => {
    if (!isOpen && selectedItem) {
      setQuery(selectedItem.name);
    } else if (!isOpen && !value) {
      setQuery("");
    }
  }, [selectedItem, isOpen, value]);

  // Filter options based on query (Name, Contact, WhatsApp)
  const filteredOptions = useMemo(() => {
    if (!query || (selectedItem && query === selectedItem.name)) return options;
    const lowerQ = query.toLowerCase();
    
    return options.filter((op) => {
      const name = (op.name || "").toLowerCase();
      const contact = getContact(op).toLowerCase();
      const wa = getWA(op).toLowerCase();
      
      // Search matches name, contact number, or whatsapp number
      return name.includes(lowerQ) || contact.includes(lowerQ) || wa.includes(lowerQ);
    });
  }, [options, query, selectedItem]);

  // Handle Keyboard Navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightIndex((prev) => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen) {
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlightIndex >= 0 && filteredOptions[highlightIndex]) {
        handleSelect(filteredOptions[highlightIndex].id);
      } else if (!isOpen) {
          setIsOpen(true); // Open on enter if closed
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "Tab") {
       setIsOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightIndex >= 0) {
      const activeItem = listRef.current.children[highlightIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightIndex, isOpen]);

  // Reset highlight when filtering
  useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // Revert query to selected item name on blur
        if (selectedItem) setQuery(selectedItem.name);
        else setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedItem]);

  const handleSelect = (id) => {
    onChange({ target: { value: id } }); // Mimic event for parent handler compatibility
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-[44px]"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
              if(!selectedItem) setQuery("");
              setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
        />
        <div 
            className="absolute inset-y-0 right-0 flex items-center px-3 cursor-pointer text-slate-400 hover:text-slate-600"
            onClick={() => {
                if(!disabled) {
                    setIsOpen(!isOpen);
                    if(!isOpen) inputRef.current?.focus();
                }
            }}
        >
          {isOpen ? <FaSearch size={12} /> : <FaChevronDown size={12} />}
        </div>
      </div>

      {isOpen && (
        <ul 
            ref={listRef}
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-xl ring-1 ring-black/5 focus:outline-none sm:text-sm"
        >
          {filteredOptions.length === 0 ? (
            <li className="relative cursor-default select-none px-4 py-3 text-slate-500 italic text-center">
              No parties found.
            </li>
          ) : (
            filteredOptions.map((op, i) => {
              const contact = getContact(op);
              const wa = getWA(op);
              
              return (
                <li
                  key={op.id}
                  className={`relative cursor-pointer select-none px-4 py-2 border-b border-slate-50 last:border-none ${
                    i === highlightIndex ? "bg-indigo-50 text-indigo-700" : "text-slate-900 hover:bg-slate-50"
                  } ${String(op.id) === String(value) ? "bg-slate-100" : ""}`}
                  onClick={() => handleSelect(op.id)}
                  onMouseEnter={() => setHighlightIndex(i)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className={`block truncate ${String(op.id) === String(value) ? "font-bold" : "font-medium"}`}>
                      {op.name}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                       <span>📞 {contact || "—"}</span>
                       {wa && wa !== contact && (
                         <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <span>💬</span> {wa}
                         </span>
                       )}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};

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
            <PartySelect
              options={options.senders}
              value={form.senderId}
              onChange={(e) => handleSelectChange(e, "sender")}
              placeholder="Search Name / Phone..."
              disabled={loading}
            />

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
             <PartySelect
              options={options.receivers}
              value={form.receiverId}
              onChange={(e) => handleSelectChange(e, "receiver")}
              placeholder="Search Name / Phone..."
              disabled={loading}
            />

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