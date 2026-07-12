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

// ── Static data ──────────────────────────────────────────────────────────────

const KPI_DATA = [
  { title: 'Available', value: 96, icon: PackageCheck, color: 'text-emerald-500' },
  { title: 'Allocated', value: 34, icon: PackageMinus, color: 'text-blue-500' },
  { title: 'Under Maintenance', value: 4, icon: Wrench, color: 'text-orange-500' },
  { title: 'Active Bookings', value: 6, icon: CalendarDays, color: 'text-primary' },
  { title: 'Pending Transfers', value: 3, icon: ArrowLeftRight, color: 'text-amber-500' },
  { title: 'Upcoming Returns', value: 12, icon: CalendarClock, color: 'text-primary' },
];

const ACTIVITY_ITEMS = [
  {
    icon: Laptop,
    text: 'Laptop AF-0019 — allocated to Priya Shah',
    time: '27 Sept',
  },
  {
    icon: DoorOpen,
    text: 'Room B3 — booking confirmed',
    time: '3:00 to 5:00 PM',
  },
  {
    icon: Projector,
    text: 'Projector AF-0063 — maintenance resolved',
    time: 'Today',
  },
  {
    icon: ArrowRightLeft,
    text: 'Transfer approved — AF-0033 to Facilities dept',
    time: 'Today',
  },
  {
    icon: ClipboardCheck,
    text: 'Audit cycle Q3 completed — 2 discrepancies found',
    time: 'Yesterday',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      {/* ── Section 1 · KPI Cards ─────────────────────────────────────── */}
      <BlurFade delay={0.05} inView>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {KPI_DATA.map((kpi) => (
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
              onClick={() => navigate('/assets/new')}
            >
              <Plus className="size-4 mr-2" />
              Register Asset
            </ShimmerButton>
          )}

          {can(ACTIONS.BOOKING_CREATE) && (
            <ShimmerButton
              className="text-sm"
              onClick={() => navigate('/bookings/new')}
            >
              <CalendarPlus className="size-4 mr-2" />
              Book Resource
            </ShimmerButton>
          )}

          <ShimmerButton
            className="text-sm"
            onClick={() => navigate('/maintenance/new')}
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
            {ACTIVITY_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <item.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm">{item.text}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.time}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  );
}
