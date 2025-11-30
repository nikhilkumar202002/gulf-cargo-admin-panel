import React, {useEffect, useRef, useState} from "react";
import { Link } from "react-router-dom";

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const fn = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", fn);
    document.addEventListener("touchstart", fn);
    return () => {
      document.removeEventListener("mousedown", fn);
      document.removeEventListener("touchstart", fn);
    };
  }, [ref, handler]);
}

export default function RowMenu({ editHref, viewHref, onInvoice }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={ref} className="relative" onClick={(e)=>e.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="rounded-md bg-slate-100 p-1.5 text-slate-800 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        ⋮
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-40 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          <Link to={editHref} role="menuitem"
            className="block px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => setOpen(false)}>
            Edit
          </Link>
          <Link to={viewHref} role="menuitem"
            className="block px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => setOpen(false)}>
            View
          </Link>
          <button role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
            onClick={() => { onInvoice?.(); setOpen(false); }}>
            Invoice
          </button>
        </div>
      )}
    </div>
  );
}
