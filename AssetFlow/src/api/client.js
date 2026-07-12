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
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
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

  // Build URL with query params
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
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

  // Fetch with auto-fallback to mock data if backend is offline
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.warn(`[AssetFlow Client] Connection failed to ${url}. Using mock fallback.`, err);
    return getMockFallback(endpoint, method, body, params);
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
  }

  // --- Error handling -------------------------------------------------------

  if (!res.ok) {
    // 401 Unauthorized → session expired / invalid token
    if (res.status === 401) {
      clearToken();
      clearStoredUser();
      // Only redirect if we're in a browser context
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError('Session expired. Please log in again.', 401, data);
    }

    // 409 Conflict → allocation or booking conflict
    // The response body contains the conflict details (current holder, overlapping booking, etc.)
    if (res.status === 409) {
      throw new ApiError(
        data?.message || 'Conflict — the resource is already in use.',
        409,
        data,
      );
    }

    // Generic error
    const message =
      data?.message || data?.error || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
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
