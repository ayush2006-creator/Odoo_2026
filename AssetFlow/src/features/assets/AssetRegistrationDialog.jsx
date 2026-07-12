/**
 * AssetRegistrationDialog — register a new asset.
 */

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const CATEGORIES = ['Electronics', 'Furniture', 'Vehicles', 'Stationery'];
const CONDITIONS = ['New', 'Good', 'Fair', 'Poor'];

export function AssetRegistrationDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({
    name: '', category: '', serialNumber: '', acquisitionDate: '',
    cost: '', condition: '', location: '', isBookable: false,
  });

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Would call createAsset(form) here
    onOpenChange(false);
    setForm({ name: '', category: '', serialNumber: '', acquisitionDate: '', cost: '', condition: '', location: '', isBookable: false });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register New Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Name</Label>
              <Input id="asset-name" placeholder="e.g. Dell Laptop" value={form.name} onChange={(e) => update('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => update('category', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input id="serial" placeholder="SN-XXXX" value={form.serialNumber} onChange={(e) => update('serialNumber', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acq-date">Acquisition Date</Label>
              <Input id="acq-date" type="date" value={form.acquisitionDate} onChange={(e) => update('acquisitionDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost</Label>
              <Input id="cost" type="number" placeholder="0.00" value={form.cost} onChange={(e) => update('cost', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => update('condition', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="e.g. HQ Floor 2" value={form.location} onChange={(e) => update('location', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="bookable" checked={form.isBookable} onCheckedChange={(v) => update('isBookable', v)} />
            <Label htmlFor="bookable" className="text-sm font-normal">This asset is bookable (shared resource)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Register Asset</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
