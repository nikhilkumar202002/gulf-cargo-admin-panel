import api from "./axios";

const unwrap = (res) => res?.data ?? res;

/* ==========================================================================
   CARGO CRUD (Individual Packages)
   ========================================================================== */

export const listCargos = async (params = {}) => {
  const res = await api.get("/cargos", { params });
  return unwrap(res);
};

export const getCargoById = async (id) => {
  if (!id) throw new Error("Cargo ID is required");
  // Try plural first, then singular fallback
  try {
      const res = await api.get(`/cargos/${id}`);
      return res?.data?.data ?? res?.data?.cargo ?? unwrap(res);
  } catch (e) {
      // Fallback to singular endpoint if plural 404s
      const res = await api.get(`/cargo/${id}`);
      return res?.data?.data ?? res?.data?.cargo ?? unwrap(res);
  }
};

export const createCargo = async (payload) => {
  const res = await api.post("/cargo", payload);
  return unwrap(res);
};
export const updateCargo = async (id, payload) => {
  if (!id) throw new Error("Cargo ID is required");
  const res = await api.patch(`/cargo/${id}`, payload);
  return unwrap(res);
};

export const deleteCargo = async (id) => {
  const res = await api.delete(`/cargos/${id}`);
  return unwrap(res);
};

export const updateCargoStatus = async (payload) => {
  const res = await api.patch("/cargos/status", payload);
  return unwrap(res);
};
export const bulkUpdateCargoStatus = updateCargoStatus;

/* ==========================================================================
   SHIPMENT CRUD (Grouping Cargos) - Migrated from shipmentCargo.js
   ========================================================================== */

export const listCargoShipments = async (params = {}) => {
  const res = await api.get("/cargo-shipments", { params });
  return unwrap(res);
};

export const getCargoShipment = async (id) => {
  const res = await api.get(`/cargo-shipment/${id}`);
  return unwrap(res);
};
export const getCargoShipmentById = getCargoShipment;

export const createCargoShipment = async (raw) => {
  const payload = {
    origin_port_id: raw?.origin_port_id ?? raw?.portOfOrigin ?? null,
    destination_port_id: raw?.destination_port_id ?? raw?.portOfDestination ?? null,
    awb_or_container_number: raw?.awb_or_container_number ?? raw?.awbNo ?? "",
    created_on: raw?.created_on ?? raw?.createdOn ?? new Date().toISOString().split('T')[0],
    branch_id: Number(raw?.branch_id),
    created_by_id: Number(raw?.created_by_id),
    shipment_status_id: Number(raw?.shipment_status_id),
    cargo_ids: Array.isArray(raw?.cargo_ids) ? raw.cargo_ids.map(Number) : [],
    shipment_number: raw?.shipment_number,
    license_details: raw?.license_details,
    exchange_rate: raw?.exchange_rate,
    shipping_method_id: raw?.shipping_method_id,
    clearing_agent_id: raw?.clearing_agent_id,
    remarks: raw?.remarks || raw?.shipmentDetails,
  };
  const res = await api.post("/cargo-shipment", payload);
  return unwrap(res);
};

export const updateCargoShipmentStatus = async (shipmentId, payload) => {
  const body = {
    shipment_status_id: payload?.shipment_status_id ?? payload?.status_id,
    remarks: payload?.remarks,
  };
  const res = await api.patch(`/cargo-shipment/${shipmentId}/status`, body);
  return unwrap(res);
};

export const bulkUpdateCargoShipmentStatus = async ({ shipment_ids, shipment_status_id, remarks }) => {
  const payload = { 
    shipment_ids: shipment_ids.map(Number), 
    shipment_status_id: Number(shipment_status_id), 
    remarks 
  };
  const res = await api.patch("/cargo-shipment/status/bulk", payload);
  return unwrap(res);
};

export const markCargoInShipment = async (cargoId) => {
  const res = await api.patch(`/cargo-shipment/${cargoId}/mark-in`);
  return unwrap(res);
};

export const markCargoNotInShipment = async (cargoId) => {
  const res = await api.patch(`/cargo-shipment/${cargoId}/mark-not`);
  return unwrap(res);
};

/* ==========================================================================
   UTILS (Invoice Logic & Helpers)
   ========================================================================== */

export const getNextInvoiceNo = async (branchId) => {
  try {
    const { data } = await api.get("/cargos", {
      params: { branch_id: branchId, per_page: 1, sort: "id", order: "desc" }
    });
    const list = data?.data ?? data ?? [];
    const lastRow = list[0];
    const lastNo = lastRow?.booking_no || lastRow?.invoice_no || "BR:000000";
    const match = String(lastNo).trim().match(/^(.*?)(\d+)$/);
    if (match) {
      const [, prefix, digits] = match;
      const nextNum = String(Number(digits) + 1).padStart(digits.length, "0");
      return `${prefix}${nextNum}`;
    }
    return `${lastNo}-1`;
  } catch (e) {
    return "BR:000001";
  }
};

export const normalizeCargoToInvoice = (raw) => {
  const cargo = (raw && raw.cargo) ? raw.cargo : raw || {};

  const parseWeights = (w) => {
    if (Array.isArray(w)) return w.map(Number);
    if (typeof w === 'string' && w.includes(',')) return w.split(',').map(Number);
    if (typeof w === 'object' && w !== null) return Object.values(w).map(Number);
    return [];
  };

  let items = [];
  if (Array.isArray(cargo.items) && cargo.items.length > 0) {
    items = cargo.items;
  } else if (cargo.boxes && typeof cargo.boxes === 'object') {
    Object.values(cargo.boxes).forEach(box => {
      if (Array.isArray(box?.items)) items.push(...box.items);
    });
  }

  let boxes = cargo.boxes;
  if ((!boxes || Object.keys(boxes).length === 0) && items.length > 0) {
    boxes = {};
    items.forEach(it => {
      const bn = String(it.box_number || it.box_no || 1);
      if (!boxes[bn]) boxes[bn] = { items: [] };
      boxes[bn].items.push(it);
    });
  }

  return {
    ...cargo,
    id: cargo.id || cargo.cargo_id,
    booking_no: cargo.booking_no || cargo.invoice_no || "",
    items,
    boxes, // Ensure this is populated
    box_weight: parseWeights(cargo.box_weight),
    
    // Financials safe defaults
    total_cost: Number(cargo.total_cost || 0),
    bill_charges: Number(cargo.bill_charges || 0),
    vat_cost: Number(cargo.vat_cost || 0),
    net_total: Number(cargo.net_total || 0),
    total_weight: Number(cargo.total_weight || 0),
    
    // Relations (handle object or string)
    sender: cargo.sender?.name || cargo.sender_name || cargo.sender,
    receiver: cargo.receiver?.name || cargo.receiver_name || cargo.receiver,
    branch: cargo.branch?.name || cargo.branch_name || cargo.branch,
  };
};

export const buildCargoPayload = (form, boxes, derived, methods = []) => {
  const { subtotal, billCharges, totalAmount, rows: R } = derived;
  
  const flatItems = [];
  const boxWeights = [];
  const groupedBoxes = {};
  
  boxes.forEach((box, i) => {
    const boxNum = String(i + 1);
    const weight = Number(box.box_weight || 0);
    boxWeights.push(weight.toFixed(3));
    
    // Construct grouped structure for API/Invoice
    groupedBoxes[boxNum] = {
      box_weight: weight.toFixed(3),
      items: []
    };

    (box.items || []).forEach((it, idx) => {
      const itemObj = {
        slno: String(idx + 1),
        box_number: boxNum, // Important for grouping
        name: it.name || `Box ${boxNum} Item`,
        piece_no: String(it.pieces || 0),
        weight: (idx === 0 ? weight : 0).toFixed(3), 
        unit_price: "0.00",
        total_price: "0.00"
      };
      
      flatItems.push(itemObj);
      groupedBoxes[boxNum].items.push(itemObj);
    });
  });

  return {
    branch_id: Number(form.branchId),
    booking_no: form.invoiceNo,
    sender_id: Number(form.senderId),
    receiver_id: Number(form.receiverId),
    shipping_method_id: Number(form.shippingMethodId),
    payment_method_id: Number(form.paymentMethodId),
    status_id: Number(form.statusId || 13),
    delivery_type_id: Number(form.deliveryTypeId),
    
    date: form.date,
    time: form.time,
    lrl_tracking_code: form.lrlTrackingCode,
    special_remarks: form.specialRemarks,
    
    collected_by_id: Number(form.collectedByRoleId),
    name_id: Number(form.collectedByPersonId),
    collected_by: form.collectedByRoleName,

    items: flatItems,
    box_weight: boxWeights,
    boxes: groupedBoxes, // Explicitly passing the grouped object
    no_of_pieces: flatItems.reduce((s, i) => s + Number(i.piece_no), 0),
    
    total_cost: subtotal,
    bill_charges: billCharges,
    vat_percentage: Number(form.vatPercentage || 0),
    vat_cost: Number(((subtotal * (form.vatPercentage || 0)) / 100).toFixed(2)),
    net_total: totalAmount,
    total_weight: boxes.reduce((s, b) => s + Number(b.box_weight || 0), 0),
    
    ...Object.keys(R).reduce((acc, key) => {
       acc[`quantity_${key}`] = R[key].qty;
       acc[`unit_rate_${key}`] = R[key].rate;
       acc[`amount_${key}`] = R[key].amount;
       return acc;
    }, {})
  };
};

export default {
  listCargos,
  getCargoById,
  createCargo,
  updateCargo,
  deleteCargo,
  createCargoShipment,
  getCargoShipment,
  updateCargoShipmentStatus,
  bulkUpdateCargoShipmentStatus,
  markCargoInShipment,
  markCargoNotInShipment,
  getNextInvoiceNo,
  normalizeCargoToInvoice,
  buildCargoPayload
};