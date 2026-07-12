/**
 * KPICard — dashboard metric card with animated counter.
 */

import { MagicCard } from '@/components/ui/magic-card';
import NumberTicker from '@/components/ui/number-ticker';
import { useTheme } from '@/components/layout/ThemeProvider';

export function KPICard({ title, value, icon: Icon, color = 'text-primary' }) {
  const { theme } = useTheme();

  return (
    <MagicCard
      className="p-5 flex flex-col gap-3 cursor-default"
      gradientColor={theme === 'dark' ? '#1e3a5f' : '#dbeafe'}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {Icon && <Icon className={`size-4 ${color}`} />}
      </div>
      <div className="text-3xl font-bold tracking-tight">
        <NumberTicker value={value} />
      </div>
    </MagicCard>
  );
}
