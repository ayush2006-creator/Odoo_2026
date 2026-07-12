/**
 * AppSidebar — Main navigation sidebar using shadcn Sidebar component.
 * Shows/hides items based on user role via usePermissions().
 */

import { useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Building2,
  Package,
  ArrowLeftRight,
  CalendarDays,
  Wrench,
  ClipboardCheck,
  BarChart3,
  Bell,
  LogOut,
  Box,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { usePermissions } from '@/hooks/usePermissions';
import { ACTIONS } from '@/lib/permissions';
import { logout } from '@/api/auth';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', action: ACTIONS.DASHBOARD_VIEW },
  { label: 'Organization Setup', icon: Building2, path: '/org-setup', action: ACTIONS.ORG_SETUP_VIEW },
  { label: 'Assets', icon: Package, path: '/assets', action: ACTIONS.ASSET_VIEW_ALL },
  { label: 'Allocation & Transfer', icon: ArrowLeftRight, path: '/allocations', action: ACTIONS.ALLOCATION_VIEW_OWN },
  { label: 'Resource Booking', icon: CalendarDays, path: '/bookings', action: ACTIONS.BOOKING_CREATE },
  { label: 'Maintenance', icon: Wrench, path: '/maintenance', action: ACTIONS.MAINTENANCE_CREATE },
  { label: 'Audit', icon: ClipboardCheck, path: '/audits', action: ACTIONS.AUDIT_VIEW_ALL },
  { label: 'Reports', icon: BarChart3, path: '/reports', action: ACTIONS.REPORT_VIEW },
  { label: 'Notifications', icon: Bell, path: '/notifications', action: ACTIONS.NOTIFICATION_VIEW_OWN },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Clear local state even if API fails
    }
    navigate('/login');
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            AF
          </div>
          <span className="text-lg font-bold tracking-tight">AssetFlow</span>
        </button>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.filter((item) => can(item.action)).map((item) => {
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => navigate(item.path)}
                      tooltip={item.label}
                      className="h-10"
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Logout"
              className="h-10 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
