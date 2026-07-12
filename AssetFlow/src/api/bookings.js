/**
 * Bookings API — /bookings + /assets/:id/bookings
 *
 * Permissions:
 *  - GET    /assets/:id/bookings   → all authenticated users
 *  - POST   /bookings              → all authenticated users (Employee+)
 *  - GET    /bookings              → Admin, AssetManager (all); DeptHead (dept); Employee (own)
 *  - GET    /bookings/:id          → involved parties + Admin/AssetManager
 *  - PATCH  /bookings/:id/cancel   → booking creator, Admin, AssetManager
 *  - PATCH  /bookings/:id/reschedule → booking creator, Admin, AssetManager
 *  - GET    /bookings/upcoming     → Admin, AssetManager (for reminder notifications)
 *
 * Key business rule:
 *  POST /bookings returns 409 on overlap — response body includes the
 *  conflicting time slot. UI should suggest next available slot.
 */

import { get, post, patch } from './client';

/**
 * Get bookings calendar for a specific bookable asset.
 * @param {string} assetId
 * @param {{ startDate?: string, endDate?: string }} [params]
 */
export function getAssetBookings(assetId, params = {}) {
  return get(`/assets/${assetId}/bookings`, params);
}

/**
 * Create a new booking.
 * ⚠️ May throw ApiError with status 409 — catch it and show the conflicting slot.
 * @param {{ resourceId: string, startTime: string, endTime: string, purpose?: string }} data
 */
export function createBooking(data) {
  return post('/bookings', data);
}

/**
 * List bookings with optional filters.
 * @param {{ user?: string, resource?: string, status?: string,
 *           startDate?: string, endDate?: string }} [filters]
 */
export function getBookings(filters = {}) {
  return get('/bookings', filters);
}

/**
 * Get a single booking by ID.
 * @param {string} id
 */
export function getBooking(id) {
  return get(`/bookings/${id}`);
}

/**
 * Cancel a booking.
 * @param {string} id
 */
export function cancelBooking(id) {
  return patch(`/bookings/${id}/cancel`);
}

/**
 * Reschedule a booking.
 * @param {string} id
 * @param {{ startTime: string, endTime: string }} data
 */
export function rescheduleBooking(id, data) {
  return patch(`/bookings/${id}/reschedule`, data);
}

/**
 * Get upcoming bookings (for reminder notifications).
 */
export function getUpcomingBookings() {
  return get('/bookings/upcoming');
}
