/**
 * Reports API — /reports
 *
 * Permissions:
 *  - All report endpoints → Admin, AssetManager
 *  - DeptHead may see dept-scoped reports (server filters automatically)
 *  - Employee: no direct report access
 */

import { get, getRaw } from './client';

/**
 * Utilization report — most-used vs idle assets.
 */
export function getUtilizationReport() {
  return get('/reports/utilization');
}

/**
 * Maintenance frequency report.
 */
export function getMaintenanceFrequencyReport() {
  return get('/reports/maintenance-frequency');
}

/**
 * Assets due for maintenance or retirement.
 */
export function getDueForMaintenanceReport() {
  return get('/reports/due-for-maintenance-or-retirement');
}

/**
 * Department allocation summary.
 */
export function getDeptAllocationSummary() {
  return get('/reports/department-allocation-summary');
}

/**
 * Booking heatmap data.
 */
export function getBookingHeatmap() {
  return get('/reports/booking-heatmap');
}

/**
 * Export a report as CSV or PDF.
 * Returns a raw Response — caller should trigger a file download.
 *
 * @param {string} type   — report name (e.g. 'utilization', 'maintenance-frequency')
 * @param {'csv'|'pdf'} format
 * @returns {Promise<Response>}
 */
export async function exportReport(type, format = 'csv') {
  const res = await getRaw('/reports/export', { type, format });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Export failed with status ${res.status}`);
  }
  return res;
}

/**
 * Helper: trigger a browser download from an export Response.
 * @param {Response} response — from exportReport()
 * @param {string} filename — e.g. 'utilization_report.csv'
 */
export async function downloadReport(response, filename) {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
