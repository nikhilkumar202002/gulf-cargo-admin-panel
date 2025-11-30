import React, { useMemo, useState } from "react";

const normalizeLogoUrl = (u = "") => {
  if (!u) return "";
  // decode &amp; etc.
  u = String(u).replace(/&amp;/g, "&");

  try {
    // absolute URL?
    const url = new URL(u);
    if (url.protocol === "http:") url.protocol = "https:"; // avoid mixed-content
    return url.toString();
  } catch {
    // relative or protocol-less
    const ORIGIN = import.meta.env.VITE_API_ORIGIN || ""; // e.g. https://api.gulfcargoksa.com
    if (u.startsWith("//")) return `https:${u}`;
    if (u.startsWith("/")) return `${ORIGIN}${u}`;
    if (/^public\/storage\//i.test(u)) return `${ORIGIN}/${u}`;
    if (/^storage\//i.test(u)) return `${ORIGIN}/${u}`;
    return `https://${u}`; // last resort
  }
};

const initialsOf = (name = "") =>
  name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();

/** Re-usable avatar for rectangular logos (default 120×64) */
export default function Avatar({ url, name, width = 120, height = 64, className = "" }) {
  const [broken, setBroken] = useState(false);
  const src = useMemo(() => normalizeLogoUrl(url), [url]);
  const style = { width, height };

  if (!src || broken) {
    return (
      <div
        style={style}
        className={`rounded-xl bg-slate-200 grid place-items-center text-slate-700 font-semibold shadow-sm ${className}`}
        aria-label={name || "—"}
        title={name || "Logo"}
      >
        {initialsOf(name) || "LOGO"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || "Logo"}
      style={style}
      className={`rounded-xl object-contain bg-white border shadow-sm ${className}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        console.warn("Logo failed to load:", src);
        setBroken(true);
      }}
      title={name || "Logo"}
    />
  );
}
