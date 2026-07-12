/**
 * StatusBadge — renders a badge with the correct color from statusColors.js.
 */

import { Badge } from '@/components/ui/badge';
import { getStatusColor } from '@/lib/statusColors';

export function StatusBadge({ status, className = '' }) {
  const colors = getStatusColor(status);

  return (
    <Badge
      variant="outline"
      className={`${colors.bg} ${colors.text} ${colors.border} border font-medium text-xs ${className}`}
    >
      {status}
    </Badge>
  );
}
