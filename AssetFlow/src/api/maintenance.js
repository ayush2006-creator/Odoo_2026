/**
 * Maintenance API — /maintenance-requests
 *
 * Permissions:
 *  - POST   /maintenance-requests                     → all authenticated users (Employee+)
 *  - GET    /maintenance-requests                     → Admin, AssetManager (all); DeptHead (dept); Employee (own)
 *  - GET    /maintenance-requests/:id                 → involved parties + Admin/AssetManager
 *  - PATCH  /maintenance-requests/:id/approve         → AssetManager (sets asset → Under Maintenance)
 *  - PATCH  /maintenance-requests/:id/reject          → AssetManager
 *  - PATCH  /maintenance-requests/:id/assign-technician → AssetManager
 *  - PATCH  /maintenance-requests/:id/start           → AssetManager (→ In Progress)
 *  - PATCH  /maintenance-requests/:id/resolve         → AssetManager (→ Resolved, asset → Available)
 */

import { get, post, patch } from './client';

/**
 * Raise a maintenance request (any authenticated user).
 * @param {{ assetId: string, issueDescription: string, priority: string, photo?: string }} data
 */
export function createMaintenanceRequest(data) {
  return post('/maintenance-requests', data);
}

/**
 * List maintenance requests with optional filters.
 * @param {{ asset?: string, status?: string, priority?: string }} [filters]
 */
export function getMaintenanceRequests(filters = {}) {
  return get('/maintenance-requests', filters);
}

/**
 * Get a single maintenance request by ID.
 * @param {string} id
 */
export function getMaintenanceRequest(id) {
  return get(`/maintenance-requests/${id}`);
}

/**
 * Approve a maintenance request (AssetManager).
 * Side-effect: asset status → Under Maintenance.
 * @param {string} id
 */
export function approveMaintenanceRequest(id) {
  return patch(`/maintenance-requests/${id}/approve`);
}

/**
 * Reject a maintenance request (AssetManager).
 * @param {string} id
 */
export function rejectMaintenanceRequest(id) {
  return patch(`/maintenance-requests/${id}/reject`);
}

/**
 * Assign a technician to a maintenance request (AssetManager).
 * @param {string} id
 * @param {{ technicianId: string }} data
 */
export function assignTechnician(id, data) {
  return patch(`/maintenance-requests/${id}/assign-technician`, data);
}

/**
 * Start maintenance work (AssetManager) — status → In Progress.
 * @param {string} id
 */
export function startMaintenance(id) {
  return patch(`/maintenance-requests/${id}/start`);
}

/**
 * Resolve a maintenance request (AssetManager).
 * Side-effect: asset status → Available.
 * @param {string} id
 * @param {{ resolutionNotes?: string }} data
 */
export function resolveMaintenance(id, data) {
  return patch(`/maintenance-requests/${id}/resolve`, data);
}
