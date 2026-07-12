/**
 * Consistent status → color mapping across the entire app.
 * Defined once here, used by StatusBadge and any other UI that shows status.
 *
 * Colors are Tailwind class fragments (bg-, text-, border-).
 * From claude.md design conventions.
 */

export const STATUS_COLORS = Object.freeze({
  // ── Asset statuses ─────────────────────────────────────────────────────
  Available:          { bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  Allocated:          { bg: 'bg-blue-500/15',    text: 'text-blue-600',    border: 'border-blue-500/30' },
  Reserved:           { bg: 'bg-amber-500/15',   text: 'text-amber-600',   border: 'border-amber-500/30' },
  'Under Maintenance':{ bg: 'bg-orange-500/15',  text: 'text-orange-600',  border: 'border-orange-500/30' },
  Lost:               { bg: 'bg-red-500/15',     text: 'text-red-600',     border: 'border-red-500/30' },
  Retired:            { bg: 'bg-zinc-500/15',     text: 'text-zinc-500',    border: 'border-zinc-500/30' },
  Disposed:           { bg: 'bg-zinc-500/15',     text: 'text-zinc-500',    border: 'border-zinc-500/30' },

  // ── Booking statuses ───────────────────────────────────────────────────
  Upcoming:           { bg: 'bg-blue-500/15',    text: 'text-blue-600',    border: 'border-blue-500/30' },
  Ongoing:            { bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  Completed:          { bg: 'bg-zinc-500/15',     text: 'text-zinc-500',    border: 'border-zinc-500/30' },
  Cancelled:          { bg: 'bg-red-500/15',     text: 'text-red-600',     border: 'border-red-500/30' },

  // ── Maintenance statuses ───────────────────────────────────────────────
  Pending:            { bg: 'bg-amber-500/15',   text: 'text-amber-600',   border: 'border-amber-500/30' },
  Approved:           { bg: 'bg-blue-500/15',    text: 'text-blue-600',    border: 'border-blue-500/30' },
  Rejected:           { bg: 'bg-red-500/15',     text: 'text-red-600',     border: 'border-red-500/30' },
  'In Progress':      { bg: 'bg-orange-500/15',  text: 'text-orange-600',  border: 'border-orange-500/30' },
  Resolved:           { bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },

  // ── Transfer statuses ──────────────────────────────────────────────────
  Requested:          { bg: 'bg-amber-500/15',   text: 'text-amber-600',   border: 'border-amber-500/30' },

  // ── Allocation statuses ────────────────────────────────────────────────
  Active:             { bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  Returned:           { bg: 'bg-zinc-500/15',     text: 'text-zinc-500',    border: 'border-zinc-500/30' },
  Overdue:            { bg: 'bg-red-500/15',     text: 'text-red-600',     border: 'border-red-500/30' },

  // ── Audit item results ─────────────────────────────────────────────────
  Verified:           { bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  Missing:            { bg: 'bg-red-500/15',     text: 'text-red-600',     border: 'border-red-500/30' },
  Damaged:            { bg: 'bg-orange-500/15',  text: 'text-orange-600',  border: 'border-orange-500/30' },

  // ── Audit cycle statuses ───────────────────────────────────────────────
  Open:               { bg: 'bg-blue-500/15',    text: 'text-blue-600',    border: 'border-blue-500/30' },
  Closed:             { bg: 'bg-zinc-500/15',     text: 'text-zinc-500',    border: 'border-zinc-500/30' },
});

/** Fallback when a status doesn't match any known key. */
export const DEFAULT_STATUS_COLOR = Object.freeze({
  bg: 'bg-zinc-500/15',
  text: 'text-zinc-500',
  border: 'border-zinc-500/30',
});

/**
 * Get color classes for a status string.
 * @param {string} status
 * @returns {{ bg: string, text: string, border: string }}
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
}
