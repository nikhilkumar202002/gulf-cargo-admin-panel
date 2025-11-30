// Helper function to unwrap array from various response formats
export const unwrapArray = (o) =>
  Array.isArray(o) ? o :
    Array.isArray(o?.data?.data) ? o.data.data :
      Array.isArray(o?.data) ? o.data :
        Array.isArray(o?.items) ? o.items :
          Array.isArray(o?.results) ? o.results : [];

// Helper function to get today's date in 'YYYY-MM-DD' format
export const today = () => new Date().toISOString().slice(0, 10);

// Helper function to filter out rows that are marked as used (in cargo shipment)
export const onlyFree = (rows = []) => rows.filter((r) => Number(r?.is_in_cargo_shipment) === 0);

// Normalize string values (trim and convert null/undefined to empty string)
export const normStr = (v) => (v == null ? "" : String(v).trim());

// Helper function to extract branch information from profile and branch list
export const extractBranchInfo = (profile, branches = []) => {
  const bList = Array.isArray(branches) ? branches : [];

  let id =
    profile?.branch_id ?? profile?.branchId ?? profile?.branch?.id ?? profile?.user?.branch_id ?? profile?.data?.user?.branch_id ?? null;

  let name =
    profile?.branch?.name ?? profile?.branch_name ?? profile?.user?.branch_name ?? null;

  if (!name) {
    const raw = profile?.branch;
    if (typeof raw === "string") name = raw;
  }
  if (!name) {
    const raw = profile?.user?.branch;
    if (typeof raw === "string") name = raw;
  }

  id = id != null ? Number(id) : null;
  name = normStr(name);

  if (id == null && name) {
    const byName =
      bList.find((b) => normStr(b.branch_name) === name || normStr(b.name) === name) ||
      bList.find((b) => normStr(b.branch_name || b.name).toLowerCase() === name.toLowerCase());
    if (byName) id = Number(byName.id);
  }

  if (name === "" && id != null) {
    const byId = bList.find((b) => Number(b.id) === Number(id));
    if (byId) name = normStr(byId.branch_name || byId.name || `#${id}`);
  }

  return { id: id != null ? Number(id) : null, name };
};

// Helper function to render errors (passed fieldErrors as argument)
export const renderErr = (fieldErrors, field) =>
  Array.isArray(fieldErrors?.[field]) ? (
    <div className="mt-1 text-xs text-rose-600">
      {fieldErrors[field].join(", ")}
    </div>
  ) : null;
