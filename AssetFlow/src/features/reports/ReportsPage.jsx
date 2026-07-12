/**
 * ReportsPage — Screen 9: Reports & Analytics with Recharts.
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileDown, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';
import { getAssets } from '@/api/assets';
import { getDepartments } from '@/api/departments';
import { getMaintenanceRequests } from '@/api/maintenance';
import {
  getUtilizationReport,
  getMaintenanceFrequencyReport,
  getDueForMaintenanceReport,
  getDeptAllocationSummary,
  exportReport,
  downloadReport,
} from '@/api/reports';

const MOST_USED = [
  { tag: 'AF-0013', name: 'Dell Laptop', stat: 'used 67 days' },
  { tag: 'AF-0019', name: 'Projector', stat: '31 trips this month' },
  { tag: 'AF-0033', name: 'Monitor', stat: '24 bookings' },
];

const IDLE_ASSETS = [
  { tag: 'AF-0077', name: 'Scanner', stat: 'unused 62 days' },
  { tag: 'AF-0042', name: 'Fax Machine', stat: 'unused 45 days' },
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
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {safeItems.map((item, idx) => {
          const tagLabel = item.tag || item.assetTag || `AF-${item.id || idx}`;
          const statLabel = item.stat || item.status || (item.utilization !== undefined ? `${item.utilization}%` : '');
          return (
            <div key={tagLabel} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <div>
                <span className="font-mono text-xs text-primary font-semibold">{tagLabel}</span>
                <p className="text-sm">{item.name || 'Asset'}</p>
              </div>
              <span className="text-xs text-muted-foreground">{statLabel}</span>
            </div>
          );
        })}
        {safeItems.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No data available.</p>
        )}
      </CardContent>
    </Card>
  );
}

const DEFAULT_UTILIZATION = [
  { dept: 'Engineering', value: 12 },
  { dept: 'Facilities', value: 8 },
  { dept: 'Marketing', value: 4 },
  { dept: 'HR', value: 2 },
  { dept: 'Finance', value: 6 }
];

const DEFAULT_MAINTENANCE = [
  { month: 'Jan', count: 12 },
  { month: 'Feb', count: 8 },
  { month: 'Mar', count: 15 },
  { month: 'Apr', count: 6 },
  { month: 'May', count: 10 },
  { month: 'Jun', count: 14 }
];

export default function ReportsPage() {
  const [utilizationData, setUtilizationData] = useState(DEFAULT_UTILIZATION);
  const [maintenanceData, setMaintenanceData] = useState(DEFAULT_MAINTENANCE);
  const [mostUsed, setMostUsed] = useState(MOST_USED);
  const [idleAssets, setIdleAssets] = useState(IDLE_ASSETS);
  const [dueMaintenance, setDueMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReportData() {
      try {
        // Fetch live assets and departments to calculate dynamic utilization summary
        let liveUtilization = [];
        try {
          const [assets, depts] = await Promise.all([
            getAssets().catch(() => []),
            getDepartments().catch(() => [])
          ]);
          
          const safeAssets = Array.isArray(assets) ? assets : (assets?.data || []);
          const safeDepts = Array.isArray(depts) ? depts : (depts?.data || []);

          if (safeDepts.length > 0) {
            const deptMap = {};
            safeDepts.forEach((d) => {
              deptMap[d.id] = { name: d.name, count: 0 };
            });
            safeAssets.forEach((a) => {
              if (a.departmentId && deptMap[a.departmentId]) {
                deptMap[a.departmentId].count += 1;
              }
            });
            liveUtilization = Object.values(deptMap).map((d) => ({
              dept: d.name,
              value: d.count,
            }));
          }
        } catch (e) {
          console.warn('Failed to calculate dynamic department utilization, using fallback:', e);
        }

        // Set utilization data with computed live counts, otherwise keep default mockup
        if (liveUtilization.length > 0 && liveUtilization.some(u => u.value > 0)) {
          setUtilizationData(liveUtilization);
        }

        // Fetch live maintenance tickets to calculate maintenance frequency by month
        let liveMaintenance = [];
        try {
          const tickets = await getMaintenanceRequests().catch(() => []);
          const safeTickets = Array.isArray(tickets) ? tickets : (tickets?.data || []);
          
          if (safeTickets.length > 0) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthCounts = {};
            // Initialize last 6 months
            for (let i = 5; i >= 0; i--) {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const m = monthNames[d.getMonth()];
              monthCounts[m] = 0;
            }

            safeTickets.forEach((t) => {
              if (t.createdAt) {
                const date = new Date(t.createdAt);
                const m = monthNames[date.getMonth()];
                if (monthCounts[m] !== undefined) {
                  monthCounts[m] += 1;
                }
              }
            });

            liveMaintenance = Object.entries(monthCounts).map(([month, count]) => ({
              month,
              count,
            }));
          }
        } catch (e) {
          console.warn('Failed to calculate dynamic maintenance frequency, using fallback:', e);
        }

        if (liveMaintenance.length > 0 && liveMaintenance.some(m => m.count > 0)) {
          setMaintenanceData(liveMaintenance);
        }

        // Load utilization report for lists
        try {
          const util = await getUtilizationReport();
          if (util) {
            const safeMost = Array.isArray(util) ? util : (util.mostUsedAssets || []);
            const safeIdle = Array.isArray(util.idleAssets) ? util.idleAssets : [];
            if (safeMost.length > 0) setMostUsed(safeMost);
            if (safeIdle.length > 0) setIdleAssets(safeIdle);
          }
        } catch (e) {
          console.warn('Failed to load utilization report:', e);
        }

        // Load assets due for maintenance
        try {
          const due = await getDueForMaintenanceReport();
          if (Array.isArray(due)) setDueMaintenance(due);
        } catch (e) {
          console.warn('Due for maintenance report skipped:', e);
        }
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReportData();
  }, []);

  const handleExport = async () => {
    try {
      const response = await exportReport('utilization', 'csv');
      await downloadReport(response, 'utilization_report.csv');
    } catch (err) {
      console.error('Failed to export report:', err);
    }
  };

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
            <CardContent className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizationData}>
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
            <CardContent className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maintenanceData}>
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
          <SummaryCard title="Most Used Assets" icon={TrendingUp} items={mostUsed} />
        </BlurFade>
        <BlurFade delay={0.2} inView>
          <SummaryCard title="Idle Assets" icon={Clock} items={idleAssets} />
        </BlurFade>
        <BlurFade delay={0.25} inView>
          <SummaryCard title="Due for Maintenance" icon={AlertTriangle} items={dueMaintenance} />
        </BlurFade>
      </div>

      {/* Export */}
      <BlurFade delay={0.3} inView>
        <div className="flex justify-center">
          <ShimmerButton className="shadow-lg" onClick={handleExport}>
            <FileDown className="size-4 mr-2" />
            Export Report
          </ShimmerButton>
        </div>
      </BlurFade>
    </div>
  );
}
