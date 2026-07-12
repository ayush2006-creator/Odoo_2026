/**
 * NotificationsPage — Screen 10: Activity Logs & Notifications.
 */

import { useState, useEffect } from 'react';
import {
  Package, Wrench, CalendarDays, ArrowLeftRight,
  AlertTriangle, ClipboardCheck, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';
import { getNotifications } from '@/api/notifications';

const FILTER_TABS = ['All', 'Alerts', 'Approvals', 'Bookings'];

// Helper to resolve notification icons based on category/message
function getNotificationIcon(category, type) {
  switch (category) {
    case 'bookings': return CalendarDays;
    case 'approvals': return ArrowLeftRight;
    default:
      if (type === 'maintenance') return Wrench;
      return Package;
  }
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const data = await getNotifications();
        if (data) setNotifications(data);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, []);

  const filtered = filter === 'All'
    ? notifications
    : notifications.filter((n) => n.category === filter.toLowerCase());

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Stay updated with asset activities and alerts.">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab}
              variant={filter === tab ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-3"
              onClick={() => setFilter(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>
      </PageHeader>

      <BlurFade delay={0.1} inView>
        <div className="space-y-2">
          {filtered.map((item, index) => {
            const Icon = getNotificationIcon(item.category, item.type);
            return (
              <BlurFade key={item.id} delay={0.05 * index} inView>
                <div
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors hover:bg-accent/50 cursor-pointer ${
                    item.unread ? 'border-l-2 border-l-primary bg-primary/[0.03]' : 'border-border/60'
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                    item.unread ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    <Icon className={`size-4 ${item.unread ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.unread ? 'font-medium' : 'text-muted-foreground'}`}>
                      {item.message || item.msg || item.content || item.text || 'Notification Update'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {item.time || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '') || 'just now'}
                  </span>
                  {item.unread && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
              </BlurFade>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="size-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No notifications in this category.</p>
            </div>
          )}
        </div>
      </BlurFade>
    </div>
  );
}
