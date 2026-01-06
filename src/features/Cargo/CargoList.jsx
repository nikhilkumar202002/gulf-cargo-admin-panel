// src/features/Cargo/CargoList.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react"; 
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux"; 
import toast, { Toaster } from "react-hot-toast";

/* Icons */
import { GiCargoCrate } from "react-icons/gi";
import { SlEye, SlPencil, SlDoc } from "react-icons/sl";
import { FiBox, FiCalendar, FiArrowRight, FiMapPin } from "react-icons/fi";
import { TbWeight } from "react-icons/tb";
import { HiOutlineDocumentText } from "react-icons/hi";

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

const getStatusStyle = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("deliver")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s.includes("pend")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (s.includes("cancel")) return "bg-rose-50 text-rose-700 border-rose-200";
  if (s.includes("hold")) return "bg-purple-50 text-purple-700 border-purple-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
};

/* ---------------- COMPONENTS ---------------- */

const Avatar = ({ name }) => {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const colors = [
    "bg-red-100 text-red-600",
    "bg-orange-100 text-orange-600",
    "bg-emerald-100 text-emerald-600",
    "bg-blue-100 text-blue-600",
    "bg-indigo-100 text-indigo-600",
    "bg-violet-100 text-violet-600",
  ];
  // Deterministic color based on name length
  const colorClass = colors[(name?.length || 0) % colors.length];

  return (
    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${colorClass}`}>
      {initial}
    </div>
  );
};

const TableSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="p-4 bg-slate-50 border-b border-slate-200 flex gap-4">
      <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse" />
      <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse" />
      <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse" />
    </div>
    <div className="divide-y divide-slate-100">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse" />
          </div>
          <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

export default function AllCargoList() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redux
  const { token, user } = useSelector((state) => state.auth || {});

  const isSuperAdmin = useMemo(() => {
    const roleId = user?.role_id ?? user?.role?.id ?? user?.role;
    return String(roleId) === "1";
  }, [user]);

  // State
  const [cargos, setCargos] = useState([]);
  const [totalCargos, setTotalCargos] = useState(0);
  
  const [isInitialLoading, setIsInitialLoading] = useState(true); 
  const [isFetching, setIsFetching] = useState(false); 
  
  const [filter, setFilter] = useState({ bookingNo: "", branchId: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;
  
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

  // --- Fetch Cargos ---
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

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCargos(page, filter);
    }, 400); 
    return () => clearTimeout(timer);
  }, [page, filter, fetchCargos]);


  // --- Selection ---
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

  const reportLinks = [
    { label: "Delivery List", path: "deliverylist" },
    { label: "Loading List", path: "loadinglist" },
    { label: "Packing List", path: "packinglist" },
    { label: "Custom Manifest", path: "manifest" },
  ];

  const navigateToReport = (path) => {
    if (selectedIds.size === 0) return toast.error("Select items first");
    navigate(`/reports/${path}`, { state: { selectedIds: Array.from(selectedIds) } });
  };

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />
      <div className="w-full mx-auto">
        
        {/* --- Header Section --- */}
        <div className="mb-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                    <GiCargoCrate className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cargo Shipments</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Manage and track all shipments</p>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {isSuperAdmin && reportLinks.map((item) => (
                <button 
                    key={item.label}
                    onClick={() => navigateToReport(item.path)}
                    className="flex-1 md:flex-none bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-600 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                    {item.label}
                </button>
                ))}
                <button onClick={handleExcelExport} className="flex-1 md:flex-none bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 shadow-md transition-all">
                   Export Data
                </button>
            </div>
            </div>
        </div>

        {/* --- Filter Section --- */}
        <div className="mb-6 bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <HiOutlineDocumentText className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by Booking Number..."
              className="w-full h-11 rounded-lg bg-transparent border-none pl-10 text-sm focus:ring-0 text-slate-700 placeholder:text-slate-400"
              value={filter.bookingNo}
              onChange={(e) => setFilter(prev => ({ ...prev, bookingNo: e.target.value }))}
            />
            {isFetching && (
               <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
               </div>
            )}
          </div>
          
          <div className="w-px bg-slate-100 hidden md:block my-2"></div>

          <div className="relative md:w-64 group">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMapPin className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <select 
                className="w-full h-11 rounded-lg bg-transparent border-none pl-10 pr-8 text-sm focus:ring-0 text-slate-700 cursor-pointer"
                value={filter.branchId}
                onChange={(e) => setFilter(prev => ({ ...prev, branchId: e.target.value }))}
            >
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>
        </div>

        {/* --- Main Table --- */}
        {isInitialLoading ? (
          <TableSkeleton />
        ) : (
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 ${isFetching ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[11px] tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={cargos.length > 0 && selectedIds.size === cargos.length} 
                        onChange={toggleSelectAll} 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" 
                      />
                    </th>
                    <th className="px-4 py-4">Shipment Details</th>
                    <th className="px-4 py-4">Route</th>
                    <th className="px-4 py-4">Cargo Info</th>
                    <th className="px-4 py-4">Date & Time</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cargos.length === 0 ? (
                    <tr><td colSpan="8" className="p-12 text-center text-slate-400 italic">No shipments found matching your criteria.</td></tr>
                  ) : (
                    cargos.map((c) => (
                      <tr key={c.id} className={`group hover:bg-slate-50 transition-colors duration-150 ${selectedIds.has(c.id) ? "bg-indigo-50/40" : ""}`}>
                        
                        {/* 1. Checkbox */}
                        <td className="px-4 py-4 text-center">
                           <input 
                              type="checkbox" 
                              checked={selectedIds.has(c.id)} 
                              onChange={() => toggleSelection(c.id)} 
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" 
                            />
                        </td>

                        {/* 2. Shipment ID + Branch */}
                        <td className="px-4 py-4 align-top">
                           <div className="flex items-start gap-3">
                              <div className="pt-1">
                                <span className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-500">
                                   <HiOutlineDocumentText className="h-5 w-5" />
                                </span>
                              </div>
                              <div>
                                 <div className="font-bold text-slate-900 text-base font-mono group-hover:text-indigo-600 transition-colors">
                                    {c.booking_no}
                                 </div>
                                 <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                    <FiMapPin className="h-3 w-3" />
                                    <span>{c.branch_name || "Unknown Branch"}</span>
                                 </div>
                              </div>
                           </div>
                        </td>

                        {/* 3. Route (Sender -> Receiver) */}
                        <td className="px-4 py-4 align-top">
                           <div className="flex items-center gap-3">
                              <Avatar name={c.sender_name} />
                              <div className="flex flex-col">
                                 <span className="font-semibold text-slate-800 text-sm">{c.sender_name}</span>
                                 
                                 <div className="flex items-center gap-2 my-0.5">
                                    <FiArrowRight className="text-slate-300 h-3 w-3" />
                                    <span className="text-xs text-slate-500 font-medium">{c.receiver_name}</span>
                                 </div>
                              </div>
                           </div>
                        </td>

                        {/* 4. Cargo Stats (Boxes & Weight) */}
                        <td className="px-4 py-4 align-top">
                           <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-slate-700 text-xs font-medium">
                                 <FiBox className="text-indigo-500 h-3.5 w-3.5" />
                                 <span>{c.box_count || c.boxes?.length || 0} Boxes</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-700 text-xs font-medium">
                                 <TbWeight className="text-emerald-500 h-4 w-4" />
                                 <span>{c.total_weight} kg</span>
                              </div>
                           </div>
                        </td>

                        {/* 5. Date */}
                        <td className="px-4 py-4 align-top">
                           <div className="flex items-start gap-2 text-slate-600">
                              <FiCalendar className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                              <div className="flex flex-col text-xs">
                                 <span className="font-medium text-slate-800">{c.date}</span>
                                 <span className="text-slate-400 mt-0.5">{c.time}</span>
                              </div>
                           </div>
                        </td>

                        {/* 6. Status */}
                        <td className="px-4 py-4 align-top">
                           <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize tracking-wide ${getStatusStyle(c.status?.name || c.status)}`}>
                             {c.status?.name || c.status || "Unknown"}
                           </span>
                        </td>

                        {/* 7. Actions */}
                        <td className="px-4 py-4 align-top text-right">
                           <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => navigate(`/cargo/view/${c.id}`)} 
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <SlEye className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => { setEditingCargoId(c.id); setEditModalOpen(true); }} 
                                className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Edit Cargo"
                              >
                                <SlPencil className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => { setSelectedShipment(c); setInvoiceModalOpen(true); }} 
                                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="View Bill/Invoice"
                              >
                                <SlDoc className="h-4 w-4" />
                              </button>
                           </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
                <span className="text-slate-500 font-medium">
                  Showing page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{totalPages}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  Total <span className="text-slate-900">{totalCargos}</span> shipments
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={page===1} 
                    onClick={()=>setPage(p=>p-1)} 
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-all"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={page===totalPages} 
                    onClick={()=>setPage(p=>p+1)} 
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-all"
                  >
                    Next
                  </button>
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