import * as React from "react";

// receiverFormHelper.js
export const normalizeList = (p) => {
  if (Array.isArray(p)) return p;

  // common API envelopes
  if (Array.isArray(p?.data?.data)) return p.data.data;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.items)) return p.items;

  // 🔥 your backend’s shapes
  if (Array.isArray(p?.districts)) return p.districts;
  if (Array.isArray(p?.states)) return p.states;
  if (Array.isArray(p?.countries)) return p.countries;
  if (Array.isArray(p?.document_types)) return p.document_types;
  if (Array.isArray(p?.documentTypes)) return p.documentTypes;

  // generic: return the first array property if there is exactly one
  if (p && typeof p === "object") {
    const arrays = Object.values(p).filter(Array.isArray);
    if (arrays.length === 1) return arrays[0];
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

/* ---- tolerant id + labels for world lists ---- */
export const getId = (o) =>
  String(o?.id ?? o?._id ?? o?.code ?? o?.uuid ?? o?.value ?? "");

export const labelOf = (o) =>
  o?.name ??
  o?.country ??
  o?.state ??
  o?.district_name ??
  o?.title ??
  `#${getId(o)}`;

/* ---- make ids safe for API (fixes district-by-state bug) ---- */
export const toApiId = (v) => {
  const s = String(v ?? "").trim();
  return /^\d+$/.test(s) ? Number(s) : s; // digits -> number, else keep string/uuid
};

/* ---- phone helpers (digits-only UI; payload uses +E.164) ---- */
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

export const onlyDigits = (c) => String(c || "").replace(/[^\d]/g, "");

export const composeE164 = (code, local) => {
  const c = String(code || "").replace(/[^\d]/g, "");
  const n = String(local || "").trim();
  if (!c && !n) return "";
  if (n.startsWith("+")) return n.replace(/\s+/g, "");
  return `+${c}${n.replace(/[^\d]/g, "")}`;
};

/* ---- detect +NN.. or 00NN.. pasted/typed into number input ---- */
export function detectCodeFromFreeText(value, codes /* e.g., ["966","91"] */) {
  if (!value) return null;
  let s = String(value).trim().replace(/\s+/g, "");
  if (!(s.startsWith("+") || s.startsWith("00"))) return null;
  if (s.startsWith("00")) s = s.replace(/^00/, "+");
  for (let len = 4; len >= 1; len--) {
    const candDigits = s.slice(1, 1 + len);
    if (codes.includes(candDigits)) {
      return { code: candDigits, rest: s.slice(1 + len) };
    }
  }
  return null;
}

/* ---- select digit typeahead: options are digits ("966","91",...) ---- */
export function useSelectDigitTypeahead(options, setValue) {
  const bufferRef = React.useRef("");
  const timerRef = React.useRef(null);
  const optionsRef = React.useRef(options);
  React.useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const clearLater = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      bufferRef.current = "";
    }, 900);
  }, []);

  const onKeyDown = React.useCallback(
    (e) => {
      const k = e.key;
      const currentOptions = optionsRef.current;

      if (
        k === "ArrowUp" ||
        k === "ArrowDown" ||
        k === "Home" ||
        k === "End" ||
        k === "Tab"
      ) {
        bufferRef.current = "";
        return;
      }

      if (k === "Backspace" || k === "Delete") {
        e.preventDefault();
        bufferRef.current = bufferRef.current.slice(0, -1);
        const hit = currentOptions.find((c) => c.startsWith(bufferRef.current));
        if (hit) setValue(hit);
        clearLater();
        return;
      }

      if (k === "Escape") {
        e.preventDefault();
        bufferRef.current = "";
        clearLater();
        return;
      }

      const isDigit =
        /^\d$/.test(k) ||
        (k.startsWith("Numpad") && /^\d$/.test(k.replace("Numpad", "")));
      if (!isDigit) return;

      e.preventDefault();
      const digit = /^\d$/.test(k) ? k : k.replace("Numpad", "");
      bufferRef.current += digit;

      const hit = currentOptions.find((c) =>
        c.startsWith(bufferRef.current)
      );
      if (hit) setValue(hit);

      clearLater();
    },
    [setValue, clearLater]
  );

  React.useEffect(
    () => () => timerRef.current && clearTimeout(timerRef.current),
    []
  );
  return { onKeyDown };
}

/* ---- smart input handlers: don't change code unless +/00 ---- */
export const onNumberChangeSmart =
  (phoneCodeOptions, setCode, setNumber) => (e) => {
    const val = e.target.value;
    if (/^(?:\+|00)/.test(val)) {
      const det = detectCodeFromFreeText(val, phoneCodeOptions);
      if (det) {
        setCode(det.code);
        setNumber(det.rest.replace(/[^\d]/g, ""));
        return;
      }
    }
    setNumber(val.replace(/[^\d]/g, ""));
  };

export const onNumberPasteSmart =
  (phoneCodeOptions, setCode, setNumber) => (e) => {
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const det = detectCodeFromFreeText(text, phoneCodeOptions);
    if (det) {
      e.preventDefault();
      setCode(det.code);
      setNumber(det.rest.replace(/[^\d]/g, ""));
    }
  };