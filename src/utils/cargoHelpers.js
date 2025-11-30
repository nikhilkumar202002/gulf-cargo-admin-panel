export const unwrapArray = (o) => {
  if (!o) return [];
  if (Array.isArray(o)) return o;
  if (Array.isArray(o?.data?.data)) return o.data.data;
  if (Array.isArray(o?.data)) return o.data;
  if (Array.isArray(o?.items)) return o.items;
  if (Array.isArray(o?.results)) return o.results;
  return [];
};

export const idOf = (o) =>
  o?.id ?? o?.branch_id ?? o?.branchId ?? o?.value ?? o?._id ?? null;

export const labelOf = (o) =>
  o?.name ??
  o?.driver_name ??
  o?.company_name ??
  o?.full_name ??
  o?.branch_name ??
  o?.title ??
  o?.label ??
  o?.username ??
  o?.email ??
  ([o?.first_name, o?.last_name].filter(Boolean).join(" ") ||
    [o?.mobile, o?.phone, o?.contact_number].find(Boolean)) ??
  "-";

export const unwrapDrivers = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.drivers)) return res.drivers;
  if (Array.isArray(res?.data?.drivers)) return res.data.drivers;
  return [];
};

export const prettyDriver = (d = {}) => {
  const name = d.name || "-";
  const phone = [d.phone_code, d.phone_number].filter(Boolean).join(" ");
  return phone ? `${name} (${phone})` : name;
};

export const today = () => new Date().toISOString().split("T")[0];

export const nowHi = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const toHi = (t) => {
  if (!t) return nowHi();
  const m = String(t).match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  let hh = Number(m?.[1] ?? 0);
  let mm = Number(m?.[2] ?? 0);
  hh = Math.min(Math.max(hh, 0), 23);
  mm = Math.min(Math.max(mm, 0), 59);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export const pickBranchId = (profileLike) => {
  const x = profileLike?.data ?? profileLike ?? null;
  const user = x?.user ?? x ?? null;
  return user?.branch_id ?? user?.branchId ?? user?.branch?.id ?? null;
};

export const getBranchName = (profile) => {
  return profile?.user?.branch?.name ||
    profile?.branch?.name ||
    profile?.user?.branch_name ||
    profile?.branch_name ||
    "";
};

export const safeDecodeJwt = (jwt) => {
  if (!jwt || typeof jwt !== "string" || !jwt.includes(".")) return null;
  try { return JSON.parse(atob(jwt.split(".")[1])) || null; } catch { return null; }
};

export const toDec = (n, places = 2) =>
  Number.isFinite(Number(n)) ? Number(n).toFixed(places) : (0).toFixed(places);

export const coalesce = (...vals) => {
  for (const v of vals) {
    if (v === 0) return "0";
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "";
};

export const phoneFromParty = (p) => {
  if (!p) return "";
  const phoneCode = coalesce(p.phone_code, p.country_code);
  const mainNumber = coalesce(p.contact_number, p.phone, p.mobile);
  const contact = phoneCode && mainNumber ? `${phoneCode} ${mainNumber}` : mainNumber;
  const whatsapp = coalesce(p.whatsapp_number, p.whatsapp);
  return [contact, whatsapp].filter((v, i, a) => v && a.indexOf(v) === i).join(" / ");
};

export const addressFromParty = (p) => {
  if (!p) return "";
  const raw = coalesce(p.address, p.full_address);
  if (raw) return raw;
  const parts = [
    coalesce(p.address1, p.address_line1),
    coalesce(p.address2, p.address_line2),
    coalesce(p.city),
    coalesce(p.district),
    coalesce(p.state),
    coalesce(p.postal_code),
    coalesce(p.country),
  ].filter(Boolean);
  return parts.join(", ");
};
