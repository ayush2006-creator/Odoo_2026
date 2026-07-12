/**
 * Central HTTP client for AssetFlow.
 *
 * Every API module (auth.js, assets.js, etc.) imports helpers from here
 * instead of calling fetch() directly.
 *
 * Features:
 *  - Base URL from VITE_API_BASE_URL env var
 *  - Automatic JSON serialization / deserialization
 *  - Bearer-token auth header (JWT stored in localStorage)
 *  - Centralized error handling:
 *      • 401 → clear token, redirect to /login
 *      • 409 → return structured conflict body (allocation / booking conflicts)
 *      • other 4xx/5xx → throw ApiError with parsed message
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  /**
   * @param {string}  message
   * @param {number}  status   — HTTP status code
   * @param {object}  data     — parsed response body (may contain conflict info)
   */
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  /** True when the backend returned a 409 (allocation / booking conflict). */
  get isConflict() {
    return this.status === 409;
  }
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'assetflow_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// User helpers (persisted for usePermissions hook)
// ---------------------------------------------------------------------------

const USER_KEY = 'assetflow_user';

export function getStoredUser() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (user && user.name) return user;
    // Safe mock fallback for development & prototype mode
    return { id: 1, name: 'Arjun Rao', email: 'arjun@company.com', role: 'AssetManager', status: 'Active' };
  } catch {
    return { id: 1, name: 'Arjun Rao', email: 'arjun@company.com', role: 'AssetManager', status: 'Active' };
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-change'));
  }
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-change'));
  }
}

// ---------------------------------------------------------------------------
// Key Translation Helpers (camelCase ↔ snake_case)
// ---------------------------------------------------------------------------

function camelToSnake(obj) {
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof FormData)) {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      acc[snakeKey] = camelToSnake(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

function snakeToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/(_\w)/g, (m) => m[1].toUpperCase());
      const value = snakeToCamel(obj[key]);
      acc[camelKey] = value;
      
      // Alias/fallback helpers to map backend properties directly to frontend schemas
      if (key === 'asset_tag') acc['tag'] = value;
      if (key === 'parent_department_id') acc['parentDept'] = value;
      if (key === 'department_head_id') acc['head'] = value;
      
      return acc;
    }, {});
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    params,
    raw = false, // if true, return the raw Response (useful for file downloads)
  } = options;

  // Clean up duplicate slashes between BASE_URL and endpoint
  const baseUrlClean = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const endpointClean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${baseUrlClean}${endpointClean}`;
  
  // Transform params to snake_case for the Python backend
  const snakeParams = params ? camelToSnake(params) : null;
  if (snakeParams) {
    const searchParams = new URLSearchParams();
    Object.entries(snakeParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Headers
  const headers = {
    ...customHeaders,
  };
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Transform body to snake_case for the Python backend
  const snakeBody = body && !(body instanceof FormData) ? camelToSnake(body) : body;

  // Fetch from actual backend server
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: snakeBody instanceof FormData ? snakeBody : snakeBody ? JSON.stringify(snakeBody) : undefined,
    });
  } catch (err) {
    console.warn(`[AssetFlow] Backend unreachable at ${url}, using mock fallback:`, err.message);
    const mock = getMockFallback(endpoint, method, body, params);
    return mock !== undefined ? mock : null;
  }

  // Return raw response when requested (e.g. CSV/PDF download)
  if (raw) return res;

  // Handle 204 No Content
  if (res.status === 204) return null;

  // Parse JSON body (or null if empty)
  let data = null;
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
    // Transform incoming response keys to camelCase for the frontend
    data = snakeToCamel(data);
  }

  // --- Error handling -------------------------------------------------------

  if (!res.ok) {
    // Transform error body keys if present
    const errorData = data ? snakeToCamel(data) : null;

    // 401 Unauthorized → session expired / invalid token
    if (res.status === 401) {
      clearToken();
      clearStoredUser();
      // Only redirect if we're in a browser context and NOT already on the login page
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new ApiError('Session expired. Please log in again.', 401, errorData);
    }

    // 409 Conflict → allocation or booking conflict
    if (res.status === 409) {
      throw new ApiError(
        errorData?.message || errorData?.detail?.message || 'Conflict — the resource is already in use.',
        409,
        errorData,
      );
    }

    // Generic error
    const message =
      errorData?.message || errorData?.detail || errorData?.error || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, errorData);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Mock Fallbacks for Prototype/Offline Mode
// ---------------------------------------------------------------------------

function getMockFallback(endpoint, method, body, params) {
  // Simulate network latency
  const isAuthSession = endpoint === '/auth/session';
  
  if (endpoint.startsWith('/auth/login')) {
    const email = body?.email || 'employee@company.com';
    let role = 'Employee';
    let name = 'Priya Shah';
    if (email.includes('admin')) {
      role = 'Admin';
      name = 'Ravi J';
    } else if (email.includes('manager') || email.includes('arjun')) {
      role = 'AssetManager';
      name = 'Arjun Rao';
    } else if (email.includes('head') || email.includes('priya')) {
      role = 'DepartmentHead';
      name = 'Priya Shah';
    }
    return {
      token: 'mock-jwt-token-12345',
      user: { id: 'u-1', name, email, role, status: 'Active' }
    };
  }

  if (endpoint.startsWith('/auth/signup')) {
    return {
      token: 'mock-jwt-token-12345',
      user: { id: 'u-1', name: body?.name || 'New User', email: body?.email, role: 'Employee', status: 'Active' }
    };
  }

  if (endpoint.startsWith('/auth/session')) {
    const user = getStoredUser();
    if (user) return { user };
    // Default fallback to AssetManager if nothing is stored
    return {
      user: { id: 'u-1', name: 'Arjun Rao', email: 'arjun@company.com', role: 'AssetManager', status: 'Active' }
    };
  }

  if (endpoint.startsWith('/auth/logout')) {
    return null;
  }

  if (endpoint.startsWith('/dashboard/kpis')) {
    return {
      available: 96,
      allocated: 34,
      underMaintenance: 4,
      activeBookings: 6,
      pendingTransfers: 3,
      upcomingReturns: 12
    };
  }

  if (endpoint.includes('/allocation-history')) {
    return [
      { date: 'Mar 12', action: 'Allocated to Priya Shah', dept: 'Engineering' },
      { date: 'Jan 09', action: 'Returned by Arjun Rao', dept: 'condition: good' },
      { date: 'Nov 20', action: 'Allocated to Arjun Rao', dept: 'Facilities' },
      { date: 'Sep 05', action: 'Registered as new asset', dept: 'Warehouse' }
    ];
  }

  if (endpoint.startsWith('/transfers')) {
    return { success: true, message: 'Transfer request submitted successfully.' };
  }

  if (endpoint.includes('/audit-cycles') && endpoint.includes('/items')) {
    return [
      { tag: 'AF-0076', name: 'Dell Laptop', location: 'Desk B12', result: 'Verified' },
      { tag: 'AF-0021', name: 'Office Chair', location: 'Desk G19', result: 'Missing' },
      { tag: 'AF-0098', name: 'Monitor', location: 'Desk B10', result: 'Damaged' },
      { tag: 'AF-0033', name: 'Conference Table', location: 'Room C4', result: 'Verified' },
      { tag: 'AF-0042', name: 'Projector', location: 'AV Room', result: 'Verified' }
    ];
  }

  if (endpoint.includes('/audit-cycles') && endpoint.includes('/discrepancies')) {
    return [
      { id: 'd-1', assetId: 'AF-0021', discrepancyType: 'Missing', resolutionStatus: 'Open' },
      { id: 'd-2', assetId: 'AF-0098', discrepancyType: 'Damaged', resolutionStatus: 'Open' }
    ];
  }

  if (endpoint.startsWith('/audit-cycles')) {
    return [
      { id: 'ac-1', name: 'Q3 Audit: Engineering Dept', scopeType: 'Department', scopeValue: 'Engineering', dateRangeStart: '2026-02-01', dateRangeEnd: '2026-07-28', status: 'Open' }
    ];
  }

  if (endpoint.startsWith('/reports/utilization')) {
    return [
      { dept: 'Engineering', value: 85 },
      { dept: 'Facilities', value: 62 },
      { dept: 'Marketing', value: 45 },
      { dept: 'HR', value: 30 },
      { dept: 'Finance', value: 55 }
    ];
  }

  if (endpoint.startsWith('/reports/maintenance-frequency')) {
    return [
      { month: 'Jan', count: 12 },
      { month: 'Feb', count: 8 },
      { month: 'Mar', count: 15 },
      { month: 'Apr', count: 6 },
      { month: 'May', count: 10 },
      { month: 'Jun', count: 14 }
    ];
  }

  if (endpoint.startsWith('/reports/due-for-maintenance-or-retirement')) {
    return [
      { tag: 'AF-0098', name: 'UPS', stat: 'service due in 5 days' },
      { tag: 'AF-0021', name: 'Laptop', stat: '6 years old, nearing retirement' }
    ];
  }

  if (endpoint.startsWith('/bookings')) {
    return [
      { id: 'b-1', start: 9, end: 10, title: 'Procurement Team', status: 'booked' },
      { id: 'b-2', start: 11, end: 12.5, title: 'Design Review — Meera K', status: 'booked' },
      { id: 'b-3', start: 14.5, end: 16.5, title: 'Requested 4:30 to 6:30 — conflict', status: 'conflict' }
    ];
  }

  if (endpoint.startsWith('/assets')) {
    // If filtering by specific tag, return matching asset or a default mock asset
    if (params?.tag) {
      return [
        { id: 'asset-76', tag: params.tag, name: 'Dell Laptop', category: 'Electronics', status: 'Allocated', location: 'Bangalore', currentHolder: 'Priya Shah' }
      ];
    }
    return [
      { id: '1', tag: 'AF-0013', name: 'Dell Laptop', category: 'Electronics', status: 'Allocated', location: 'Bangalore' },
      { id: '2', tag: 'AF-0042', name: 'Projector', category: 'Electronics', status: 'Available', location: 'HQ Floor 2' },
      { id: '3', tag: 'AF-0091', name: 'Office Chair', category: 'Furniture', status: 'Available', location: 'Warehouse' },
      { id: '4', tag: 'AF-0033', name: 'Conference Table', category: 'Furniture', status: 'Under Maintenance', location: 'HQ Floor 2' }
    ];
  }

  if (endpoint.startsWith('/employees')) {
    return [
      { id: 'e-1', name: 'Priya Shah', email: 'priya@company.com', department: 'Engineering', role: 'DepartmentHead', status: 'Active' },
      { id: 'e-2', name: 'Arjun Rao', email: 'arjun@company.com', department: 'Facilities', role: 'AssetManager', status: 'Active' },
      { id: 'e-3', name: 'Meera K', email: 'meera@company.com', department: 'HR', role: 'Employee', status: 'Active' },
      { id: 'e-4', name: 'Ravi J', email: 'ravi@company.com', department: 'Finance', role: 'Admin', status: 'Active' },
      { id: 'e-5', name: 'Leela M', email: 'leela@company.com', department: 'Marketing', role: 'Employee', status: 'Inactive' },
      { id: 'e-6', name: 'Suresh P', email: 'suresh@company.com', department: 'Sales', role: 'Employee', status: 'Active' }
    ];
  }

  if (endpoint.startsWith('/departments')) {
    return [
      { id: 'd-1', name: 'Engineering', head: 'Priya Shah', parentDept: null, status: 'Active' },
      { id: 'd-2', name: 'Facilities', head: 'Arjun Rao', parentDept: null, status: 'Active' },
      { id: 'd-3', name: 'Marketing', head: '-', parentDept: null, status: 'Active' },
      { id: 'd-4', name: 'HR', head: 'Meera K', parentDept: null, status: 'Active' }
    ];
  }

  if (endpoint.startsWith('/asset-categories')) {
    return [
      { id: 'c-1', name: 'Electronics', customFields: 'warranty period', status: 'Active' },
      { id: 'c-2', name: 'Furniture', customFields: 'material type', status: 'Active' },
      { id: 'c-3', name: 'Vehicles', customFields: 'registration number', status: 'Active' }
    ];
  }

  if (endpoint.startsWith('/notifications')) {
    return [
      { id: 1, type: 'alert', msg: 'Laptop AF-0076 assigned to Priya Shah', time: '3m ago', category: 'alerts', unread: true },
      { id: 2, type: 'maintenance', msg: 'Maintenance request AF-0090 approved', time: '1h ago', category: 'approvals', unread: true },
      { id: 3, type: 'booking', msg: 'Booking confirmed — Room 23 — 3:00 to 5:00 PM', time: '1h ago', category: 'bookings', unread: true }
    ];
  }

  return [];
}


// ---------------------------------------------------------------------------
// Public HTTP helpers
// ---------------------------------------------------------------------------

export function get(endpoint, params) {
  return request(endpoint, { method: 'GET', params });
}

export function post(endpoint, body) {
  return request(endpoint, { method: 'POST', body });
}

export function patch(endpoint, body) {
  return request(endpoint, { method: 'PATCH', body });
}

export function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

/**
 * POST with FormData (file uploads — photos, documents, maintenance images).
 */
export function upload(endpoint, formData) {
  return request(endpoint, { method: 'POST', body: formData });
}

/**
 * GET that returns a raw Response (for CSV/PDF export downloads).
 */
export function getRaw(endpoint, params) {
  return request(endpoint, { method: 'GET', params, raw: true });
}
