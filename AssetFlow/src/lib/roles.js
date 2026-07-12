/**
 * Role constants and hierarchy for AssetFlow.
 *
 * Four roles (from modelsAndEndpoints.md):
 *   Admin > AssetManager > DepartmentHead > Employee
 *
 * Roles are set server-side via PATCH /employees/:id/role (Admin only).
 * Signup always creates a plain Employee.
 */

export const ROLES = Object.freeze({
  ADMIN: 'Admin',
  ASSET_MANAGER: 'AssetManager',
  DEPARTMENT_HEAD: 'DepartmentHead',
  EMPLOYEE: 'Employee',
});

/**
 * Hierarchy level — higher number = more privilege.
 * Used by `hasMinRole()` in permissions.js.
 */
export const ROLE_HIERARCHY = Object.freeze({
  [ROLES.EMPLOYEE]: 0,
  [ROLES.DEPARTMENT_HEAD]: 1,
  [ROLES.ASSET_MANAGER]: 2,
  [ROLES.ADMIN]: 3,
});

/** Human-readable labels for UI display */
export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.ASSET_MANAGER]: 'Asset Manager',
  [ROLES.DEPARTMENT_HEAD]: 'Department Head',
  [ROLES.EMPLOYEE]: 'Employee',
});
