/**
 * App — root component with routing.
 */

import { BrowserRouter, Routes, Route } from 'react-router';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { ROLES } from '@/lib/roles';
import { TooltipProvider } from '@/components/ui/tooltip';

// Lazy-load feature pages
import { lazy, Suspense } from 'react';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const SignupPage = lazy(() => import('@/features/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const OrgSetupPage = lazy(() => import('@/features/org-setup/OrgSetupPage'));
const AssetsPage = lazy(() => import('@/features/assets/AssetsPage'));
const AllocationPage = lazy(() => import('@/features/allocations/AllocationPage'));
const BookingPage = lazy(() => import('@/features/bookings/BookingPage'));
const MaintenancePage = lazy(() => import('@/features/maintenance/MaintenancePage'));
const AuditPage = lazy(() => import('@/features/audits/AuditPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Auth routes — no sidebar */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* App routes — with sidebar layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route
                  path="org-setup"
                  element={
                    <ProtectedRoute minRole={ROLES.ADMIN}>
                      <OrgSetupPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="assets" element={<AssetsPage />} />
                <Route path="allocations" element={<AllocationPage />} />
                <Route path="bookings" element={<BookingPage />} />
                <Route path="maintenance" element={<MaintenancePage />} />
                <Route path="audits" element={<AuditPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
