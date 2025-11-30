import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";

const ItemAutosuggest = React.forwardRef(function ItemAutosuggest({ value, onChange, options = [], onKeyDown }, ref) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  useEffect(() => { setQ(value || ""); }, [value]);

  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase();
    if (!s) return options.slice(0, 50);
    return options.filter(v => v.toLowerCase().includes(s)).slice(0, 50);
  }, [q, options]);

  const commit = (val) => {
    setQ(val);
    onChange?.(val);
    setOpen(false);
    setHighlight(-1);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (e.target === ref.current) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, ref]);

  // Positioning via portal (like you already do)
  const renderPopup = () => {
    if (!open || !ref.current) return null;
    const rect = ref.current.getBoundingClientRect();
    return ReactDOM.createPortal(
      <ul
        role="listbox"
        className="absolute z-[9999] max-h-60 w-[var(--w)] overflow-auto rounded-md border bg-white shadow-lg"
        style={{
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          // lock width to input
          ["--w"]: `${rect.width}px`,
        }}
      >
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
        ) : filtered.map((text, i) => (
          <li
            key={`${text}-${i}`}
            role="option"
            aria-selected={i === highlight}
            className={`px-3 py-2 cursor-pointer text-sm ${i === highlight ? "bg-indigo-50" : ""}`}
            onMouseDown={(e) => { e.preventDefault(); commit(text); }}
            onMouseEnter={() => setHighlight(i)}
          >
            {text}
          </li>
        ))}
      </ul>,
      document.body
    );
  };

  return (
    <div className="relative">
      <input
        ref={ref}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className="w-full px-3 py-2 border rounded-md"
        value={q}
        onChange={(e) => { setQ(e.target.value); onChange?.(e.target.value); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          // Call parent onKeyDown first
          if (onKeyDown) onKeyDown(e);
          // If parent prevented default, don't handle internal
          if (e.defaultPrevented) return;
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
          if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
          if (e.key === "ArrowUp")   { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
          if (e.key === "Enter")     { if (open && highlight >= 0) { e.preventDefault(); commit(filtered[highlight]); } }
          if (e.key === "Escape")    { setOpen(false); setHighlight(-1); }
        }}
      />
      {renderPopup()}
    </div>
  );
});

export default ItemAutosuggest;
