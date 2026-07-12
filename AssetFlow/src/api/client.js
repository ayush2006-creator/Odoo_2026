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

  // Fetch
  const res = await fetch(url, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

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
