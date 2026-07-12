/**
 * Transfers API — /transfers
 *
 * Permissions:
 *  - POST   /transfers              → any authenticated user (creates a request)
 *  - GET    /transfers              → Admin, AssetManager (all); DeptHead (dept)
 *  - GET    /transfers/:id          → involved parties + Admin/AssetManager
 *  - PATCH  /transfers/:id/approve  → AssetManager, DeptHead (own dept)
 *  - PATCH  /transfers/:id/reject   → AssetManager, DeptHead (own dept)
 */

import { get, post, patch } from './client';

/**
 * Create a transfer request.
 * Typically shown after an allocation conflict (409).
 * @param {{ assetId: string, fromHolderId: string, toHolderId: string }} data
 */
export function createTransfer(data) {
  return post('/transfers', data);
}

/**
 * List transfer requests with optional filters.
 * @param {{ status?: string }} [filters]
 */
export function getTransfers(filters = {}) {
  return get('/transfers', filters);
}

/**
 * Get a single transfer request by ID.
 * @param {string} id
 */
export function getTransfer(id) {
  return get(`/transfers/${id}`);
}

/**
 * Approve a transfer request (AssetManager, DeptHead for own dept).
 * @param {string} id
 */
export function approveTransfer(id) {
  return patch(`/transfers/${id}/approve`);
}

/**
 * Reject a transfer request (AssetManager, DeptHead for own dept).
 * @param {string} id
 */
export function rejectTransfer(id) {
  return patch(`/transfers/${id}/reject`);
}
