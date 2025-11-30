// src/api/invoiceNumberApi.js
import axiosInstance from "./axiosInstance";

/**
 * Create a new invoice numbering record
 * POST /invoice-numbering
 * @param {Object} payload
 * @returns {Promise<any>}
 */
export const createInvoiceNumbering = async (payload) => {
  const { data } = await axiosInstance.post("/invoice-numbering", payload);
  return data;
};

/**
 * Update an invoice numbering record by id
 * PUT /invoice-numbering/:id
 * @param {number|string} id
 * @param {Object} payload
 * @returns {Promise<any>}
 */
export const updateInvoiceNumbering = async (id, payload) => {
  const { data } = await axiosInstance.put(`/invoice-numbering/${id}`, payload);
  return data;
};

/**
 * Get all invoice numberings (optionally filter by status)
 * GET /invoice-numberings[?status=0|1]
 * @param {Object} [params] e.g., { status: 1 }
 * @returns {Promise<any>}
 */
export const getInvoiceNumberings = async (params = {}) => {
  const { data } = await axiosInstance.get("/invoice-numberings", { params });
  return data;
};

/**
 * Shorthands for active/inactive lists
 */
export const getActiveInvoiceNumberings = () => getInvoiceNumberings({ status: 1 });
export const getInactiveInvoiceNumberings = () => getInvoiceNumberings({ status: 0 });

/**
 * Get single invoice numbering by id
 * GET /invoice-numbering/:id
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export const getInvoiceNumberingById = async (id) => {
  const { data } = await axiosInstance.get(`/invoice-numbering/${id}`);
  return data;
};

/**
 * Delete invoice numbering by id
 * DELETE /invoice-numbering/:id
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export const deleteInvoiceNumbering = async (id) => {
  const { data } = await axiosInstance.delete(`/invoice-numbering/${id}`);
  return data;
};

/**
 * Optional: tiny unwrappers if your API uses { success, data } envelopes
 */
export const unwrapList = (res) => res?.data ?? res?.invoice_numberings ?? res ?? [];
export const unwrapItem = (res) => res?.data ?? res?.invoice_numbering ?? res ?? null;

export default {
  createInvoiceNumbering,
  updateInvoiceNumbering,
  getInvoiceNumberings,
  getActiveInvoiceNumberings,
  getInactiveInvoiceNumberings,
  getInvoiceNumberingById,
  deleteInvoiceNumbering,
  unwrapList,
  unwrapItem,
};
