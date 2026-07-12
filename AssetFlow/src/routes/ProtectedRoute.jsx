/**
 * ProtectedRoute — redirects to /login if no token.
 * Optionally checks minimum role.
 */

import { Navigate } from 'react-router';
import { getToken } from '@/api/client';
import { usePermissions } from '@/hooks/usePermissions';
import { hasMinRole } from '@/lib/permissions';

export function ProtectedRoute({ children, minRole }) {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (minRole) {
    const { role } = usePermissions();
    if (!hasMinRole(role, minRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
