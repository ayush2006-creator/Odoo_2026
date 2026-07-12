/**
 * Audit Cycles API — /audit-cycles
 *
 * Permissions:
 *  - POST   /audit-cycles                        → Admin, AssetManager
 *  - GET    /audit-cycles                         → Admin, AssetManager
 *  - GET    /audit-cycles/:id                     → Admin, AssetManager, assigned auditors
 *  - POST   /audit-cycles/:id/auditors            → Admin, AssetManager (assign auditors)
 *  - GET    /audit-cycles/:id/items               → Admin, AssetManager, assigned auditors
 *  - PATCH  /audit-cycles/:id/items/:assetId      → assigned auditors (mark Verified/Missing/Damaged)
 *  - GET    /audit-cycles/:id/discrepancies       → Admin, AssetManager
 *  - PATCH  /audit-cycles/:id/close               → Admin, AssetManager (locks cycle, updates asset statuses)
 */

import { get, post, patch } from './client';

/**
 * Create a new audit cycle (Admin, AssetManager).
 * @param {{ name: string, scopeType: 'Department'|'Location', scopeValue: string,
 *           dateRangeStart: string, dateRangeEnd: string }} data
 */
export function createAuditCycle(data) {
  return post('/audit-cycles', data);
}

/**
 * List all audit cycles.
 */
export function getAuditCycles() {
  return get('/audit-cycles');
}

/**
 * Get a single audit cycle by ID.
 * @param {string} id
 */
export function getAuditCycle(id) {
  return get(`/audit-cycles/${id}`);
}

/**
 * Assign auditors to a cycle (Admin, AssetManager).
 * @param {string} id — audit cycle ID
 * @param {{ auditorIds: string[] }} data
 */
export function assignAuditors(id, data) {
  return post(`/audit-cycles/${id}/auditors`, data);
}

/**
 * Get audit items (assets to verify) in a cycle.
 * @param {string} id — audit cycle ID
 */
export function getAuditItems(id) {
  return get(`/audit-cycles/${id}/items`);
}

/**
 * Mark an asset's audit result (assigned auditor).
 * @param {string} cycleId
 * @param {string} assetId
 * @param {{ result: 'Verified'|'Missing'|'Damaged', notes?: string }} data
 */
export function updateAuditItem(cycleId, assetId, data) {
  return patch(`/audit-cycles/${cycleId}/items/${assetId}`, data);
}

/**
 * Get auto-generated discrepancy report for a cycle.
 * @param {string} id — audit cycle ID
 */
export function getDiscrepancies(id) {
  return get(`/audit-cycles/${id}/discrepancies`);
}

/**
 * Close an audit cycle — locks it and updates asset statuses (e.g. → Lost).
 * @param {string} id — audit cycle ID
 */
export function closeAuditCycle(id) {
  return patch(`/audit-cycles/${id}/close`);
}
