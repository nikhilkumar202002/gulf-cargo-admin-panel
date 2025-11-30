import React from 'react';

export const BoxesSection = React.memo(
  ({
    boxes,
    addBox,
    removeBox,
    setBoxWeight,
    addItemToBox,
    removeItemFromBox,
    setBoxItem,
    itemOptions,
    onItemKeyDown,
    itemRefs,
    setFocusTarget,
  }) => {
    const handleKeyDown = (e, boxIndex, itemIndex, currentField) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (currentField === 'name') {
          setFocusTarget({ boxIndex, itemIndex, field: 'pieces' });
        } else if (currentField === 'pieces') {
          setFocusTarget({ boxIndex, itemIndex, field: 'item_weight' });
        } else if (currentField === 'item_weight') {
          addItemToBox(boxIndex);
          // After adding, focus the name of the *new* item
          setFocusTarget({ boxIndex, itemIndex: itemIndex + 1, field: 'name' });
        } else {
          onItemKeyDown(e, boxIndex);
        }
      }
    };

    return (
      <div className="space-y-6">
        {boxes.map((box, boxIndex) => (
          <div
            key={boxIndex}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {/* Header */}
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="text-sm font-semibold text-slate-800">
                  Box No:{' '}
                  <span className="ml-2 inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-2 py-0.5">
                    {boxIndex + 1}
                  </span>
                </div>

                <label className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-slate-600">Box Weight (kg)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    className={`w-full sm:w-32 rounded-lg border px-3 py-2 text-right ${
                      Number(box.box_weight || 0) <= 0
                        ? "border-rose-300"
                        : "border-slate-300"
                    }`}
                    value={box.box_weight || ""}
                    onChange={(e) => setBoxWeight(boxIndex, e.target.value)}
                    onKeyDown={(e) =>
                      onItemKeyDown && onItemKeyDown(e, boxIndex)
                    }
                    placeholder="0.000"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => removeBox(boxIndex)}
                disabled={boxes.length <= 1}
                className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm text-white ${
                  boxes.length <= 1
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                Remove Box
              </button>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="text-left">
                    <th className="px-3 py-2 w-12 text-center">Sl.</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 w-24 text-right">Pieces</th>
                    <th className="px-3 py-2 w-28 text-right">Weight (kg)</th>
                    <th className="px-3 py-2 w-20 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {box.items.map((it, itemIndex) => (
                    <tr
                      key={itemIndex}
                      className={itemIndex % 2 ? "bg-white" : "bg-slate-50/50"}
                    >
                      <td className="px-3 py-2 text-center text-slate-500">
                        {itemIndex + 1}
                      </td>

                      <td className="px-3 py-2">
                        <input
                          ref={(el) => (itemRefs.current[`${boxIndex}-${itemIndex}-name`] = el)}
                          type="text"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          value={it.name}
                          placeholder="Item name"
                          onChange={(e) =>
                            setBoxItem(
                              boxIndex,
                              itemIndex,
                              "name",
                              e.target.value
                            )
                          }
                          onKeyDown={(e) => handleKeyDown(e, boxIndex, itemIndex, 'name')}
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          ref={(el) =>
                            (itemRefs.current[`${boxIndex}-${itemIndex}-pieces`] = el)
                          }
                          type="number"
                          min="0"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
                          placeholder="0"
                          value={it.pieces}
                          onChange={(e) =>
                            setBoxItem(
                              boxIndex,
                              itemIndex,
                              "pieces",
                              Number(e.target.value || 0)
                            )
                          }
                          onKeyDown={(e) => handleKeyDown(e, boxIndex, itemIndex, 'pieces')}
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          ref={(el) =>
                            (itemRefs.current[`${boxIndex}-${itemIndex}-item_weight`] = el)
                          }
                          type="number"
                          min="0"
                          step="0.001"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
                          placeholder="0.000"
                          value={it.item_weight || ""}
                          onChange={(e) =>
                            setBoxItem(
                              boxIndex,
                              itemIndex,
                              "item_weight",
                              e.target.value
                            )
                          }
                          onKeyDown={(e) => handleKeyDown(e, boxIndex, itemIndex, 'item_weight')}
                        />
                      </td>

                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            removeItemFromBox(boxIndex, itemIndex)
                          }
                          className="rounded-lg bg-rose-500 px-2 py-1 text-white hover:bg-rose-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE STACKED CARD VIEW */}
            <div className="sm:hidden space-y-3">
              {box.items.map((it, itemIndex) => (
                <div
                  key={itemIndex}
                  className="rounded-xl border border-slate-300 bg-slate-50 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">
                      Sl. {itemIndex + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        removeItemFromBox(boxIndex, itemIndex)
                      }
                      className="rounded-lg bg-rose-500 px-3 py-1 text-white text-xs"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Item */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Item</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={it.name}
                      placeholder="Item name"
                      onChange={(e) =>
                        setBoxItem(boxIndex, itemIndex, "name", e.target.value)
                      }
                    />
                  </div>

                  {/* Pieces */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Pieces</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={it.pieces}
                      onChange={(e) =>
                        setBoxItem(
                          boxIndex,
                          itemIndex,
                          "pieces",
                          Number(e.target.value || 0)
                        )
                      }
                    />
                  </div>

                  {/* Weight */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={it.item_weight || ""}
                      placeholder="0.000"
                      onChange={(e) =>
                        setBoxItem(
                          boxIndex,
                          itemIndex,
                          "item_weight",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add Item */}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => addItemToBox(boxIndex)}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                Add Item
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
);
