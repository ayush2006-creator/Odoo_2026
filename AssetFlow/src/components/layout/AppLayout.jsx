/**
 * AppLayout — shell combining Sidebar + Topbar + page content.
 */

import { Outlet, useLocation } from 'react-router';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Topbar } from '@/components/layout/Topbar';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/org-setup': 'Organization Setup',
  '/assets': 'Assets',
  '/allocations': 'Allocation & Transfer',
  '/bookings': 'Resource Booking',
  '/maintenance': 'Maintenance',
  '/audits': 'Audit',
  '/reports': 'Reports & Analytics',
  '/notifications': 'Notifications',
};

function getPageTitle(pathname) {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefix match for nested routes
  const key = Object.keys(PAGE_TITLES).find(
    (k) => k !== '/' && pathname.startsWith(k),
  );
  return key ? PAGE_TITLES[key] : 'AssetFlow';
}

export function AppLayout() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar title={title} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
