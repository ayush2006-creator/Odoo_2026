/**
 * Barrel export for all API modules.
 *
 * Usage:
 *   import { login, signup } from '@/api';
 *   import { getAssets, createAsset } from '@/api';
 *   import { can, ACTIONS } from '@/lib/permissions';
 */

export * from './auth';
export * from './employees';
export * from './departments';
export * from './assetCategories';
export * from './assets';
export * from './allocations';
export * from './transfers';
export * from './bookings';
export * from './maintenance';
export * from './auditCycles';
export * from './reports';
export * from './dashboard';
export * from './notifications';
export * from './activityLogs';

// Re-export client utilities that components may need
export { ApiError, getToken, setToken, clearToken } from './client';
