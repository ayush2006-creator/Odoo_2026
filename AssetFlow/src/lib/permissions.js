/**
 * Centralized permission map for AssetFlow.
 *
 * Every UI action that needs a role gate is listed here.
 * Components never check `role === 'Admin'` directly — they call
 * `can(role, ACTION)` or use the `usePermissions` hook instead.
 *
 * Rules derived from modelsAndEndpoints.md + claude.md:
 *  - Admin:           full access, Org Setup, role promotion
 *  - Asset Manager:   asset CRUD, allocations, transfers (approve/reject),
 *                     maintenance (approve/reject/assign), audits, reports
 *  - Department Head: approve transfers for own dept, view dept assets,
 *                     view maintenance, limited reports
 *  - Employee:        view own assets, request transfers, book resources,
 *                     raise maintenance requests, view own notifications
 */

import { ROLES, ROLE_HIERARCHY } from './roles';

// ---------------------------------------------------------------------------
// Action keys — grouped by feature
// ---------------------------------------------------------------------------

export const ACTIONS = Object.freeze({
  // ── Org Setup (Tab A/B/C) ──────────────────────────────────────────────
  ORG_SETUP_VIEW: 'org_setup:view',
  DEPARTMENT_CREATE: 'department:create',
  DEPARTMENT_EDIT: 'department:edit',
  DEPARTMENT_DELETE: 'department:delete',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_EDIT: 'category:edit',
  CATEGORY_DELETE: 'category:delete',
  EMPLOYEE_VIEW_ALL: 'employee:view_all',
  EMPLOYEE_EDIT: 'employee:edit',
  EMPLOYEE_CHANGE_ROLE: 'employee:change_role',

  // ── Assets ─────────────────────────────────────────────────────────────
  ASSET_CREATE: 'asset:create',
  ASSET_EDIT: 'asset:edit',
  ASSET_VIEW_ALL: 'asset:view_all',
  ASSET_TRANSITION: 'asset:transition',

  // ── Allocations ────────────────────────────────────────────────────────
  ALLOCATION_CREATE: 'allocation:create',
  ALLOCATION_RETURN: 'allocation:return',
  ALLOCATION_VIEW_ALL: 'allocation:view_all',
  ALLOCATION_VIEW_OWN: 'allocation:view_own',

  // ── Transfers ──────────────────────────────────────────────────────────
  TRANSFER_CREATE: 'transfer:create',
  TRANSFER_APPROVE: 'transfer:approve',
  TRANSFER_REJECT: 'transfer:reject',
  TRANSFER_VIEW_ALL: 'transfer:view_all',

  // ── Bookings ───────────────────────────────────────────────────────────
  BOOKING_CREATE: 'booking:create',
  BOOKING_CANCEL: 'booking:cancel',
  BOOKING_RESCHEDULE: 'booking:reschedule',
  BOOKING_VIEW_ALL: 'booking:view_all',

  // ── Maintenance ────────────────────────────────────────────────────────
  MAINTENANCE_CREATE: 'maintenance:create',
  MAINTENANCE_APPROVE: 'maintenance:approve',
  MAINTENANCE_REJECT: 'maintenance:reject',
  MAINTENANCE_ASSIGN_TECH: 'maintenance:assign_tech',
  MAINTENANCE_START: 'maintenance:start',
  MAINTENANCE_RESOLVE: 'maintenance:resolve',
  MAINTENANCE_VIEW_ALL: 'maintenance:view_all',

  // ── Audits ─────────────────────────────────────────────────────────────
  AUDIT_CREATE: 'audit:create',
  AUDIT_ASSIGN_AUDITOR: 'audit:assign_auditor',
  AUDIT_VERIFY_ITEM: 'audit:verify_item',
  AUDIT_CLOSE: 'audit:close',
  AUDIT_VIEW_ALL: 'audit:view_all',

  // ── Reports & Dashboard ────────────────────────────────────────────────
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',
  DASHBOARD_VIEW: 'dashboard:view',

  // ── Notifications & Logs ───────────────────────────────────────────────
  NOTIFICATION_VIEW_OWN: 'notification:view_own',
  ACTIVITY_LOG_VIEW: 'activity_log:view',
});

// ---------------------------------------------------------------------------
// Role → allowed actions map
// ---------------------------------------------------------------------------

const PERMISSION_MAP = {
  [ROLES.ADMIN]: new Set(Object.values(ACTIONS)), // Admin can do everything

  [ROLES.ASSET_MANAGER]: new Set([
    // Assets — full CRUD
    ACTIONS.ASSET_CREATE,
    ACTIONS.ASSET_EDIT,
    ACTIONS.ASSET_VIEW_ALL,
    ACTIONS.ASSET_TRANSITION,
    // Allocations
    ACTIONS.ALLOCATION_CREATE,
    ACTIONS.ALLOCATION_RETURN,
    ACTIONS.ALLOCATION_VIEW_ALL,
    ACTIONS.ALLOCATION_VIEW_OWN,
    // Transfers
    ACTIONS.TRANSFER_CREATE,
    ACTIONS.TRANSFER_APPROVE,
    ACTIONS.TRANSFER_REJECT,
    ACTIONS.TRANSFER_VIEW_ALL,
    // Bookings
    ACTIONS.BOOKING_CREATE,
    ACTIONS.BOOKING_CANCEL,
    ACTIONS.BOOKING_RESCHEDULE,
    ACTIONS.BOOKING_VIEW_ALL,
    // Maintenance — approve/reject/assign/resolve
    ACTIONS.MAINTENANCE_CREATE,
    ACTIONS.MAINTENANCE_APPROVE,
    ACTIONS.MAINTENANCE_REJECT,
    ACTIONS.MAINTENANCE_ASSIGN_TECH,
    ACTIONS.MAINTENANCE_START,
    ACTIONS.MAINTENANCE_RESOLVE,
    ACTIONS.MAINTENANCE_VIEW_ALL,
    // Audits
    ACTIONS.AUDIT_CREATE,
    ACTIONS.AUDIT_ASSIGN_AUDITOR,
    ACTIONS.AUDIT_VERIFY_ITEM,
    ACTIONS.AUDIT_CLOSE,
    ACTIONS.AUDIT_VIEW_ALL,
    // Reports & Dashboard
    ACTIONS.REPORT_VIEW,
    ACTIONS.REPORT_EXPORT,
    ACTIONS.DASHBOARD_VIEW,
    // Notifications & Logs
    ACTIONS.NOTIFICATION_VIEW_OWN,
    ACTIONS.ACTIVITY_LOG_VIEW,
    // Employees — view only (no role change)
    ACTIONS.EMPLOYEE_VIEW_ALL,
  ]),

  [ROLES.DEPARTMENT_HEAD]: new Set([
    // Assets — view dept assets
    ACTIONS.ASSET_VIEW_ALL,
    // Allocations — view dept
    ACTIONS.ALLOCATION_VIEW_ALL,
    ACTIONS.ALLOCATION_VIEW_OWN,
    // Transfers — approve/reject for own department
    ACTIONS.TRANSFER_CREATE,
    ACTIONS.TRANSFER_APPROVE,
    ACTIONS.TRANSFER_REJECT,
    ACTIONS.TRANSFER_VIEW_ALL,
    // Bookings
    ACTIONS.BOOKING_CREATE,
    ACTIONS.BOOKING_CANCEL,
    ACTIONS.BOOKING_RESCHEDULE,
    ACTIONS.BOOKING_VIEW_ALL,
    // Maintenance — view, create
    ACTIONS.MAINTENANCE_CREATE,
    ACTIONS.MAINTENANCE_VIEW_ALL,
    // Reports & Dashboard
    ACTIONS.REPORT_VIEW,
    ACTIONS.DASHBOARD_VIEW,
    // Notifications
    ACTIONS.NOTIFICATION_VIEW_OWN,
  ]),

  [ROLES.EMPLOYEE]: new Set([
    // Allocations — own only
    ACTIONS.ALLOCATION_VIEW_OWN,
    // Transfers — request only
    ACTIONS.TRANSFER_CREATE,
    // Bookings — create/cancel own
    ACTIONS.BOOKING_CREATE,
    ACTIONS.BOOKING_CANCEL,
    ACTIONS.BOOKING_RESCHEDULE,
    // Maintenance — raise requests
    ACTIONS.MAINTENANCE_CREATE,
    // Dashboard (personal view)
    ACTIONS.DASHBOARD_VIEW,
    // Notifications
    ACTIONS.NOTIFICATION_VIEW_OWN,
  ]),
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a role is permitted to perform a specific action.
 * @param {string} role  — one of ROLES values
 * @param {string} action — one of ACTIONS values
 * @returns {boolean}
 */
export function can(role, action) {
  const allowed = PERMISSION_MAP[role];
  return allowed ? allowed.has(action) : false;
}

/**
 * Check whether the user's role meets a minimum hierarchy level.
 * Example: `hasMinRole('DepartmentHead', ROLES.ASSET_MANAGER)` → false
 * @param {string} userRole
 * @param {string} requiredRole
 * @returns {boolean}
 */
export function hasMinRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] ?? -1) >= (ROLE_HIERARCHY[requiredRole] ?? Infinity);
}

/**
 * Get all actions a role is allowed to perform.
 * @param {string} role
 * @returns {string[]}
 */
export function getAllowedActions(role) {
  const allowed = PERMISSION_MAP[role];
  return allowed ? [...allowed] : [];
}
