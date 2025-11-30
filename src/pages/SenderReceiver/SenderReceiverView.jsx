import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiPlus, HiHome, HiEye } from "react-icons/hi";
import { FiEdit, FiFileText } from "react-icons/fi";
import {
  getParties,
  getPartiesByCustomerType,
} from "../../api/partiesApi";
import { getActiveCustomerTypes } from "../../api/customerTypeApi";
import EditParty from "./EditParties";
import "../styles.css";

/* ---------------- Utility ---------------- */
const normalizeList = (p) => {
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.data?.parties)) return p.data.parties;
  if (Array.isArray(p?.parties)) return p.parties;
  if (Array.isArray(p?.data?.data)) return p.data.data;
  if (p && typeof p === "object") {
    const firstArray = Object.values(p).find(Array.isArray);
    if (Array.isArray(firstArray)) return firstArray;
  }
  return [];
};

const getId = (o) => String(o?.id ?? o?._id ?? o?.code ?? o?.uuid ?? "");
const getTypeLabel = (t) =>
  t?.customer_type ?? t?.name ?? t?.title ?? t?.label ?? `Type ${getId(t)}`;
const getRowId = (x) =>
  String(x?.id ?? x?.party_id ?? x?.partyId ?? x?.uuid ?? x?.code ?? "");

/* ---------------- Skeleton Loader ---------------- */
const Skel = ({ w = "100%", h = 12 }) => (
  <div
    className="animate-pulse rounded bg-slate-200/80"
    style={{ width: w, height: h }}
  />
);

const TableSkeleton = ({ rows = 8, cols = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} className={r % 2 ? "bg-white" : "bg-gray-50"}>
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c} className="py-4 px-4">
            <Skel w={c === 1 ? "70%" : "55%"} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/* ---------------- Main ---------------- */
const SenderView = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [types, setTypes] = useState([]);
  const [typeLoading, setTypeLoading] = useState(true);
  const [customerTypeId, setCustomerTypeId] = useState("");
  const [q, setQ] = useState("");
  const [qNow, setQNow] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPartyId, setEditingPartyId] = useState(null);

  /* Debounced search */
  useEffect(() => {
    const t = setTimeout(() => setQNow(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  /* Load customer types */
  useEffect(() => {
    (async () => {
      try {
        setTypeLoading(true);
        const res = await getActiveCustomerTypes({ per_page: 500 });
        setTypes(normalizeList(res));
      } catch {
        setErr("Failed to load customer types.");
      } finally {
        setTypeLoading(false);
      }
    })();
  }, []);

  /* Load parties */
  const loadParties = async () => {
    try {
      setLoading(true);
      setErr("");
      const params = { per_page: 1000, ...(qNow ? { search: qNow } : {}) };

      const res = customerTypeId
        ? await getPartiesByCustomerType(customerTypeId, params)
        : await getParties(params);

      setRows(normalizeList(res));
      setPage(1);
    } catch {
      setErr("Failed to load parties.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParties();
  }, [customerTypeId, qNow]);

  /* Pagination */
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return rows.slice(start, start + perPage);
  }, [rows, page, perPage]);

  const showingFrom = total === 0 ? 0 : (page - 1) * perPage + 1;
  const showingTo = total === 0 ? 0 : Math.min(page * perPage, total);

  /* ---------------- Render ---------------- */
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <HiHome className="text-gray-600" />
        <span className="cursor-pointer hover:text-blue-600">Home</span>
        <span>/</span>
        <span className="cursor-pointer hover:text-blue-600">Customer</span>
        <span>/</span>
        <span className="text-gray-800 font-medium">Index</span>
      </div>

      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h2 className="text-2xl font-semibold text-gray-800">
          List of Customers
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search name / type..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={String(customerTypeId)}
            onChange={(e) => setCustomerTypeId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={typeLoading}
          >
            <option value="">
              {typeLoading ? "Loading types..." : "All Customer Types"}
            </option>
            {!typeLoading &&
              types.map((t) => {
                const id = getId(t);
                const label = getTypeLabel(t);
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                );
              })}
          </select>
          <button
            onClick={() => navigate("/sendercreate")}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow transition-all"
          >
            <HiPlus className="text-lg" />
            Add New
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow-md border border-slate-200">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100 text-gray-800 text-sm uppercase tracking-wide">
            <tr>
              <th className="py-3 px-4 text-left font-medium">Sl No.</th>
              <th className="py-3 px-4 text-left font-medium">Customer Name</th>
              <th className="py-3 px-4 text-left font-medium">Customer Type</th>
              <th className="py-3 px-4 text-left font-medium">Document</th>
              <th className="py-3 px-4 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : err ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-red-600">
                  {err}
                </td>
              </tr>
            ) : pagedRows.length ? (
              pagedRows.map((p, idx) => {
                const absoluteIndex = (page - 1) * perPage + idx;
                const rowId = getRowId(p);
                const name = p.name ?? "—";
                const docUrl = p.document_url ?? p.file_url ?? p.doc ?? null;
                const typeLabel =
                  p.customer_type?.customer_type ??
                  p.customer_type_name ??
                  p.customer_type ??
                  "—";
                const canView = !!rowId;

                return (
                  <tr
                    key={rowId || `${name}-${absoluteIndex}`}
                    className={`border-b hover:bg-gray-50 transition ${
                      absoluteIndex % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-700">
                      {absoluteIndex + 1}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {name}
                    </td>
                    <td className="py-3 px-4">{typeLabel}</td>
                    <td className="py-3 px-4">
                      {docUrl ? (
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <FiFileText className="text-lg" /> View Document
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">No file</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            canView &&
                            navigate(
                              `/senderreceiver/senderview/${encodeURIComponent(
                                rowId
                              )}`
                            )
                          }
                          disabled={!canView}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md text-white transition ${
                            canView
                              ? "bg-emerald-500 hover:bg-emerald-600"
                              : "bg-gray-300 cursor-not-allowed"
                          }`}
                        >
                          <HiEye /> View
                        </button>
                        <button
                          onClick={() => {
                            if (canView) {
                              setEditingPartyId(rowId);
                              setShowEditModal(true);
                            }
                          }}
                          disabled={!canView}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md text-white transition ${
                            canView
                              ? "bg-blue-500 hover:bg-blue-600"
                              : "bg-gray-300 cursor-not-allowed"
                          }`}
                        >
                          <FiEdit /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="py-6 text-center text-gray-500 italic"
                >
                  No customers found. Click “Add New” to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          Showing <b>{showingFrom}</b>–<b>{showingTo}</b> of <b>{total}</b>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Rows:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-800 hover:bg-slate-50"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className={`rounded-md border px-3 py-1 text-sm ${
                page === 1 || loading
                  ? "cursor-not-allowed border-slate-200 text-slate-400"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              Prev
            </button>
            <span className="px-2 text-sm text-slate-700">
              Page <b>{page}</b> / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className={`rounded-md border px-3 py-1 text-sm ${
                page === totalPages || loading
                  ? "cursor-not-allowed border-slate-200 text-slate-400"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingPartyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingPartyId(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 text-2xl"
            >
              ×
            </button>

            <EditParty
              partyId={editingPartyId}
              onClose={() => {
                setShowEditModal(false);
                setEditingPartyId(null);
              }}
              onSuccess={() => {
                setShowEditModal(false);
                setEditingPartyId(null);
                loadParties();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SenderView;
