/**
 * Notifications API — /notifications
 *
 * Permissions:
 *  - GET   /notifications           → all authenticated users (own notifications only)
 *  - PATCH /notifications/:id/read  → notification owner
 *
 * Notification types (from spec):
 *  AssetAssigned, MaintenanceApproved, MaintenanceRejected, BookingConfirmed,
 *  BookingCancelled, BookingReminder, TransferApproved, OverdueReturn, AuditDiscrepancy
 */

import { get, patch } from './client';

/**
 * List notifications for the current user.
 * @param {{ type?: string, read?: boolean }} [filters]
 */
export function getNotifications(filters = {}) {
  return get('/notifications', filters);
}

/**
 * Mark a notification as read.
 * @param {string} id
 */
export function markNotificationRead(id) {
  return patch(`/notifications/${id}/read`);
}
