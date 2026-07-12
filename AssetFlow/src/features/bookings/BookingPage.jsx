/**
 * BookingPage — Screen 6: Resource Booking with timeline view.
 */

import { useState, useEffect } from 'react';
import { Clock, CalendarDays, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';
import { getAssetBookings, createBooking } from '@/api/bookings';

const HOURS = Array.from({ length: 9 }, (_, i) => i + 9); // 9:00–17:00

// Timezone-independent ISO string to decimal hour converter
function parseTimeToDecimal(isoString) {
  if (!isoString) return 9;
  if (typeof isoString === 'number') return isoString;
  if (!isoString.includes(':') && !isoString.includes('T')) {
    return parseFloat(isoString) || 9;
  }
  if (isoString.includes(':') && !isoString.includes('T')) {
    const [h, m] = isoString.split(':');
    return parseFloat(h) + (parseFloat(m) / 60);
  }
  try {
    const timePart = isoString.split('T')[1];
    if (timePart) {
      const [h, m] = timePart.split(':');
      return parseFloat(h) + (parseFloat(m) / 60);
    }
  } catch (e) {
    console.error('Time parsing failed:', isoString, e);
  }
  return 9;
}

// Convert decimal hours (e.g. 10.5) to human-readable clock strings (e.g. "10:30")
function formatDecimalTime(decimal) {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${h}:${m < 10 ? '0' + m : m}`;
}

export default function BookingPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({ startTime: '', endTime: '', purpose: '' });
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    try {
      // Conference Room B3 has asset ID 2
      const data = await getAssetBookings(2);
      if (data) {
        // Convert backend ISO datetimes to local grid decimal hours
        const mapped = data.map((b) => {
          const startHour = parseTimeToDecimal(b.startTime);
          const endHour = parseTimeToDecimal(b.endTime);
          
          // Map user details to meeting label if available
          const userName = b.user?.name || b.employee?.name || b.userName || '';
          const titleLabel = b.purpose 
            ? (userName ? `${b.purpose} — ${userName}` : b.purpose)
            : (userName ? `Booked by ${userName}` : 'Booked Slot');

          return {
            ...b,
            start: startHour,
            end: endHour,
            title: titleLabel,
            status: b.status || 'booked'
          };
        });
        setBookings(mapped);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  function getBookingForHour(hour) {
    return bookings.find((b) => hour >= b.start && hour < b.end);
  }

  const handleBook = async (e) => {
    e.preventDefault();
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const startTimeIso = `${todayStr}T${form.startTime}:00`;
      const endTimeIso = `${todayStr}T${form.endTime}:00`;

      await createBooking({
        resourceId: 2, // Conference Room B3
        startTime: startTimeIso,
        endTime: endTimeIso,
        purpose: form.purpose
      });
      
      // Reload list from backend directly to fetch correct database details
      await loadBookings();
      setDialogOpen(false);
      setForm({ startTime: '', endTime: '', purpose: '' });
    } catch (err) {
      console.error('Failed to create booking:', err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Resource Booking" description="Book shared assets and meeting rooms." />

      {/* Resource Info */}
      <BlurFade delay={0.05} inView>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">Conference Room B3</p>
              <p className="text-sm text-muted-foreground">Tue, 7 Jul</p>
            </div>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Timeline View */}
      <BlurFade delay={0.1} inView>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {HOURS.map((hour) => {
              const booking = getBookingForHour(hour);
              const isConflict = booking?.status === 'conflict';
              const isBooked = booking && !isConflict;
              const isStart = booking && hour === Math.floor(booking.start + 0.05);

              return (
                <div key={hour} className="flex items-stretch gap-3 group">
                  <div className="w-14 text-xs text-muted-foreground pt-2 text-right font-mono shrink-0">
                    {hour}:00
                  </div>
                  <div
                    className={`flex-1 min-h-[48px] rounded-lg border px-3 py-2 transition-colors ${
                      isConflict
                        ? 'bg-destructive/10 border-destructive/30'
                        : isBooked
                          ? 'bg-primary/10 border-primary/30'
                          : 'border-border/50 hover:bg-accent/50 cursor-pointer'
                    }`}
                    onClick={() => !booking && setDialogOpen(true)}
                  >
                    {isStart && (
                      <div className="flex items-center gap-2">
                        {isConflict && <AlertTriangle className="size-3.5 text-destructive" />}
                        <span className={`text-sm font-medium ${isConflict ? 'text-destructive' : 'text-primary'}`}>
                          {booking.title}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDecimalTime(booking.start)} — {formatDecimalTime(booking.end)}
                        </span>
                      </div>
                    )}
                    {!booking && (
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to book this slot
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </BlurFade>

      <BlurFade delay={0.15} inView>
        <div className="flex justify-center">
          <ShimmerButton className="shadow-lg" onClick={() => setDialogOpen(true)}>
            <CalendarDays className="size-4 mr-2" />
            Book a Slot
          </ShimmerButton>
        </div>
      </BlurFade>

      {/* Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book a Slot</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBook} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Start Time</Label>
                <Input id="start" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End Time</Label>
                <Input id="end" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea id="purpose" placeholder="Meeting purpose..." value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Confirm Booking</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
