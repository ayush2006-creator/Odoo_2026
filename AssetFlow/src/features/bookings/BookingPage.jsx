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
import { getBookings, createBooking } from '@/api/bookings';

const HOURS = Array.from({ length: 9 }, (_, i) => i + 9); // 9:00–17:00

export default function BookingPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({ startTime: '', endTime: '', purpose: '' });
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    try {
      const data = await getBookings();
      if (data) setBookings(data);
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
      // Parse start and end hours as decimals for simplified calendar UI
      const startHour = parseFloat(form.startTime.split(':')[0]) + (parseFloat(form.startTime.split(':')[1]) / 60);
      const endHour = parseFloat(form.endTime.split(':')[0]) + (parseFloat(form.endTime.split(':')[1]) / 60);
      
      await createBooking({
        resourceId: 'asset-76',
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose
      });
      
      // Update calendar view
      setBookings((prev) => [
        ...prev,
        { id: `b-new-${Date.now()}`, start: startHour, end: endHour, title: form.purpose || 'Booking Slot', status: 'booked' }
      ]);
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
              const isBooked = booking?.status === 'booked';
              const isStart = booking && hour === Math.floor(booking.start);

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
                          {booking.start}:00 — {booking.end % 1 ? `${Math.floor(booking.end)}:30` : `${booking.end}:00`}
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
