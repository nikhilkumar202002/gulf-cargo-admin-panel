// src/features/Cargo/CargoList.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react"; 
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux"; 
import toast, { Toaster } from "react-hot-toast";
import { GiCargoCrate } from "react-icons/gi";
import { SlEye } from "react-icons/sl";
import { FaFileInvoiceDollar } from "react-icons/fa6";

/* API Services */
import { listCargos, filterCargosByBookingNo } from "../../services/cargoService";
import { getActiveBranches } from "../../services/coreService";

/* Components */
import BillModal from "./components/BillModal";
import EditCargoModal from "./components/EditCargoModal";

/* ---------------- HELPERS ---------------- */
const unwrapArray = (o) =>
  Array.isArray(o)
    ? o
    : Array.isArray(o?.data?.data)
    ? o.data.data
    : Array.isArray(o?.data)
    ? o.data
    : Array.isArray(o?.items)
    ? o.items
    : [];

/* ---------------- SKELETON ---------------- */
const Skel = ({ w = "100%", h = "1rem" }) => (
  <div className="animate-pulse rounded bg-slate-200" style={{ width: w, height: h }} />
);

const TableSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="p-4 bg-slate-50 border-b border-slate-200 flex gap-4">
      {[1,2,3,4,5].map(i => <Skel key={i} w={100/5 + "%"} h="1.5rem" />)}
    </div>
    <div className="divide-y divide-slate-100">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="p-4 flex justify-between items-center gap-4">
          <Skel w="30px" h="30px" />
          <Skel w="15%" />
          <Skel w="15%" />
          <Skel w="20%" />
          <Skel w="10%" />
          <Skel w="10%" />
          <Skel w="80px" />
        </div>
      ))}
    </div>
  </div>
);

export default function AllCargoList() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useSelector((state) => state.auth?.token);

  // Data State
  const [cargos, setCargos] = useState([]);
  const [totalCargos, setTotalCargos] = useState(0);
  
  // Loading States
  const [isInitialLoading, setIsInitialLoading] = useState(true); 
  const [isFetching, setIsFetching] = useState(false); 
  
  const [filter, setFilter] = useState({ bookingNo: "", branchId: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;
  
  // Modals & Selection
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCargoId, setEditingCargoId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [branches, setBranches] = useState([]); 

  // --- Initial Master Data Load ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const branchRes = await getActiveBranches({}, token);
        if(mounted) setBranches(unwrapArray(branchRes));
      } catch (err) { console.error(err); }
    })();
    return () => { mounted = false; };
  }, [token]);

  // --- Fetch Cargos Logic ---
  const fetchCargos = useCallback(async (currPage, currFilter) => {
    if (cargos.length === 0) setIsInitialLoading(true);
    else setIsFetching(true); 

    try {
      let response;
      let fetched = [];

      if (currFilter.bookingNo) {
        response = await filterCargosByBookingNo(currFilter.bookingNo);
        fetched = unwrapArray(response);
      } 
      else {
        const searchParams = {
          page: currPage,
          per_page: perPage,
          branch_id: currFilter.branchId || undefined, 
        };
        response = await listCargos(searchParams);
        fetched = unwrapArray(response);
      }
      
      setCargos(fetched);
      
      const pagination = response?.pagination || response?.meta;
      setTotalCargos(pagination?.total_items ?? pagination?.total ?? fetched.length);
      setTotalPages(pagination?.last_page ?? Math.ceil((pagination?.total_items ?? fetched.length) / perPage));

    } catch (err) {
      console.error("Fetch error:", err);
      if (cargos.length === 0) setCargos([]); 
    } finally {
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [cargos.length]); 

  // Debounce Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCargos(page, filter);
    }, 400); 
    return () => clearTimeout(timer);
  }, [page, filter, fetchCargos]);


  // --- Selection Logic ---
  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === cargos.length && cargos.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(cargos.map(c => c.id)));
  };

  const handleExcelExport = () => {
     toast.success("Export started in background...");
  };

  // --- FIXED: Updated paths to match router.jsx exactly ---
  const reportLinks = [
    { label: "Delivery List", path: "deliverylist" }, // router: "reports/deliverylist"
    { label: "Loading List", path: "loadinglist" },   // router: "reports/loadinglist"
    { label: "Packing List", path: "packinglist" },   // router: "reports/packinglist"
    { label: "Custom Manifest", path: "manifest" },   // router: "reports/manifest"
  ];

  const navigateToReport = (path) => {
    if (selectedIds.size === 0) return toast.error("Select items first");
    // navigate to /reports/manifest, /reports/packinglist, etc.
    navigate(`/reports/${path}`, { state: { selectedIds: Array.from(selectedIds) } });
  };

  return (
    <div className="min-h-screen pb-10">
      <Toaster position="top-right" />
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GiCargoCrate className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">All Cargo</h1>
            <span className={`bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold transition-opacity ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
              {totalCargos}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Using the fixed reportLinks array */}
            {reportLinks.map((item) => (
              <button 
                key={item.label}
                onClick={() => navigateToReport(item.path)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                {item.label}
              </button>
            ))}
             <button onClick={handleExcelExport} className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-black">
               Export
             </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search Booking / Invoice No..."
              className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 pl-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={filter.bookingNo}
              onChange={(e) => setFilter(prev => ({ ...prev, bookingNo: e.target.value }))}
            />
            {isFetching && (
               <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
               </div>
            )}
          </div>
          <select 
            className="md:w-48 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={filter.branchId}
            onChange={(e) => setFilter(prev => ({ ...prev, branchId: e.target.value }))}
          >
             <option value="">All Branches</option>
             {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
          </select>
        </div>

        {/* DATA TABLE */}
        {isInitialLoading ? (
          <TableSkeleton />
        ) : (
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-opacity duration-200 ${isFetching ? 'opacity-80' : 'opacity-100'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">
                      <input type="checkbox" checked={cargos.length > 0 && selectedIds.size === cargos.length} onChange={toggleSelectAll} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    </th>
                    <th className="px-4 py-3">Booking No / Invoice</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Sender/Receiver</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Stats</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cargos.length === 0 ? (
                    <tr><td colSpan="8" className="p-8 text-center text-slate-500">No data found.</td></tr>
                  ) : (
                    cargos.map((c) => (
                      <tr key={c.id} className={`hover:bg-slate-50 ${selectedIds.has(c.id) ? "bg-indigo-50/50" : ""}`}>
                         <td className="px-4 py-3 text-center">
                            <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelection(c.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                         </td>
                         <td className="px-4 py-3 font-medium text-indigo-600">
                            {c.booking_no}
                         </td>
                         <td className="px-4 py-3 text-slate-600">{c.branch_name || "—"}</td>
                         <td className="px-4 py-3">
                           <div className="flex flex-col text-xs">
                             <span className="font-medium text-slate-800">{c.sender_name}</span>
                             <span className="text-slate-400">to {c.receiver_name}</span>
                           </div>
                         </td>
                         <td className="px-4 py-3 text-slate-600 text-xs">{c.date}<br/>{c.time}</td>
                         <td className="px-4 py-3 text-xs text-slate-600">
                            <div>{c.box_count || c.boxes?.length || 0} Boxes</div>
                            <div>{c.total_weight} kg</div>
                         </td>
                         <td className="px-4 py-3">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-semibold border border-slate-200">
                              {c.status?.name || c.status || "—"}
                            </span>
                         </td>
                         <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                               <button onClick={() => navigate(`/cargo/view/${c.id}`)} className="p-1.5 bg-sky-50 text-sky-600 rounded hover:bg-sky-100"><SlEye /></button>
                               <button onClick={() => { setEditingCargoId(c.id); setEditModalOpen(true); }} className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100">✏️</button>
                               <button onClick={() => { setSelectedShipment(c); setInvoiceModalOpen(true); }} className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100"><FaFileInvoiceDollar /></button>
                            </div>
                         </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Control */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-sm">
                <span className="text-slate-500">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 bg-white border rounded disabled:opacity-50">Prev</button>
                  <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 bg-white border rounded disabled:opacity-50">Next</button>
                </div>
            </div>
          </div>
        )}
      </div>

      <BillModal open={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} shipment={selectedShipment} />
      <EditCargoModal open={editModalOpen} cargoId={editingCargoId} onClose={() => setEditModalOpen(false)} onSaved={async () => { setEditModalOpen(false); await fetchCargos(page, filter); }} />
    </div>
  );
}