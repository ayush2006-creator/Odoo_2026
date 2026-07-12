/**
 * PageHeader — page title + optional description + action button.
 */

import { BlurFade } from '@/components/ui/blur-fade';

export function PageHeader({ title, description, children }) {
  return (
    <BlurFade delay={0.05} inView>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2 mt-3 sm:mt-0">{children}</div>}
      </div>
    </BlurFade>
  );
}
