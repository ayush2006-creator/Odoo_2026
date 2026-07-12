/**
 * Assets API — /assets
 *
 * Permissions:
 *  - GET    /assets              → Admin, AssetManager (all); DeptHead (own dept); Employee (own)
 *  - POST   /assets              → Admin, AssetManager
 *  - PATCH  /assets/:id          → Admin, AssetManager
 *  - GET    allocation/maint history → Admin, AssetManager, DeptHead
 *  - POST   /assets/:id/transition → Admin, AssetManager (state machine transition)
 */

import { get, post, patch } from './client';

/**
 * List assets with filters.
 * @param {{ tag?: string, serial?: string, qr?: string, category?: string,
 *           status?: string, department?: string, location?: string }} [filters]
 */
export function getAssets(filters = {}) {
  return get('/assets', filters);
}

/**
 * Register a new asset (Admin, AssetManager).
 * Auto-generates assetTag, sets status=Available.
 * @param {object} data — name, categoryId, serialNumber, acquisitionDate, etc.
 */
export function createAsset(data) {
  return post('/assets', data);
}

/**
 * Get a single asset by ID.
 * @param {string} id
 */
export function getAsset(id) {
  return get(`/assets/${id}`);
}

/**
 * Update asset fields (Admin, AssetManager).
 * @param {string} id
 * @param {object} data
 */
export function updateAsset(id, data) {
  return patch(`/assets/${id}`, data);
}

/**
 * Get allocation history for an asset.
 * @param {string} id
 */
export function getAssetAllocationHistory(id) {
  return get(`/assets/${id}/allocation-history`);
}

/**
 * Get maintenance history for an asset.
 * @param {string} id
 */
export function getAssetMaintenanceHistory(id) {
  return get(`/assets/${id}/maintenance-history`);
}

/**
 * Trigger a state transition (e.g. Available ↔ Under Maintenance).
 * Enforced server-side via asset state machine (Admin, AssetManager).
 * @param {string} id
 * @param {{ status: string }} data — target status
 */
export function transitionAsset(id, data) {
  return post(`/assets/${id}/transition`, data);
}
