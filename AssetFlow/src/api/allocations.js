/**
 * Allocations API — /allocations
 *
 * Permissions:
 *  - POST   /allocations          → Admin, AssetManager
 *  - GET    /allocations          → Admin, AssetManager (all); DeptHead (dept); Employee (own)
 *  - GET    /allocations/:id      → Admin, AssetManager, DeptHead (dept), Employee (own)
 *  - POST   /allocations/:id/return → Admin, AssetManager
 *  - GET    /allocations/overdue  → Admin, AssetManager
 *
 * Key business rule:
 *  POST /allocations returns 409 if the asset is already allocated.
 *  The 409 body contains current-holder info so the UI can offer a Transfer Request.
 */

import { get, post } from './client';

/**
 * Allocate an asset to an employee or department.
 * ⚠️ May throw ApiError with status 409 — catch it and show the transfer flow.
 * @param {{ assetId: string, holderType: 'Employee'|'Department', holderId: string,
 *           expectedReturnDate?: string }} data
 */
export function createAllocation(data) {
  return post('/allocations', data);
}

/**
 * List allocations with optional filters.
 * @param {{ employee?: string, department?: string, status?: string }} [filters]
 */
export function getAllocations(filters = {}) {
  return get('/allocations', filters);
}

/**
 * Get a single allocation by ID.
 * @param {string} id
 */
export function getAllocation(id) {
  return get(`/allocations/${id}`);
}

/**
 * Return an allocated asset — captures condition notes, reverts asset to Available.
 * @param {string} id — allocation ID
 * @param {{ conditionCheckInNotes?: string }} data
 */
export function returnAllocation(id, data) {
  return post(`/allocations/${id}/return`, data);
}

/**
 * List overdue allocations (Admin, AssetManager).
 */
export function getOverdueAllocations() {
  return get('/allocations/overdue');
}
