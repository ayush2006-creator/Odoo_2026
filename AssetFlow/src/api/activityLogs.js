/**
 * Activity Logs API — /activity-logs
 *
 * Permissions:
 *  - GET /activity-logs → Admin, AssetManager
 *
 * Activity logs are auto-generated server-side by most write endpoints.
 * The frontend only reads them — never creates directly.
 */

import { get } from './client';

/**
 * List activity logs with optional filters.
 * @param {{ user?: string, entityType?: string, entityId?: string,
 *           startDate?: string, endDate?: string }} [filters]
 */
export function getActivityLogs(filters = {}) {
  return get('/activity-logs', filters);
}
