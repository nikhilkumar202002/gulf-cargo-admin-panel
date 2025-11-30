import * as React from "react";

/* ---- list + doc helpers (extracted from formOptions) ---- */
// Source: your formOptions.js  :contentReference[oaicite:1]{index=1}
export const normalizeList = (p) => {
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data?.data)) return p.data.data;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.document_types)) return p.document_types;
  if (Array.isArray(p?.documentTypes)) return p.documentTypes;
  if (Array.isArray(p?.items)) return p.items;
  if (p && typeof p === "object") {
    const vals = Object.values(p);
    if (vals.length && vals.every((v) => typeof v === "object")) return vals;
  }
  return [];
};

export const getDocId = (d) =>
  String(
    d?.id ??
      d?.document_type_id ??
      d?.documentTypeId ??
      d?._id ??
      d?.value ??
      d?.code ??
      d?.uuid ??
      ""
  );

export const getDocLabel = (d) => {
  if (typeof d === "string" || typeof d === "number") return String(d);
  const flatKeys = [
    "name",
    "title",
    "label",
    "document",
    "document_name",
    "documentName",
    "type_name",
    "typeName",
    "doc_type",
    "docType",
    "display_name",
    "en_name",
    "arabic_name",
  ];
  for (const k of flatKeys) {
    const v = d?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const nestedCandidates = [
    d?.document_type?.name,
    d?.documentType?.name,
    d?.type?.name,
    d?.type?.label,
    d?.type?.title,
    d?.attributes?.name,
    d?.attributes?.title,
    d?.attributes?.label,
  ].filter(Boolean);
  for (const v of nestedCandidates) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const id = getDocId(d);
  if (d?.code) return String(d.code);
  return id ? `#${id}` : "Unknown";
};

/* ---- phone helpers for Sender (UI shows +codes) ---- */
export const getDialCode = (o) =>
  String(
    o?.dial_code ??
      o?.phone_code ??
      o?.code ??
      o?.calling_code ??
      o?.isd ??
      o?.prefix ??
      ""
  )
    .trim()
    .replace(/\s+/g, "");

export const withPlus = (c) => {
  const s = String(c || "").trim().replace(/\s+/g, "");
  if (!s) return "";
  return s.startsWith("+") ? s : `+${s.replace(/[^\d]/g, "")}`;
};

export const composeE164 = (code, local) => {
  const c = String(code || "").trim();
  const n = String(local || "").trim();
  if (!c && !n) return "";
  if (n.startsWith("+")) return n.replace(/\s+/g, "");
  const cc = c.startsWith("+") ? c : `+${c.replace(/[^\d]/g, "")}`;
  return `${cc}${n.replace(/[^\d]/g, "")}`;
};

/* ---- select digit typeahead: options are "+966","+91",... ---- */
export function useSelectDigitTypeahead(options, setValue) {
  const bufferRef = React.useRef("");
  const timerRef = React.useRef(null);

  const clearLater = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      bufferRef.current = "";
    }, 900);
  }, []);

  const onKeyDown = React.useCallback(
    (e) => {
      const k = e.key;

      if (k === "Backspace" || k === "Delete") {
        e.preventDefault();
        bufferRef.current = bufferRef.current.slice(0, -1);
        clearLater();
        return;
      }

      if (k === "Escape") {
        e.preventDefault();
        bufferRef.current = "";
        clearLater();
        return;
      }

      if (!/^\d$/.test(k)) return; // ignore arrows/tab/etc

      e.preventDefault(); // stop native jump
      bufferRef.current += k; // e.g. "91"
      const search = `+${bufferRef.current}`; // "+91"
      const hit = options.find((c) => c.startsWith(search));
      if (hit) setValue(hit);

      clearLater();
    },
    [options, setValue, clearLater]
  );

  React.useEffect(
    () => () => timerRef.current && clearTimeout(timerRef.current),
    []
  );
  return { onKeyDown };
}
