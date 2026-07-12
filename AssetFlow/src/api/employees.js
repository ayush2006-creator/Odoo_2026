/**
 * Employees API — /employees
 *
 * Permissions (from spec):
 *  - GET  /employees          → Admin, AssetManager (view all); DeptHead (own dept)
 *  - GET  /employees/:id      → Admin, AssetManager, DeptHead (own dept), Employee (self)
 *  - PATCH /employees/:id     → Admin only (update/deactivate)
 *  - PATCH /employees/:id/role → Admin only (promote to DeptHead/AssetManager)
 */

import { get, patch } from './client';

/**
 * List employees with optional filters.
 * @param {{ department?: string, role?: string, status?: string }} [filters]
 */
export function getEmployees(filters = {}) {
  return get('/employees', filters);
}

/**
 * Get a single employee by ID.
 * @param {string} id
 */
export function getEmployee(id) {
  return get(`/employees/${id}`);
}

/**
 * Update employee profile or deactivate (Admin only).
 * @param {string} id
 * @param {object} data — fields to update (name, email, departmentId, status, etc.)
 */
export function updateEmployee(id, data) {
  return patch(`/employees/${id}`, data);
}

/**
 * Change an employee's role (Admin only).
 * This is the ONLY way to assign DepartmentHead or AssetManager roles.
 * @param {string} id
 * @param {{ role: 'DepartmentHead' | 'AssetManager' | 'Employee' }} data
 */
export function updateEmployeeRole(id, data) {
  return patch(`/employees/${id}/role`, data);
}
