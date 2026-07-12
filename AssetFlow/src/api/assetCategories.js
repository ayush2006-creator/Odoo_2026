/**
 * Asset Categories API — /asset-categories  (Org Setup — Tab B)
 *
 * Permissions:
 *  - GET    → all authenticated users
 *  - POST   → Admin only
 *  - PATCH  → Admin only
 *  - DELETE → Admin only
 */

import { get, post, patch, del } from './client';

/**
 * List all asset categories.
 */
export function getAssetCategories() {
  return get('/asset-categories');
}

/**
 * Create a new category (Admin only).
 * @param {{ name: string, customFields?: object }} data
 */
export function createAssetCategory(data) {
  return post('/asset-categories', data);
}

/**
 * Update a category (Admin only).
 * @param {string} id
 * @param {object} data
 */
export function updateAssetCategory(id, data) {
  return patch(`/asset-categories/${id}`, data);
}

/**
 * Delete a category (Admin only).
 * @param {string} id
 */
export function deleteAssetCategory(id) {
  return del(`/asset-categories/${id}`);
}
