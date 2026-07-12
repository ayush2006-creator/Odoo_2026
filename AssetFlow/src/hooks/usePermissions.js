/**
 * usePermissions — React hook for role-based permission checks.
 *
 * Usage:
 *   const { can, hasMinRole, role } = usePermissions();
 *
 *   if (can(ACTIONS.ASSET_CREATE)) { ... }
 *   if (hasMinRole(ROLES.ASSET_MANAGER)) { ... }
 *
 * Reads the current user's role from AuthContext.
 * The hook wraps the pure helpers from lib/permissions.js so that
 * components never import the permission map directly.
 */

import { useCallback, useMemo } from 'react';
import {
  can as canCheck,
  hasMinRole as hasMinRoleCheck,
  getAllowedActions,
} from '@/lib/permissions';

/**
 * Temporary: until AuthContext is wired up, we read the user from
 * localStorage. Replace the `getRole()` call below once the auth
 * provider is in place.
 */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('assetflow_user') || '{}');
  } catch {
    return {};
  }
}

export function usePermissions() {
  const user = getCurrentUser();
  const role = user.role || 'Employee';

  const can = useCallback(
    (action) => canCheck(role, action),
    [role],
  );

  const hasMinRole = useCallback(
    (requiredRole) => hasMinRoleCheck(role, requiredRole),
    [role],
  );

  const allowedActions = useMemo(
    () => getAllowedActions(role),
    [role],
  );

  return { role, can, hasMinRole, allowedActions, user };
}
