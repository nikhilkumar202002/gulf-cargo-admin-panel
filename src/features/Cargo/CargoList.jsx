// src/features/Cargo/CargoList.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react"; 
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux"; 
import { useQueryClient } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";

/* Icons */
import { GiCargoCrate } from "react-icons/gi";
import { SlEye, SlPencil, SlDoc } from "react-icons/sl";
import { FiBox, FiCalendar, FiArrowRight, FiMapPin, FiSearch, FiColumns, FiBookmark, FiDownload, FiX } from "react-icons/fi";
import { TbWeight } from "react-icons/tb";
import { HiOutlineDocumentText } from "react-icons/hi";
import { useBranches } from "../../hooks/useMasterData";
import { getApiError } from "../../utils/apiError";

/* API Services */
import { listCargos, filterCargosByBookingNo,getCargoById } from "../../services/cargoService";
import {
  clearStoredCargoSelection,
  normalizeCargoId,
  readStoredCargoSelection,
  uniqueCargoIds,
  writeStoredCargoSelection,
} from "../../utils/cargoSelection";

/* Components */
import BillModal from "./components/BillModal";
import EditCargoModal from "./components/EditCargoModal";
import {
  cargoDetailKey,
  cargoDetailStaleTime,
} from "../../hooks/useCargo";

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

const CARGO_VIEW_KEY = "cargo-list-view";
const CARGO_FILTERS_KEY = "cargo-list-saved-filters";
const defaultFilter = { bookingNo: "", branchId: "", status: "", date: "" };
const columns = [
  { key: "shipment", label: "Shipment Details", sortable: true },
  { key: "route", label: "Route", sortable: true },
  { key: "cargo", label: "Cargo Info", sortable: true },
  { key: "date", label: "Date & Time", sortable: true },
  { key: "status", label: "Status", sortable: true },
];

const readCargoView = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CARGO_VIEW_KEY) || "null");
    return {
      filter: { ...defaultFilter, ...(saved?.filter || {}) },
      page: Number(saved?.page) > 0 ? Number(saved.page) : 1,
      sort: saved?.sort?.key ? saved.sort : { key: "date", direction: "desc" },
      visibleColumns: saved?.visibleColumns?.length
        ? saved.visibleColumns
        : columns.map((column) => column.key),
    };
  } catch {
    return {
      filter: defaultFilter,
      page: 1,
      sort: { key: "date", direction: "desc" },
      visibleColumns: columns.map((column) => column.key),
    };
  }
};

const readSavedFilters = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CARGO_FILTERS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
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
  const queryClient = useQueryClient();
  const pageSelectAllRef = useRef(null);
  const hasLoadedCargosRef = useRef(false);
  
  // Redux
  const { user } = useSelector((state) => state.auth || {});

  const { roleId, roleName } = useMemo(() => {
    const rawRole = user?.role;
    const rawRoleId = user?.role_id ?? user?.roleId ?? (typeof rawRole === "object" ? rawRole?.id : rawRole);
    const normalizedRoleId = rawRoleId != null && !isNaN(Number(rawRoleId)) ? Number(rawRoleId) : null;
    const normalizedRoleName =
      String(
        user?.role_name ??
          user?.roleName ??
          (typeof rawRole === "object" ? rawRole?.name : rawRole ?? "")
      ).trim().toLowerCase();

    return { roleId: normalizedRoleId, roleName: normalizedRoleName };
  }, [user]);

  const isSuperAdmin = useMemo(() => {
    return roleId === 1 || roleName === "super admin";
  }, [roleId, roleName]);

  const canEditCargo = isSuperAdmin || roleName === "admin";

  // State
  const [cargos, setCargos] = useState([]);
  const [totalCargos, setTotalCargos] = useState(0);
  
  const [isInitialLoading, setIsInitialLoading] = useState(true); 
  const [isFetching, setIsFetching] = useState(false); 
  const [cargoError, setCargoError] = useState(null);
  
  const initialView = useMemo(() => readCargoView(), []);
  const [filter, setFilter] = useState(initialView.filter);
  const [page, setPage] = useState(initialView.page);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;
  const [sort, setSort] = useState(initialView.sort);
  const [visibleColumns, setVisibleColumns] = useState(initialView.visibleColumns);
  const [savedFilters, setSavedFilters] = useState(() => readSavedFilters());
  const [showColumns, setShowColumns] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCargoId, setEditingCargoId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set(readStoredCargoSelection()));
  const { data: branches = [] } = useBranches();

  useEffect(() => {
    writeStoredCargoSelection(Array.from(selectedIds));
  }, [selectedIds]);

  useEffect(() => {
    localStorage.setItem(CARGO_VIEW_KEY, JSON.stringify({ filter, page, sort, visibleColumns }));
  }, [filter, page, sort, visibleColumns]);

  const updateFilter = (key, value) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };


  // --- Fetch Cargos ---
  const fetchCargos = useCallback(async (currPage, currFilter) => {
    const isFirstRequest = !hasLoadedCargosRef.current;
    if (isFirstRequest) setIsInitialLoading(true);
    else setIsFetching(true);
    setCargoError(null);

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
          status: currFilter.status || undefined,
          date: currFilter.date || undefined,
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
      setCargoError(getApiError(err));
    } finally {
      hasLoadedCargosRef.current = true;
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, []);

  const currentPageIds = useMemo(
    () => uniqueCargoIds(cargos.map((cargo) => cargo?.id)),
    [cargos]
  );

  const currentPageSelectedCount = useMemo(
    () => currentPageIds.filter((id) => selectedIds.has(id)).length,
    [currentPageIds, selectedIds]
  );

  const allCurrentPageSelected = currentPageIds.length > 0 && currentPageSelectedCount === currentPageIds.length;
  const someCurrentPageSelected = currentPageSelectedCount > 0 && !allCurrentPageSelected;

  const sortedCargos = useMemo(() => {
    const valueFor = (cargo) => {
      if (sort.key === "shipment") return cargo.booking_no || cargo.id || "";
      if (sort.key === "route") return cargo.sender_name || "";
      if (sort.key === "cargo") return Number(cargo.total_weight) || 0;
      if (sort.key === "date") return new Date(cargo.created_at || cargo.date || 0).getTime() || 0;
      if (sort.key === "status") return cargo.status?.name || cargo.status || "";
      return "";
    };
    return [...cargos].sort((a, b) => {
      const left = valueFor(a);
      const right = valueFor(b);
      const result = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? result : -result;
    });
  }, [cargos, sort]);

  const statusOptions = useMemo(() => {
    const values = cargos.map((cargo) => cargo.status?.name || cargo.status).filter(Boolean);
    return [...new Set(values.map((value) => String(value)))].sort();
  }, [cargos]);

  const toggleColumn = (key) => {
    setVisibleColumns((current) => {
      if (current.includes(key) && current.length === 1) return current;
      return current.includes(key) ? current.filter((column) => column !== key) : [...current, key];
    });
  };

  const toggleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  useEffect(() => {
    if (pageSelectAllRef.current) {
      pageSelectAllRef.current.indeterminate = someCurrentPageSelected;
    }
  }, [someCurrentPageSelected]);

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
      const normalizedId = normalizeCargoId(id);
      if (!normalizedId) return next;
      next.has(normalizedId) ? next.delete(normalizedId) : next.add(normalizedId);
      return next;
    });
  };

  const toggleSelectVisible = () => {
    if (!currentPageIds.length) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allVisibleSelected = currentPageIds.every((id) => next.has(id));

      if (allVisibleSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        currentPageIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    clearStoredCargoSelection();
  };

  const handleExcelExport = async () => {
    if (selectedIds.size === 0) return toast.error("Select items first");
    try {
      const XLSX = await import("xlsx");
      const selectedRows = await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const visible = cargos.find((cargo) => normalizeCargoId(cargo.id) === id);
          return visible || await getCargoById(id);
        })
      );
      const data = selectedRows.map((cargo) => ({
        "Booking No.": cargo.booking_no || cargo.id || "",
        Customer: cargo.sender_name || "",
        Branch: cargo.branch_name || "",
        Status: cargo.status?.name || cargo.status || "",
        "Total Weight": cargo.total_weight || "",
        Date: cargo.date || cargo.created_at || "",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Selected Cargo");
      XLSX.writeFile(wb, "selected_cargo.xlsx");
      toast.success(`Exported ${data.length} cargo record${data.length === 1 ? "" : "s"}`);
    } catch (error) {
      console.error("Cargo export failed:", error);
      toast.error("Export failed. Please try again.");
    }
  };

  const saveCurrentFilter = () => {
    const name = window.prompt("Name this saved filter");
    if (!name?.trim()) return;
    const next = [...savedFilters.filter((saved) => saved.name !== name.trim()), { name: name.trim(), filter }];
    setSavedFilters(next);
    localStorage.setItem(CARGO_FILTERS_KEY, JSON.stringify(next));
    toast.success("Filter saved");
  };

  const applySavedFilter = (saved) => {
    setFilter({ ...defaultFilter, ...saved.filter });
    setPage(1);
    setShowSavedFilters(false);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("cargo-booking-search")?.focus();
      }
      if (event.key === "Escape") {
        setShowColumns(false);
        setShowSavedFilters(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const prefetchCargo = (cargoId) => {
    if (!cargoId) return;

    const queryKey = cargoDetailKey(cargoId);
    const cached = queryClient.getQueryState(queryKey);
    const isFresh = cached?.dataUpdatedAt &&
      Date.now() - cached.dataUpdatedAt < cargoDetailStaleTime;

    if (isFresh) return;

    void queryClient.prefetchQuery({
      queryKey,
      queryFn: () => getCargoById(cargoId),
      staleTime: cargoDetailStaleTime,
    });
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
              id="cargo-booking-search"
              type="text"
              placeholder="Search booking number..."
              className="w-full h-11 rounded-lg bg-transparent border-none pl-10 text-sm focus:ring-0 text-slate-700 placeholder:text-slate-400"
              value={filter.bookingNo}
              onChange={(e) => updateFilter("bookingNo", e.target.value)}
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
                onChange={(e) => updateFilter("branchId", e.target.value)}
            >
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>

          <select
            className="h-11 rounded-lg border-0 bg-transparent px-3 text-sm text-slate-700 focus:ring-0 cursor-pointer"
            value={filter.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>

          <input
            type="date"
            className="h-11 rounded-lg border-0 bg-transparent px-3 text-sm text-slate-700 focus:ring-0"
            value={filter.date}
            onChange={(e) => updateFilter("date", e.target.value)}
            aria-label="Filter by date"
          />

          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowColumns((open) => !open)}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
              title="Choose visible columns"
            >
              <FiColumns className="h-4 w-4" /> Columns
            </button>
            {showColumns && (
              <div className="absolute right-0 top-12 z-20 w-52 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Visible columns</p>
                {columns.map((column) => (
                  <label key={column.key} className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-slate-700">
                    <input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} />
                    {column.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSavedFilters((open) => !open)}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
              title="Saved filters"
            >
              <FiBookmark className="h-4 w-4" /> Saved
            </button>
            {showSavedFilters && (
              <div className="absolute right-0 top-12 z-20 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <button type="button" onClick={saveCurrentFilter} className="mb-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Save current filter</button>
                {savedFilters.length === 0 ? <p className="text-xs text-slate-400">No saved filters yet.</p> : savedFilters.map((saved) => (
                  <button key={saved.name} type="button" onClick={() => applySavedFilter(saved)} className="block w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">{saved.name}</button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 md:ml-auto">
            <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 border border-emerald-100 whitespace-nowrap">
              Selected: {selectedIds.size}
            </span>
            <button
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
              className="rounded-lg bg-white border border-slate-200 hover:border-rose-500 hover:text-rose-600 text-slate-600 px-3 py-2 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
            >
              Clear Selection
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleExcelExport}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <FiDownload className="h-4 w-4" /> Export selected
              </button>
            )}
          </div>
        </div>

        {(filter.bookingNo || filter.branchId || filter.status || filter.date) && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Quick status:</span>
            {["", ...statusOptions].map((status) => (
              <button key={status || "all"} type="button" onClick={() => updateFilter("status", status)} className={`rounded-full border px-3 py-1.5 font-semibold ${filter.status === status ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"}`}>
                {status || "All"}
              </button>
            ))}
            <button type="button" onClick={() => { setFilter(defaultFilter); setPage(1); }} className="ml-auto inline-flex items-center gap-1 text-slate-500 hover:text-rose-600"><FiX /> Clear filters</button>
          </div>
        )}

        {/* --- Main Table --- */}
        {isInitialLoading ? (
          <TableSkeleton />
        ) : (
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 ${isFetching ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200 text-slate-500 uppercase text-[11px] tracking-wider font-semibold backdrop-blur">
                  <tr>
                    <th className="px-4 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        ref={pageSelectAllRef}
                        checked={allCurrentPageSelected} 
                        onChange={toggleSelectVisible} 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" 
                      />
                    </th>
                    {columns.map((column) => visibleColumns.includes(column.key) && (
                      <th key={column.key} className="px-4 py-4">
                        <button type="button" onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1 hover:text-indigo-600">
                          {column.label}
                          {sort.key === column.key && <span>{sort.direction === "asc" ? "↑" : "↓"}</span>}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cargoError ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <div className="mx-auto max-w-md rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
                          <p className="font-semibold">Unable to load cargo</p>
                          <p className="mt-1 text-sm text-rose-700">{cargoError.message}</p>
                          <button type="button" onClick={() => fetchCargos(page, filter)} className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : cargos.length === 0 ? (
                    <tr><td colSpan="8" className="p-12 text-center text-slate-400 italic">No shipments found matching your criteria.</td></tr>
                  ) : (
                    sortedCargos.map((c) => (
                      <tr key={c.id} className={`group hover:bg-slate-50 transition-colors duration-150 ${selectedIds.has(normalizeCargoId(c.id)) ? "bg-indigo-50/40" : ""}`}>
                        
                        {/* 1. Checkbox */}
                        <td className="px-4 py-4 text-center">
                           <input 
                              type="checkbox" 
                              checked={selectedIds.has(normalizeCargoId(c.id))} 
                              onChange={() => toggleSelection(c.id)} 
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" 
                            />
                        </td>

                        {/* 2. Shipment ID + Branch */}
                        {visibleColumns.includes("shipment") && <td className="px-4 py-4 align-top">
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
                        </td>}

                        {/* 3. Route (Sender -> Receiver) */}
                        {visibleColumns.includes("route") && <td className="px-4 py-4 align-top">
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
                        </td>}

                        {/* 4. Cargo Stats (Boxes & Weight) */}
                        {visibleColumns.includes("cargo") && <td className="px-4 py-4 align-top">
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
                        </td>}

                        {/* 5. Date */}
                        {visibleColumns.includes("date") && <td className="px-4 py-4 align-top">
                           <div className="flex items-start gap-2 text-slate-600">
                              <FiCalendar className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                              <div className="flex flex-col text-xs">
                                 <span className="font-medium text-slate-800">{c.date}</span>
                                 <span className="text-slate-400 mt-0.5">{c.time}</span>
                              </div>
                           </div>
                        </td>}

                        {/* 6. Status */}
                        {visibleColumns.includes("status") && <td className="px-4 py-4 align-top">
                           <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize tracking-wide ${getStatusStyle(c.status?.name || c.status)}`}>
                             {c.status?.name || c.status || "Unknown"}
                           </span>
                        </td>}

                        {/* 7. Actions */}
                        <td className="px-4 py-4 align-top text-right">
                           <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button 
                                onMouseEnter={() => prefetchCargo(c.id)}
                                onFocus={() => prefetchCargo(c.id)}
                                onClick={() => navigate(`/cargo/view/${c.id}`)} 
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <SlEye className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (!canEditCargo) return;
                                  setEditingCargoId(c.id);
                                  setEditModalOpen(true);
                                }} 
                                disabled={!canEditCargo}
                                className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:bg-transparent"
                                title={canEditCargo ? "Edit Cargo" : "Edit Cargo (restricted)"}
                              >
                                <SlPencil className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={async () => {
                                    const fullCargo = await getCargoById(c.id);
                                    setSelectedShipment(fullCargo);
                                    setInvoiceModalOpen(true);
                                  }}
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
