/**
 * AssetRegistrationDialog — register a new asset.
 */

import { useState, useEffect } from 'react';
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
import { createAsset } from '@/api/assets';
import { getAssetCategories } from '@/api/assetCategories';

const CONDITIONS = ['New', 'Good', 'Fair', 'Poor'];

export function AssetRegistrationDialog({ open, onOpenChange }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: '', categoryId: '', serialNumber: '', acquisitionDate: '',
    cost: '', condition: '', location: '', isBookable: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch actual categories from the database on dialog open
  useEffect(() => {
    async function fetchCategories() {
      if (!open) return;
      try {
        const list = await getAssetCategories();
        if (list) setCategories(list);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    fetchCategories();
  }, [open]);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categoryId) {
      setError('Please select a category.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createAsset({
        name: form.name,
        categoryId: parseInt(form.categoryId, 10),
        serialNumber: form.serialNumber,
        acquisitionDate: form.acquisitionDate || new Date().toISOString().split('T')[0],
        acquisitionCost: parseFloat(form.cost) || 0.0,
        cost: parseFloat(form.cost) || 0.0,
        condition: form.condition || 'New',
        location: form.location,
        isBookable: form.isBookable,
        customValues: {}
      });
      onOpenChange(false);
      setForm({ name: '', categoryId: '', serialNumber: '', acquisitionDate: '', cost: '', condition: '', location: '', isBookable: false });
    } catch (err) {
      console.error('Failed to register asset:', err);
      setError(err?.message || 'Failed to register asset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register New Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Name</Label>
              <Input id="asset-name" placeholder="e.g. Dell Laptop" value={form.name} onChange={(e) => update('name', e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => update('categoryId', v)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue>
                    {form.categoryId ? (categories.find(c => String(c.id) === form.categoryId)?.name || 'Select...') : 'Select...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {`${c.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input id="serial" placeholder="SN-XXXX" value={form.serialNumber} onChange={(e) => update('serialNumber', e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acq-date">Acquisition Date</Label>
              <Input id="acq-date" type="date" value={form.acquisitionDate} onChange={(e) => update('acquisitionDate', e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost</Label>
              <Input id="cost" type="number" placeholder="0.00" value={form.cost} onChange={(e) => update('cost', e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => update('condition', v)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue>
                    {form.condition ? `${form.condition}` : 'Select...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {`${c}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="e.g. HQ Floor 2" value={form.location} onChange={(e) => update('location', e.target.value)} disabled={loading} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="bookable" checked={form.isBookable} onCheckedChange={(v) => update('isBookable', v)} disabled={loading} />
            <Label htmlFor="bookable" className="text-sm font-normal">This asset is bookable (shared resource)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
