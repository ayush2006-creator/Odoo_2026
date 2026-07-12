/**
 * Dashboard API — /dashboard
 *
 * Permissions:
 *  - GET /dashboard/kpis    → all authenticated users (server scopes data by role)
 *  - GET /dashboard/overdue → Admin, AssetManager (overdue returns, separated from upcoming)
 */

import { get } from './client';

/**
 * Dashboard KPIs:
 *  - Assets Available, Allocated
 *  - Maintenance Today
 *  - Active Bookings
 *  - Pending Transfers
 *  - Upcoming Returns
 */
export function getKPIs() {
  return get('/dashboard/kpis');
}

/**
 * Overdue returns (Admin, AssetManager).
 * Separated from upcoming returns for clarity.
 */
export function getOverdueDashboard() {
  return get('/dashboard/overdue');
}
