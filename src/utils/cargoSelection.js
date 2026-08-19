const STORAGE_KEY = "gulfCargo:selectedCargoIds";

export const normalizeCargoId = (id) => {
  if (id == null) return null;
  const value = String(id).trim();
  return value ? value : null;
};

export const uniqueCargoIds = (ids = []) => {
  return Array.from(
    new Set(ids.map(normalizeCargoId).filter(Boolean))
  );
};

export const readStoredCargoSelection = () => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? uniqueCargoIds(parsed) : [];
  } catch {
    return [];
  }
};

export const writeStoredCargoSelection = (ids = []) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueCargoIds(ids)));
  } catch {
    // Ignore storage failures so selection still works in-memory.
  }
};

export const clearStoredCargoSelection = () => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};
