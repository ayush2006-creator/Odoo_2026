/**
 * DashboardPage — Screen 2
 *
 * Main dashboard view with KPI cards, overdue alert banner,
 * permission-gated quick actions, and a recent-activity feed.
 * Every section uses BlurFade for staggered entrance animations.
 */

import {
  PackageCheck,
  PackageMinus,
  Wrench,
  CalendarDays,
  ArrowLeftRight,
  CalendarClock,
  AlertTriangle,
  Plus,
  CalendarPlus,
  Laptop,
  DoorOpen,
  Projector,
  ArrowRightLeft,
  ClipboardCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { usePermissions } from '@/hooks/usePermissions';
import { ACTIONS } from '@/lib/permissions';

import { KPICard } from '@/components/shared/KPICard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BlurFade } from '@/components/ui/blur-fade';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getKPIs } from '@/api/dashboard';
import { getNotifications } from '@/api/notifications';

// Map icon color helpers
const ICON_MAP = {
  Available: { icon: PackageCheck, color: 'text-emerald-500' },
  Allocated: { icon: PackageMinus, color: 'text-blue-500' },
  'Under Maintenance': { icon: Wrench, color: 'text-orange-500' },
  'Active Bookings': { icon: CalendarDays, color: 'text-primary' },
  'Pending Transfers': { icon: ArrowLeftRight, color: 'text-amber-500' },
  'Upcoming Returns': { icon: CalendarClock, color: 'text-primary' },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState({
    assetsAvailable: 96,
    assetsAllocated: 34,
    assetsUnderMaintenance: 4,
    activeBookings: 6,
    pendingTransfers: 3,
    upcomingReturns: 12
  });

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const stats = await getKPIs();
        if (stats) {
          setKpis(stats);
        }
        const notifs = await getNotifications();
        if (notifs) {
          setActivities(notifs);
        }
      } catch (err) {
        console.error('Failed to load dashboard KPIs/activities:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const kpiList = [
    {
      title: 'Available',
      value: kpis.assetsAvailable !== undefined ? kpis.assetsAvailable : 0,
      icon: PackageCheck,
      color: 'text-emerald-500',
    },
    {
      title: 'Allocated',
      value: kpis.assetsAllocated !== undefined ? kpis.assetsAllocated : 0,
      icon: PackageMinus,
      color: 'text-blue-500',
    },
    {
      title: 'Under Maintenance',
      value: kpis.assetsUnderMaintenance !== undefined ? kpis.assetsUnderMaintenance : 0,
      icon: Wrench,
      color: 'text-orange-500',
    },
    {
      title: 'Active Bookings',
      value: kpis.activeBookings !== undefined ? kpis.activeBookings : 0,
      icon: CalendarDays,
      color: 'text-primary',
    },
    {
      title: 'Pending Transfers',
      value: kpis.pendingTransfers !== undefined ? kpis.pendingTransfers : 0,
      icon: ArrowLeftRight,
      color: 'text-amber-500',
    },
    {
      title: 'Upcoming Returns',
      value: kpis.upcomingReturns !== undefined ? kpis.upcomingReturns : 0,
      icon: CalendarClock,
      color: 'text-primary',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Section 1 · KPI Cards ─────────────────────────────────────── */}
      <BlurFade delay={0.05} inView>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiList.map((kpi) => (
            <KPICard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              color={kpi.color}
            />
          ))}
        </div>
      </BlurFade>

      {/* ── Section 2 · Overdue Alert ─────────────────────────────────── */}
      <BlurFade delay={0.15} inView>
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/10">
          <AlertTriangle className="size-4" />
          <AlertTitle className="font-semibold">Overdue Assets</AlertTitle>
          <AlertDescription>
            3 assets overdue for return — flagged for follow-up
          </AlertDescription>
        </Alert>
      </BlurFade>

      {/* ── Section 3 · Quick Actions ─────────────────────────────────── */}
      <BlurFade delay={0.25} inView>
        <div className="flex flex-wrap items-center gap-3">
          {can(ACTIONS.ASSET_CREATE) && (
            <ShimmerButton
              className="text-sm"
              onClick={() => navigate('/assets')}
            >
              <Plus className="size-4 mr-2" />
              Register Asset
            </ShimmerButton>
          )}

          {can(ACTIONS.BOOKING_CREATE) && (
            <ShimmerButton
              className="text-sm"
              onClick={() => navigate('/bookings')}
            >
              <CalendarPlus className="size-4 mr-2" />
              Book Resource
            </ShimmerButton>
          )}

          <ShimmerButton
            className="text-sm"
            onClick={() => navigate('/maintenance')}
          >
            <Wrench className="size-4 mr-2" />
            Raise Request
          </ShimmerButton>
        </div>
      </BlurFade>

      {/* ── Section 4 · Recent Activity ───────────────────────────────── */}
      <BlurFade delay={0.35} inView>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {activities.map((item, idx) => {
              const Icon = item.category === 'bookings' ? CalendarDays : item.category === 'approvals' ? ArrowRightLeft : Laptop;
              const msgLabel = item.message || item.msg || item.content || item.text || 'Activity Update';
              const timeLabel = item.time || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '') || 'just now';
              return (
                <div
                  key={item.id || idx}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm">{msgLabel}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeLabel}
                  </span>
                </div>
              );
            })}
            {activities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
            )}
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  );
}
