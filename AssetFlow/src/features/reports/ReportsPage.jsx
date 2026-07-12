/**
 * ReportsPage — Screen 9: Reports & Analytics with Recharts.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileDown, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';

const UTILIZATION_DATA = [
  { dept: 'Engineering', value: 85 },
  { dept: 'Facilities', value: 62 },
  { dept: 'Marketing', value: 45 },
  { dept: 'HR', value: 30 },
  { dept: 'Finance', value: 55 },
];

const MAINTENANCE_DATA = [
  { month: 'Jan', count: 12 },
  { month: 'Feb', count: 8 },
  { month: 'Mar', count: 15 },
  { month: 'Apr', count: 6 },
  { month: 'May', count: 10 },
  { month: 'Jun', count: 14 },
];

const MOST_USED = [
  { tag: 'AF-0013', name: 'Dell Laptop', stat: 'used 67 days' },
  { tag: 'AF-0019', name: 'Projector', stat: '31 trips this month' },
  { tag: 'AF-0033', name: 'Monitor', stat: '24 bookings' },
];

const IDLE_ASSETS = [
  { tag: 'AF-0077', name: 'Scanner', stat: 'unused 62 days' },
  { tag: 'AF-0042', name: 'Fax Machine', stat: 'unused 45 days' },
];

const DUE_MAINTENANCE = [
  { tag: 'AF-0098', name: 'UPS', stat: 'service due in 5 days' },
  { tag: 'AF-0021', name: 'Laptop', stat: '6 years old, nearing retirement' },
];

function ChartTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-primary font-semibold">{payload[0].value}</p>
    </div>
  );
}

function SummaryCard({ title, icon: Icon, items }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item.tag} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
            <div>
              <span className="font-mono text-xs text-primary font-semibold">{item.tag}</span>
              <p className="text-sm">{item.name}</p>
            </div>
            <span className="text-xs text-muted-foreground">{item.stat}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Insights into asset utilization, maintenance, and performance." />

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BlurFade delay={0.05} inView>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Utilization by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={UTILIZATION_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="dept" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.1} inView>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Maintenance Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={MAINTENANCE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </BlurFade>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BlurFade delay={0.15} inView>
          <SummaryCard title="Most Used Assets" icon={TrendingUp} items={MOST_USED} />
        </BlurFade>
        <BlurFade delay={0.2} inView>
          <SummaryCard title="Idle Assets" icon={Clock} items={IDLE_ASSETS} />
        </BlurFade>
        <BlurFade delay={0.25} inView>
          <SummaryCard title="Due for Maintenance" icon={AlertTriangle} items={DUE_MAINTENANCE} />
        </BlurFade>
      </div>

      {/* Export */}
      <BlurFade delay={0.3} inView>
        <div className="flex justify-center">
          <ShimmerButton className="shadow-lg">
            <FileDown className="size-4 mr-2" />
            Export Report
          </ShimmerButton>
        </div>
      </BlurFade>
    </div>
  );
}
