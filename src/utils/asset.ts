const ABS_URL = /^(https?:)?\/\//i;

/**
 * Turn API storage URLs into public URLs:
 *  - http → https
 *  - .../public/storage/... → .../storage/...
 *  - api.gulfcargoksa.com → gulfcargoksa.com  (only when path contains /storage/)
 */
export function normalizeStorageUrl(raw?: string): string {
  let s = String(raw || "").trim().replace(/\\+/g, "/");
  if (!s) return "";
  s = s.replace(/^http:/i, "https:");
  if (/^data:image\//i.test(s)) return s;

  const stripPublic = (p: string) => p.replace(/\/public(?=\/storage\/)/, "");

  if (ABS_URL.test(s)) {
    try {
      const u = new URL(s);
      u.pathname = stripPublic(u.pathname);
      if (/\/storage\//.test(u.pathname)) {
        u.host = u.host.replace(/^api\./i, ""); // api.gulfcargoksa.com → gulfcargoksa.com
      }
      return u.toString();
    } catch {
      /* fall through */
    }
  }

  // Relative path fallback
  let path = stripPublic(s);
  if (!path.startsWith("/")) path = `/${path}`;
  return /\/storage\//.test(path)
    ? `https://gulfcargoksa.com${path}`
    : path;
}
