import React, { useEffect, useMemo, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { FaTrash, FaBox } from "react-icons/fa";

/* --- 1. ITEM AUTOSUGGEST COMPONENT --- */
const ItemAutosuggest = React.forwardRef(function ItemAutosuggest(
  { value, onChange, options = [], onKeyDown },
  ref
) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  
  // FIX: Use an internal ref to guarantee we can access the DOM node for positioning
  const inputRef = useRef(null);

  // Sync internal state with prop
  useEffect(() => {
    setQ(value || "");
  }, [value]);

  // Filter options
  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase();
    if (!s) return options.slice(0, 50);
    return options.filter((v) => v.toLowerCase().includes(s)).slice(0, 50);
  }, [q, options]);

  const commit = (val) => {
    setQ(val);
    onChange?.(val); // Send selected string to parent
    setOpen(false);
    setHighlight(-1);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      // Use inputRef here
      if (inputRef.current && inputRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Render the dropdown via Portal
  const renderPopup = () => {
    // FIX: Check inputRef.current instead of ref.current
    if (!open || !inputRef.current) return null;
    
    const rect = inputRef.current.getBoundingClientRect();
    
    return ReactDOM.createPortal(
      <ul
        role="listbox"
        className="fixed z-[9999] max-h-60 overflow-auto rounded-md border border-slate-200 bg-white shadow-xl text-left"
        style={{
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: `${rect.width}px`,
        }}
      >
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-slate-500 italic">
            No matches found
          </li>
        ) : (
          filtered.map((text, i) => (
            <li
              key={`${text}-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                i === highlight
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                commit(text);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {text}
            </li>
          ))
        )}
      </ul>,
      document.body
    );
  };

  return (
    <div className="relative w-full">
      <input
        // FIX: Assign DOM node to both our internal ref AND parent's ref
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        placeholder="Search or type item..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (open && filtered.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, filtered.length - 1));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
              return;
            }
            if (e.key === "Enter" && highlight >= 0) {
              e.preventDefault();
              e.stopPropagation();
              commit(filtered[highlight]);
              return;
            }
          }

          if (e.key === "Escape") {
            setOpen(false);
            setHighlight(-1);
            return;
          }

          if (onKeyDown) onKeyDown(e);
        }}
      />
      {renderPopup()}
    </div>
  );
});

/* --- 2. PRODUCT DATA --- */
const SUGGESTED_ITEMS = [
  "Abaya", "Baby bed", "Baby chair", "Baby cycle", "Baby dress", "Baby walker",
  "Bag", "Bed sheet", "Bedroom set", "Bicycle", "Blanket", "Blender", "Book",
  "Camera", "Carpet", "Chair", "Chocolate", "Coffee maker", "Computer",
  "Cooking oil", "Cosmetics", "Cream", "Cupboard", "Curtain", "Dates", "Door",
  "Dress", "Drill machine", "Dry fruits", "Fan", "Food items", "Food stuff",
  "Football", "Footwear", "Fridge", "Grinder", "Heater", "Helmet", "Honey",
  "Iron box", "Jacket", "Jeans", "Juice maker", "Kitchen items", "Laptop",
  "Led tv", "Masala powder", "Mattress", "Microwave oven", "Milk powder",
  "Mixer", "Mobile", "Monitor", "Oven", "Pampers", "Pant", "Perfume",
  "Personal effect", "Phone", "Pillow", "Printer", "Projector", "Rice cooker",
  "Saree", "School bag", "Scooter", "Shirt", "Shoes", "Soap", "Socks", "Sofa",
  "Speaker", "Spices", "Stove", "Suitcase", "Sweets", "Table", "Tea maker",
  "Tea pot", "Teddy bear", "Telephone", "Television", "Tent", "Tiles", "Tools",
  "Toys", "Trousers", "Tshirt", "Tv", "Tv stand", "Tyre", "Vacuum cleaner",
  "Vegetable cutter", "Washing machine", "Watch", "Water heater", "Water purifier",
  "Window ac"
];

/* --- 3. BOXES SECTION --- */
export const BoxesSection = React.memo(function BoxesSection({
  boxes,
  addBox,
  removeBox,
  setBoxWeight,
  addItemToBox,
  removeItemFromBox,
  setBoxItem,
  onItemKeyDown,
  itemRefs,
  itemOptions = SUGGESTED_ITEMS,
  setFocusTarget,
}) {
  return (
    <div className="space-y-6">
      {boxes.map((box, bIdx) => {
        const boxNumber = box.box_number ?? bIdx + 1;
        return (
          <div
            key={bIdx}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
          >
            {/* Box Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <FaBox className="text-sm" />
                </div>
                <h3 className="font-semibold text-slate-800">
                  Box {boxNumber}
                </h3>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-center text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={box.box_weight === 0 ? "" : box.box_weight}
                    onChange={(e) => setBoxWeight(bIdx, e.target.value)}
                    placeholder="0.0"
                  />
                </div>
                {boxes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBox(bIdx)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Remove Box"
                  >
                    <FaTrash size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Items Table Header */}
            <div className="grid grid-cols-[40px_1fr_80px_100px_40px] items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <div className="text-center">#</div>
              <div>Item Description</div>
              <div className="text-center">Qty</div>
              <div className="text-center">Weight</div>
              <div></div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-slate-50 p-2">
              {box.items.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[40px_1fr_80px_100px_40px] items-start gap-2 py-2"
                >
                  {/* Sl No */}
                  <div className="flex h-[38px] items-center justify-center text-sm font-medium text-slate-400">
                    {i + 1}
                  </div>

                  {/* Item Name */}
                  <div>
                    <ItemAutosuggest
                      ref={(el) => (itemRefs.current[`${bIdx}-${i}-name`] = el)}
                      options={itemOptions}
                      value={item.name}
                      onChange={(val) => setBoxItem(bIdx, i, "name", val)}
                      onKeyDown={(e) => onItemKeyDown(e, bIdx)}
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <input
                      type="number"
                      min="1"
                      className="h-[38px] w-full rounded-lg border border-slate-300 px-2 text-center text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      value={item.pieces}
                      onChange={(e) =>
                        setBoxItem(bIdx, i, "pieces", e.target.value)
                      }
                      onKeyDown={(e) => onItemKeyDown(e, bIdx)}
                      placeholder="1"
                    />
                  </div>

                  {/* Item Weight */}
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-[38px] w-full rounded-lg border border-slate-300 px-2 text-center text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      value={item.item_weight === 0 ? "" : item.item_weight}
                      onChange={(e) =>
                        setBoxItem(bIdx, i, "item_weight", e.target.value)
                      }
                      onKeyDown={(e) => onItemKeyDown(e, bIdx)}
                      placeholder="0.0"
                    />
                  </div>

                  {/* Remove Item Button */}
                  <div className="flex h-[38px] items-center justify-center">
                    {box.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemFromBox(bIdx, i)}
                        className="text-slate-300 transition-colors hover:text-rose-500"
                        title="Remove Item"
                      >
                        <FaTrash size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Item Button */}
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
              <button
                type="button"
                onClick={() => addItemToBox(bIdx)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                + Add Another Item
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
});