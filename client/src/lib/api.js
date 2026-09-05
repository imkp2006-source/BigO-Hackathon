// REST API Client for Logistics Hub
const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  // Inventory
  getInventory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inventory?${qs}`);
  },
  getProductBySku: (sku) => request(`/inventory/${sku}`),

  // Locations & Warehouse Map
  getLocations: () => request('/locations'),
  getBinDetails: (locationCode) => request(`/locations/${locationCode}`),
  updateRowCongestion: (rowCode, congestionLevel) => request('/locations/row-congestion', {
    method: 'PATCH',
    body: JSON.stringify({ rowCode, congestionLevel })
  }),

  // Orders & Intake
  getOrders: () => request('/orders'),
  getOrderDetails: (id) => request(`/orders/${id}`),
  createOrder: (orderData) => request('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),

  // Picking & Handheld Verification
  getPickingTasks: () => request('/picking/tasks'),
  getActivePickingTask: () => request('/picking/active'),
  verifyScan: (data) => request('/picking/verify-scan', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  completePick: (data) => request('/picking/complete', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Movements Audit Log
  getMovements: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/movements?${qs}`);
  },

  // Stock Operations: Put-Away & Transfers
  splitPutaway: (data) => request('/putaway/split', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  transferStock: (data) => request('/transfers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Discrepancies
  getDiscrepancies: () => request('/discrepancies'),
  reportDiscrepancy: (data) => request('/discrepancies', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  resolveDiscrepancy: (id, data) => request(`/discrepancies/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Returns
  getReturns: () => request('/returns'),
  processReturn: (data) => request('/returns/process', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Dashboard Analytics
  getDashboardAnalytics: () => request('/analytics/dashboard'),

  // Search & NLP
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  nlSearch: (prompt) => request('/search/nl', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  }),

  // Demo Scenarios
  getDemoCases: () => request('/demo/cases'),
  resetDemoData: () => request('/demo/reset', { method: 'POST' })
};
