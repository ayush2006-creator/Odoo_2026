/**
 * Departments API — /departments  (Org Setup — Tab A)
 *
 * Permissions:
 *  - GET    → all authenticated users (filtered by role server-side)
 *  - POST   → Admin only
 *  - PATCH  → Admin only
 *  - DELETE → Admin only (soft-delete / deactivate)
 */

import { get, post, patch, del } from './client';

/**
 * List all departments.
 */
export function getDepartments() {
  return get('/departments');
}

/**
 * Create a new department (Admin only).
 * @param {{ name: string, parentDepartmentId?: string, departmentHeadId?: string }} data
 */
export function createDepartment(data) {
  return post('/departments', data);
}

/**
 * Get a single department by ID.
 * @param {string} id
 */
export function getDepartment(id) {
  return get(`/departments/${id}`);
}

/**
 * Update a department (Admin only).
 * @param {string} id
 * @param {object} data
 */
export function updateDepartment(id, data) {
  return patch(`/departments/${id}`, data);
}

/**
 * Deactivate a department — soft delete (Admin only).
 * @param {string} id
 */
export function deleteDepartment(id) {
  return del(`/departments/${id}`);
}
