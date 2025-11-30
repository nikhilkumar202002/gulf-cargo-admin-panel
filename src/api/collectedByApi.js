// src/api/collectedByApi.js
// Fetches "Collected By" roles (e.g., Driver, Office)
// Adjust the endpoint if your backend uses a different path.

import axiosInstance from "./axiosInstance";

function parseAxiosError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const msg =
    data?.message ||
    data?.error ||
    err?.message ||
    `Request failed${status ? ` (${status})` : ""}`;
  const errors = data?.errors && typeof data.errors === "object" ? data.errors : null;
  let details = "";
  if (errors) {
    const flat = Object.entries(errors).map(
      ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`
    );
    details = ` — ${flat.join(" | ")}`;
  }
  const e = new Error(msg + details);
  e.status = status;
  e.details = data;
  throw e;
}

export async function getActiveCollected() {
  try {
    // If your backend uses '/collected-by', change it below:
    const { data } = await axiosInstance.get("/collected", { timeout: 15000 });
    // Expected shape: { success: true, data: [ {id:1,name:'Driver'}, {id:2,name:'Office'} ] }
    return data;
  } catch (err) {
    parseAxiosError(err);
  }
}
