/**
 * AuditPage — Audit cycle management with full CRUD:
 *  - Create audit cycle (Admin/AssetManager)
 *  - Assign auditors (Admin/AssetManager)
 *  - Mark items Verified / Missing / Damaged (assigned auditors)
 *  - Close audit cycle (Admin/AssetManager)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, ClipboardCheck, Plus, Users, Lock,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, Loader2,
  CalendarRange, MapPin, Building2, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  getAuditCycles, createAuditCycle, assignAuditors,
  getAuditItems, updateAuditItem, getDiscrepancies, closeAuditCycle,
} from '@/api/auditCycles';
import { getEmployees } from '@/api/employees';
import { getAssets } from '@/api/assets';
import { getStoredUser } from '@/api/client';
import { ROLES } from '@/lib/roles';

// ─── helpers ────────────────────────────────────────────────────────────────

const RESULT_OPTIONS = ['Verified', 'Missing', 'Damaged'];

const RESULT_ICON = {
  Verified: <CheckCircle2 className="size-3.5 text-emerald-500" />,
  Missing:  <XCircle     className="size-3.5 text-red-500"     />,
  Damaged:  <AlertCircle className="size-3.5 text-amber-500"   />,
};

function resultVariant(r) {
  if (r === 'Verified') return 'default';
  if (r === 'Missing')  return 'destructive';
  return 'secondary';
}

function getInitials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function canManage(role) {
  return role === ROLES.ADMIN || role === ROLES.ASSET_MANAGER;
}

// ─── empty / skeleton state ──────────────────────────────────────────────────

const MOCK_ITEMS = [
  { tag: 'AF-0076', asset_tag: 'AF-0076', name: 'Dell Laptop',        location: 'Desk B12', result: 'Verified',  asset_id: 76 },
  { tag: 'AF-0021', asset_tag: 'AF-0021', name: 'Office Chair',       location: 'Desk G19', result: 'Missing',   asset_id: 21 },
  { tag: 'AF-0098', asset_tag: 'AF-0098', name: 'Monitor 27"',        location: 'Desk B10', result: 'Damaged',   asset_id: 98 },
  { tag: 'AF-0033', asset_tag: 'AF-0033', name: 'Conference Table',   location: 'Room C4',  result: 'Verified',  asset_id: 33 },
  { tag: 'AF-0042', asset_tag: 'AF-0042', name: 'Projector 4K',       location: 'AV Room',  result: 'Verified',  asset_id: 42 },
];

// ─── sub-components ──────────────────────────────────────────────────────────

/** Pill that shows result with icon */
function ResultBadge({ result }) {
  if (!result) return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
  return (
    <Badge variant={resultVariant(result)} className="gap-1">
      {RESULT_ICON[result]}
      {result}
    </Badge>
  );
}

/** Inline dropdown to update a single item's result */
function VerifyDropdown({ item, cycleId, onVerified, disabled }) {
  const [loading, setLoading] = useState(false);

  async function handleSelect(result) {
    setLoading(true);
    try {
      const assetId = item.asset_id ?? item.assetId ?? item.id;
      await updateAuditItem(cycleId, assetId, { result });
      onVerified(assetId, result);
    } catch (err) {
      console.error('Failed to update audit item:', err);
    } finally {
      setLoading(false);
    }
  }

  if (disabled) return <ResultBadge result={item.result} />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" disabled={loading}>
          {loading
            ? <Loader2 className="size-3.5 animate-spin" />
            : <ResultBadge result={item.result} />}
          <ChevronDown className="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {RESULT_OPTIONS.map((r) => (
          <DropdownMenuItem key={r} onClick={() => handleSelect(r)} className="gap-2">
            {RESULT_ICON[r]} {r}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Create Cycle Dialog ─────────────────────────────────────────────────────

function CreateCycleDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '',
    scope_type: 'Location',
    scope_value: '',
    date_range_start: '',
    date_range_end: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.scope_value.trim() || !form.date_range_start || !form.date_range_end) {
      setError('Please fill in all fields.');
      return;
    }
    setSaving(true);
    try {
      const cycle = await createAuditCycle(form);
      onCreate(cycle);
      onClose();
      setForm({ name: '', scope_type: 'Location', scope_value: '', date_range_start: '', date_range_end: '' });
    } catch (err) {
      setError(err?.message || 'Failed to create audit cycle.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Audit Cycle</DialogTitle>
          <DialogDescription>
            Creates a cycle and auto-populates all matching asset items for verification.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cycle Name</label>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition"
              placeholder="e.g. Q3 Office Audit"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          {/* Scope */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scope Type</label>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition"
                value={form.scope_type}
                onChange={(e) => set('scope_type', e.target.value)}
              >
                <option value="Location">Location</option>
                <option value="Department">Department</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {form.scope_type === 'Location' ? 'Location' : 'Department'}
              </label>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition"
                placeholder={form.scope_type === 'Location' ? 'Building A' : 'Engineering'}
                value={form.scope_value}
                onChange={(e) => set('scope_value', e.target.value)}
              />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Date</label>
              <input
                type="date"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition"
                value={form.date_range_start}
                onChange={(e) => set('date_range_start', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End Date</label>
              <input
                type="date"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition"
                value={form.date_range_end}
                onChange={(e) => set('date_range_end', e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Create Cycle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Auditors Dialog ──────────────────────────────────────────────────

function AssignAuditorsDialog({ open, onClose, cycleId, onAssigned }) {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getEmployees()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        setEmployees(list);
      })
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  }, [open]);

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    if (selected.size === 0) { setError('Select at least one auditor.'); return; }
    setSaving(true);
    try {
      await assignAuditors(cycleId, { auditor_ids: [...selected] });
      onAssigned([...selected]);
      onClose();
      setSelected(new Set());
    } catch (err) {
      setError(err?.message || 'Failed to assign auditors.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Auditors</DialogTitle>
          <DialogDescription>Select employees to conduct this audit cycle.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && employees.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No employees found.</p>
          )}
          {employees.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => toggle(emp.id)}
              className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                selected.has(emp.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted/40 hover:bg-muted'
              }`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {getInitials(emp.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{emp.name}</p>
                <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
              </div>
              {selected.has(emp.id) && <CheckCircle2 className="size-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleAssign} disabled={saving || selected.size === 0}>
            {saving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            Assign {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Close Cycle Confirm Dialog ───────────────────────────────────────────────

function CloseCycleDialog({ open, onClose, onConfirm, saving }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Close Audit Cycle?</DialogTitle>
          <DialogDescription>
            This will <strong>lock</strong> the cycle permanently. All assets marked{' '}
            <span className="text-red-500 font-medium">Missing</span> will be automatically
            transitioned to <span className="font-medium">Lost</span> status. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={saving}>
            {saving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            Yes, Close Cycle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const currentUser = getStoredUser();
  const isManager   = canManage(currentUser?.role);

  const [cycles, setCycles]           = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [items, setItems]             = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [auditorIds, setAuditorIds]   = useState([]);

  const [loading, setLoading]         = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Dialog visibility
  const [showCreate, setShowCreate]   = useState(false);
  const [showAssign, setShowAssign]   = useState(false);
  const [showClose, setShowClose]     = useState(false);
  const [closeSaving, setCloseSaving] = useState(false);

  // ── load initial cycles ──────────────────────────────────────────────────
  const loadCycles = useCallback(async () => {
    try {
      const res = await getAuditCycles();
      const list = Array.isArray(res) ? res : (res?.data || []);
      setCycles(list);
      if (list.length > 0) {
        setActiveCycle(list[0]);
      }
    } catch {
      setCycles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCycles(); }, [loadCycles]);

  // ── load items & discrepancies whenever active cycle changes ─────────────
  useEffect(() => {
    if (!activeCycle?.id) {
      setItems(MOCK_ITEMS);
      return;
    }

    setItemsLoading(true);

    Promise.all([
      getAuditItems(activeCycle.id).catch(() => []),
      getDiscrepancies(activeCycle.id).catch(() => []),
    ]).then(async ([rawItems, rawDisc]) => {
      const safeItems = Array.isArray(rawItems) ? rawItems : (rawItems?.data || []);
      const safeDisc  = Array.isArray(rawDisc)  ? rawDisc  : (rawDisc?.data  || []);

      setDiscrepancies(safeDisc);

      if (safeItems.length === 0) {
        setItems(MOCK_ITEMS);
        return;
      }

      // Enrich items with asset tag/name/location if missing
      const needsEnrich = safeItems.some((i) => !i.tag && !i.asset_tag && !i.name);
      if (needsEnrich) {
        try {
          const allAssets = await getAssets();
          const assetArr  = Array.isArray(allAssets) ? allAssets : (allAssets?.data || []);
          const byId = {};
          assetArr.forEach((a) => { byId[String(a.id)] = a; });

          const enriched = safeItems.map((item) => {
            const a = byId[String(item.asset_id ?? item.assetId)] || {};
            return {
              ...item,
              tag:      item.tag      || item.asset_tag || a.asset_tag || a.assetTag || `AF-${item.asset_id ?? item.assetId}`,
              name:     item.name     || a.name     || 'Unknown Asset',
              location: item.location || a.location || '—',
            };
          });
          setItems(enriched);
        } catch {
          setItems(safeItems);
        }
      } else {
        setItems(safeItems);
      }
    }).finally(() => setItemsLoading(false));
  }, [activeCycle]);

  // ── handlers ─────────────────────────────────────────────────────────────

  function handleCycleCreated(newCycle) {
    setCycles((prev) => [newCycle, ...prev]);
    setActiveCycle(newCycle);
  }

  function handleAuditorsAssigned(ids) {
    setAuditorIds(ids);
  }

  function handleItemVerified(assetId, result) {
    setItems((prev) =>
      prev.map((i) =>
        (i.asset_id ?? i.assetId ?? i.id) === assetId ? { ...i, result } : i
      )
    );
    // If flagged, increment discrepancy count locally
    if (result === 'Missing' || result === 'Damaged') {
      setDiscrepancies((prev) => {
        const already = prev.some((d) => (d.asset_id ?? d.assetId) === assetId);
        if (already) return prev;
        return [...prev, { asset_id: assetId, result }];
      });
    } else {
      setDiscrepancies((prev) =>
        prev.filter((d) => (d.asset_id ?? d.assetId) !== assetId)
      );
    }
  }

  async function handleClose() {
    setCloseSaving(true);
    try {
      await closeAuditCycle(activeCycle.id);
      setActiveCycle((c) => ({ ...c, status: 'Closed' }));
      setShowClose(false);
    } catch (err) {
      console.error('Failed to close audit cycle:', err);
    } finally {
      setCloseSaving(false);
    }
  }

  // ── stats ─────────────────────────────────────────────────────────────────
  const verified = items.filter((i) => i.result === 'Verified').length;
  const missing  = items.filter((i) => i.result === 'Missing').length;
  const damaged  = items.filter((i) => i.result === 'Damaged').length;
  const pending  = items.filter((i) => !i.result || i.result === 'Pending').length;
  const isClosed = activeCycle?.status === 'Closed';

  // can current user verify items?
  const canVerify = auditorIds.length === 0 // auditors not loaded yet → allow if logged in
    ? !!currentUser
    : auditorIds.includes(currentUser?.id);
  const verifyAllowed = !isClosed && (canVerify || isManager);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit"
        description="Manage audit cycles and verify asset inventory."
      >
        {isManager && (
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
            <Plus className="size-4" /> New Cycle
          </Button>
        )}
      </PageHeader>

      {/* ── Active Cycle Card ── */}
      {!loading && (
        <BlurFade delay={0.05} inView>
          <Card>
            <CardContent className="py-4">
              {activeCycle ? (
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: cycle info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base">{activeCycle.name}</h3>
                      {isClosed
                        ? <Badge variant="destructive" className="gap-1"><Lock className="size-3" /> Closed</Badge>
                        : <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">Active</Badge>}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarRange className="size-3.5" />
                        {activeCycle.date_range_start || activeCycle.dateRangeStart || '—'} →{' '}
                        {activeCycle.date_range_end   || activeCycle.dateRangeEnd   || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        {(activeCycle.scope_type || activeCycle.scopeType) === 'Location'
                          ? <MapPin className="size-3.5" />
                          : <Building2 className="size-3.5" />}
                        {activeCycle.scope_value || activeCycle.scopeValue || '—'}
                      </span>
                    </div>

                    {/* Progress pills */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 text-xs font-medium">
                        <CheckCircle2 className="size-3" /> {verified} Verified
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-500 px-2.5 py-0.5 text-xs font-medium">
                        <XCircle className="size-3" /> {missing} Missing
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 px-2.5 py-0.5 text-xs font-medium">
                        <AlertCircle className="size-3" /> {damaged} Damaged
                      </span>
                      {pending > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-xs font-medium">
                          {pending} Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: auditors + actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    {auditorIds.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Auditors:</span>
                        <div className="flex -space-x-2">
                          {auditorIds.slice(0, 5).map((id) => (
                            <Avatar key={id} className="h-7 w-7 border-2 border-background">
                              <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">
                                {String(id).slice(-2)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {auditorIds.length > 5 && (
                            <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                              +{auditorIds.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isManager && !isClosed && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8"
                          onClick={() => setShowAssign(true)}
                        >
                          <Users className="size-3.5" /> Assign Auditors
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1.5 h-8"
                          onClick={() => setShowClose(true)}
                        >
                          <Lock className="size-3.5" /> Close Cycle
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <ClipboardCheck className="size-10 text-muted-foreground/40" />
                  <div>
                    <p className="font-medium">No active audit cycle</p>
                    <p className="text-sm text-muted-foreground">
                      {isManager ? 'Create a new cycle to begin auditing assets.' : 'No audit cycle is currently active.'}
                    </p>
                  </div>
                  {isManager && (
                    <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
                      <Plus className="size-4" /> New Cycle
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* ── Cycle Switcher (if multiple) ── */}
      {cycles.length > 1 && (
        <BlurFade delay={0.07} inView>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-muted-foreground shrink-0">Switch cycle:</span>
            {cycles.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCycle(c)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                  activeCycle?.id === c.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </BlurFade>
      )}

      {/* ── Discrepancy Alert ── */}
      {discrepancies.length > 0 && (
        <BlurFade delay={0.09} inView>
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="size-4 text-amber-600" />
            <AlertTitle className="text-amber-700 dark:text-amber-400">Discrepancies Found</AlertTitle>
            <AlertDescription className="text-amber-600 dark:text-amber-300">
              {discrepancies.length} asset{discrepancies.length > 1 ? 's' : ''} flagged as Missing or Damaged —
              discrepancy report generated automatically.
              {isClosed && ' Missing assets have been transitioned to Lost.'}
            </AlertDescription>
          </Alert>
        </BlurFade>
      )}

      {/* ── Checklist Table ── */}
      {activeCycle && (
        <BlurFade delay={0.12} inView>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="size-4 text-primary" />
                Verification Checklist
                <span className="text-xs font-normal text-muted-foreground">
                  ({items.length} items)
                </span>
              </CardTitle>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setActiveCycle((c) => ({ ...c }))} // re-triggers useEffect
                disabled={itemsLoading}
                title="Refresh"
              >
                <RefreshCw className={`size-4 ${itemsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {itemsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Asset Tag</TableHead>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Expected Location</TableHead>
                      <TableHead className="text-right">Verification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const key = item.tag || item.asset_tag || item.asset_id || Math.random();
                      return (
                        <TableRow key={key}>
                          <TableCell>
                            <span className="font-mono text-xs text-primary font-semibold">
                              {item.tag || item.asset_tag}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground">{item.location || '—'}</TableCell>
                          <TableCell className="text-right">
                            <VerifyDropdown
                              item={item}
                              cycleId={activeCycle.id}
                              onVerified={handleItemVerified}
                              disabled={!verifyAllowed}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          No audit items found for this cycle.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* ── Dialogs ── */}
      <CreateCycleDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCycleCreated}
      />
      <AssignAuditorsDialog
        open={showAssign}
        onClose={() => setShowAssign(false)}
        cycleId={activeCycle?.id}
        onAssigned={handleAuditorsAssigned}
      />
      <CloseCycleDialog
        open={showClose}
        onClose={() => setShowClose(false)}
        onConfirm={handleClose}
        saving={closeSaving}
      />
    </div>
  );
}
