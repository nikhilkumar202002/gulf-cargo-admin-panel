const MAX_COUNT = Number.MAX_SAFE_INTEGER;

export const safeCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(Math.trunc(parsed), MAX_COUNT);
};

const safeLabel = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const label = value.trim().replace(/\s+/g, " ");
  return label ? label.slice(0, 80) : fallback;
};

export const normalizeDashboardCounters = (raw = {}) => ({
  totalStaff: safeCount(raw.totalStaff),
  totalBranches: safeCount(raw.totalBranches),
  totalConsignees: safeCount(raw.totalConsignees),
  totalReceivers: safeCount(raw.totalReceivers),
  softwareShipmentsToday: safeCount(raw.softwareShipmentsToday),
  physicalShipmentsToday: safeCount(raw.physicalShipmentsToday),
  outForDelivery: safeCount(raw.outForDelivery),
  enquiriesCollected: safeCount(raw.enquiriesCollected),
  waitingForClearance: safeCount(raw.waitingForClearance),
  totalCargos: safeCount(raw.totalCargos),
  branchWiseCargos: Array.isArray(raw.branchWiseCargos)
    ? raw.branchWiseCargos.slice(0, 250).map((branch, index) => ({
        branch_id: String(branch?.branch_id ?? branch?.id ?? index),
        branch_name: safeLabel(branch?.branch_name ?? branch?.name, `Branch ${index + 1}`),
        total: safeCount(branch?.total ?? branch?.count),
      }))
    : [],
});

export const getUserBranchId = (user) => {
  const value = user?.branch_id ?? user?.branchId ??
    (typeof user?.branch === "object" ? user.branch?.id : user?.branch);
  return value == null ? "" : String(value);
};
