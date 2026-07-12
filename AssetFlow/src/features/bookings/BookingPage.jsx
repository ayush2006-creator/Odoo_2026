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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';
import { getAssetBookings, createBooking } from '@/api/bookings';
import { getAssets } from '@/api/assets';

const HOURS = Array.from({ length: 9 }, (_, i) => i + 9); // 9:00–17:00

// Timezone-independent ISO string to decimal hour converter
function parseTimeToDecimal(isoString) {
  if (!isoString) return 9;
  if (typeof isoString === 'number') return isoString;
  
  // Standardize spaces to T to handle both space and T datetime separators
  const cleanStr = String(isoString).trim().replace(' ', 'T');

  if (!cleanStr.includes(':') && !cleanStr.includes('T')) {
    return parseFloat(cleanStr) || 9;
  }
  if (cleanStr.includes(':') && !cleanStr.includes('T')) {
    const [h, m] = cleanStr.split(':');
    return parseFloat(h) + (parseFloat(m) / 60);
  }
  try {
    const parts = cleanStr.split('T');
    const timePart = parts[1] || parts[0];
    if (timePart && timePart.includes(':')) {
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
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Load all bookable assets on mount
  useEffect(() => {
    async function loadAssets() {
      try {
        const list = await getAssets();
        if (list) {
          const bookable = list.filter((a) => a.isBookable);
          setAssets(bookable);
          if (bookable.length > 0) {
            setSelectedAsset(bookable[0]);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Failed to load bookable assets:', err);
        setLoading(false);
      }
    }
    loadAssets();
  }, []);

  async function loadBookings(assetId) {
    if (!assetId) return;
    try {
      setLoading(true);
      const data = await getAssetBookings(assetId);
      if (data) {
        // Convert backend ISO datetimes to local grid decimal hours
        const mapped = data.map((b) => {
          const startHour = parseTimeToDecimal(b.startTime);
          const endHour = parseTimeToDecimal(b.endTime);
          
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

  // Reload bookings whenever selectedAsset is updated
  useEffect(() => {
    if (selectedAsset) {
      loadBookings(selectedAsset.id);
    }
  }, [selectedAsset]);

  function getBookingForHour(hour) {
    return bookings.find((b) => hour >= b.start && hour < b.end);
  }

  const handleBook = async (e) => {
    if (!selectedAsset) return;
    e.preventDefault();
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const startTimeIso = `${todayStr}T${form.startTime}:00`;
      const endTimeIso = `${todayStr}T${form.endTime}:00`;

      await createBooking({
        resourceId: selectedAsset.id,
        startTime: startTimeIso,
        endTime: endTimeIso,
        purpose: form.purpose
      });
      
      await loadBookings(selectedAsset.id);
      setDialogOpen(false);
      setForm({ startTime: '', endTime: '', purpose: '' });
    } catch (err) {
      console.error('Failed to create booking:', err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Resource Booking" description="Book shared assets and meeting rooms." />

      {/* Resource Selector */}
      <BlurFade delay={0.05} inView>
        <Card>
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <CalendarDays className="size-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Select Bookable Resource</p>
              <Select
                value={selectedAsset ? String(selectedAsset.id) : ''}
                onValueChange={(val) => {
                  const found = assets.find(a => String(a.id) === val);
                  if (found) setSelectedAsset(found);
                }}
              >
                <SelectTrigger className="w-full max-w-md font-semibold text-sm h-10">
                  <SelectValue placeholder="No bookable assets available" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} ({a.tag || a.assetTag || `AF-${a.id}`}) — {a.location || 'HQ'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                        ? 'bg-destructive/10 border-destructive/30 border-l-4 border-l-destructive'
                        : isBooked
                          ? 'bg-blue-500/10 border-blue-500/20 border-l-4 border-l-blue-500'
                          : 'border-border/50 hover:bg-accent/50 cursor-pointer'
                    }`}
                    onClick={() => !booking && setDialogOpen(true)}
                  >
                    {booking && (
                      <div className="flex items-center gap-2">
                        {isConflict && <AlertTriangle className="size-3.5 text-destructive" />}
                        <span className={`text-sm font-semibold ${isConflict ? 'text-destructive' : 'text-blue-600 dark:text-blue-400'}`}>
                          {booking.title} {!isStart && <span className="text-xs font-normal text-muted-foreground/60">(Cont.)</span>}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto font-mono">
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
