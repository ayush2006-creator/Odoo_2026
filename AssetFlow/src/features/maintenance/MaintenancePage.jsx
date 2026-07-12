/**
 * MaintenancePage — Screen 7: Kanban board with drag-and-drop.
 *
 * Allowed to drag / transition cards:
 *   - Admin           → all cards
 *   - AssetManager    → all cards
 *   - DepartmentHead  → all cards (backend enforces dept-level rules)
 *   - Employee        → view only (no drag)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Wrench, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';
import { usePermissions } from '@/hooks/usePermissions';
import { ACTIONS } from '@/lib/permissions';
import { getAssets, getAsset } from '@/api/assets';
import { getEmployees } from '@/api/employees';
import {
  getMaintenanceRequests,
  createMaintenanceRequest,
  approveMaintenanceRequest,
  assignTechnician,
  startMaintenance,
  resolveMaintenance,
} from '@/api/maintenance';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLORS = {
  High: 'bg-red-500/15 text-red-600 border-red-500/30',
  Medium: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  Low: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  Critical: 'bg-red-600/20 text-red-700 border-red-600/40',
};

const COLUMN_COLORS = {
  pending: 'border-t-amber-500',
  approved: 'border-t-blue-500',
  assigned: 'border-t-violet-500',
  inProgress: 'border-t-orange-500',
  resolved: 'border-t-emerald-500',
};

const COLUMN_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  assigned: 'Technician Assigned',
  inProgress: 'In Progress',
  resolved: 'Resolved',
};

// Map backend status strings → column keys
function mapStatusToColKey(status) {
  if (!status) return 'pending';
  const clean = status.toLowerCase().replace(/[\s_-]/g, '');
  if (clean.includes('pending')) return 'pending';
  if (clean.includes('approve')) return 'approved';
  if (clean.includes('assign') || clean.includes('technician')) return 'assigned';
  if (clean.includes('progress')) return 'inProgress';
  if (clean.includes('resolve')) return 'resolved';
  return 'pending';
}

// ── DnD helpers ───────────────────────────────────────────────────────────────

/**
 * Registers a DOM node as a droppable target so cards can be dropped onto
 * empty columns (dnd-kit only auto-detects drops over existing sortable items).
 */
function DroppableColumn({ id, children, className }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className} transition-colors ${isOver ? 'bg-primary/5 ring-2 ring-primary/20 ring-inset rounded-lg' : ''}`}
    >
      {children}
    </div>
  );
}

// ── Kanban card components ────────────────────────────────────────────────────

function MaintenanceCard({ item, canDrag }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {canDrag && (
            <div className="mt-0.5 text-muted-foreground shrink-0">
              <GripVertical className="size-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs font-semibold text-primary">{item.tag}</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.Medium}`}
              >
                {item.priority}
              </Badge>
            </div>
            <p className="text-sm font-medium truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.desc}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableCard({ item, canDrag }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(canDrag ? listeners : {})}
      className={canDrag ? 'cursor-grab active:cursor-grabbing mb-2' : 'cursor-default mb-2'}
    >
      <MaintenanceCard item={item} canDrag={canDrag} />
    </div>
  );
}

// ── Raise Maintenance Request Dialog ──────────────────────────────────────────

function RaiseRequestDialog({ open, onOpenChange, onSubmitted }) {
  const [assets, setAssets] = useState([]);
  const [assetId, setAssetId] = useState('');
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    getAssets()
      .then((list) => {
        const arr = Array.isArray(list) ? list : (list?.data || []);
        setAssets(arr);
        if (arr.length > 0) setAssetId(String(arr[0].id));
      })
      .catch(() => {});
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId || !issue.trim()) return;
    setSubmitting(true);
    try {
      await createMaintenanceRequest({ assetId, issueDescription: issue, priority });
      setIssue('');
      setPriority('Medium');
      onOpenChange(false);
      onSubmitted();
    } catch (err) {
      console.error('Failed to raise maintenance request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const safeAssets = Array.isArray(assets) ? assets : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Raise Maintenance Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Asset</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger>
                <SelectValue>
                  {assetId
                    ? (() => {
                        const a = safeAssets.find((x) => String(x.id) === String(assetId));
                        return a
                          ? `${a.name} (${a.tag || a.assetTag || `AF-${a.id}`})`
                          : 'Select asset...';
                      })()
                    : 'Select asset...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {safeAssets.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {`${a.name} (${a.tag || a.assetTag || `AF-${a.id}`})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Issue Description</Label>
            <Textarea
              placeholder="Describe the issue..."
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue>{priority}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !assetId || !issue.trim()}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const { can, role } = usePermissions();

  // Who can move cards between columns
  const canTransition =
    can(ACTIONS.MAINTENANCE_APPROVE) ||
    can(ACTIONS.MAINTENANCE_ASSIGN_TECH) ||
    can(ACTIONS.MAINTENANCE_START) ||
    can(ACTIONS.MAINTENANCE_RESOLVE) ||
    role === 'DepartmentHead';

  const canCreate = can(ACTIONS.MAINTENANCE_CREATE);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [assetMap, setAssetMap] = useState({});
  const [columns, setColumns] = useState({
    pending: [],
    approved: [],
    assigned: [],
    inProgress: [],
    resolved: [],
  });
  const [employees, setEmployees] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dragError, setDragError] = useState('');

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadTickets = useCallback(async (currentAssetMap = null) => {
    setDragError('');
    try {
      let map = currentAssetMap;
      if (!map) {
        const assetsList = await getAssets().catch(() => []);
        const safeAssets = Array.isArray(assetsList) ? assetsList : (assetsList?.data || []);
        map = {};
        safeAssets.forEach((a) => { map[String(a.id)] = a; });
        setAssetMap(map);
      }

      const tickets = await getMaintenanceRequests();
      if (!tickets) return;

      // Fetch any assets missing from the pre-loaded map
      const missingIds = [...new Set(
        tickets
          .map((t) => String(t.assetId || t.asset_id))
          .filter((id) => id && !map[id]),
      )];

      if (missingIds.length > 0) {
        const fetched = await Promise.all(
          missingIds.map((id) => getAsset(id).catch(() => null)),
        );
        const updatedMap = { ...map };
        fetched.forEach((a) => { if (a) updatedMap[String(a.id)] = a; });
        map = updatedMap;
        setAssetMap(updatedMap);
      }

      const newCols = {
        pending: [], approved: [], assigned: [], inProgress: [], resolved: [],
      };

      tickets.forEach((t) => {
        const colKey = mapStatusToColKey(t.status);
        const assetIdKey = String(t.assetId || t.asset_id);
        const matchedAsset = map[assetIdKey] || t.asset || {};
        newCols[colKey].push({
          id: t.id,
          tag:
            matchedAsset.tag ||
            matchedAsset.assetTag ||
            matchedAsset.asset_tag ||
            `AF-${assetIdKey}`,
          name:
            matchedAsset.name ||
            `Asset #${assetIdKey}`,
          desc: t.issueDescription || t.issue_description || '',
          priority: t.priority || 'Medium',
          assetId: t.assetId || t.asset_id,
          asset: matchedAsset,
        });
      });

      setColumns(newCols);
    } catch (err) {
      console.error('Failed to load maintenance tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function initPage() {
      try {
        const [assetsList, emps] = await Promise.all([
          getAssets().catch(() => []),
          getEmployees().catch(() => []),
        ]);

        const safeAssets = Array.isArray(assetsList) ? assetsList : (assetsList?.data || []);
        const map = {};
        safeAssets.forEach((a) => { map[String(a.id)] = a; });
        setAssetMap(map);

        const safeEmps = Array.isArray(emps) ? emps : (emps?.data || []);
        setEmployees(safeEmps);

        await loadTickets(map);
      } catch (err) {
        console.warn('initPage failed:', err);
        await loadTickets({});
      }
    }
    initPage();
  }, [loadTickets]);

  // ── DnD helpers ───────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  /** Find the column key for a given item id */
  const findColumn = useCallback((itemId) => {
    for (const [col, items] of Object.entries(columns)) {
      if (items.some((i) => i.id === itemId)) return col;
    }
    return null;
  }, [columns]);

  /** Find a ticket object by its id across all columns */
  const findItem = useCallback((itemId) => {
    for (const items of Object.values(columns)) {
      const found = items.find((i) => i.id === itemId);
      if (found) return found;
    }
    return null;
  }, [columns]);

  const handleDragStart = (event) => {
    // Only allow authorised users to drag
    if (!canTransition) return;
    setActiveId(event.active.id);
    setDragError('');
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!canTransition || !over) return;

    const sourceCol = findColumn(active.id);
    // `over.id` can be a column key (from DroppableColumn) or a card id (from SortableCard)
    const targetCol = findColumn(over.id) || (columns[over.id] !== undefined ? over.id : null);

    if (!sourceCol || !targetCol || sourceCol === targetCol) return;

    const ticketId = active.id;

    // Optimistically move the card
    const ticket = columns[sourceCol].find((i) => i.id === ticketId);
    if (!ticket) return;

    setColumns((prev) => ({
      ...prev,
      [sourceCol]: prev[sourceCol].filter((i) => i.id !== ticketId),
      [targetCol]: [...prev[targetCol], ticket],
    }));

    try {
      if (targetCol === 'approved') {
        await approveMaintenanceRequest(ticketId);
      } else if (targetCol === 'assigned') {
        const safeEmps = Array.isArray(employees) ? employees : [];
        // Prefer an AssetManager / Admin as default technician
        const tech =
          safeEmps.find((e) => e.role === 'AssetManager') ||
          safeEmps.find((e) => e.role === 'Admin') ||
          safeEmps[0];
        const techId = tech ? tech.id : 1;
        await assignTechnician(ticketId, { technicianId: techId });
      } else if (targetCol === 'inProgress') {
        await startMaintenance(ticketId);
      } else if (targetCol === 'resolved') {
        await resolveMaintenance(ticketId, { resolutionNotes: 'Resolved via board drag' });
      }
    } catch (err) {
      console.error('Failed to transition ticket:', err);
      setDragError('Transition failed — reverting board.');
      // Revert to persisted state
      await loadTickets();
    }
  };

  const activeItem = activeId ? findItem(activeId) : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Track and manage maintenance requests through the workflow."
      >
        {canCreate && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-1" />
            Raise Request
          </Button>
        )}
      </PageHeader>

      <RaiseRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmitted={loadTickets}
      />

      {dragError && (
        <p className="text-xs text-destructive text-center">{dragError}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          <Wrench className="size-4 mr-2 animate-pulse" />
          Loading maintenance board…
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <BlurFade delay={0.05} inView>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                <div
                  key={key}
                  className={`flex-shrink-0 w-[260px] rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm border-t-2 ${COLUMN_COLORS[key]}`}
                >
                  <div className="flex items-center justify-between p-3 pb-2">
                    <h3 className="text-sm font-semibold">{label}</h3>
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {columns[key]?.length ?? 0}
                    </Badge>
                  </div>

                  <DroppableColumn
                    id={key}
                    className="p-2 pt-0 min-h-[120px] flex flex-col"
                  >
                    <SortableContext
                      items={columns[key]?.map((i) => i.id) ?? []}
                      strategy={verticalListSortingStrategy}
                      id={key}
                    >
                      {columns[key]?.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8 select-none">
                          Drop here
                        </p>
                      )}
                      {columns[key]?.map((item) => (
                        <SortableCard
                          key={item.id}
                          item={item}
                          canDrag={canTransition}
                        />
                      ))}
                    </SortableContext>
                  </DroppableColumn>
                </div>
              ))}
            </div>
          </BlurFade>

          <DragOverlay dropAnimation={{ duration: 150 }}>
            {activeItem ? (
              <MaintenanceCard item={activeItem} canDrag />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <BlurFade delay={0.15} inView>
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
          <Wrench className="size-3" />
          {canTransition
            ? 'Drag cards between columns to transition the maintenance workflow.'
            : 'You can raise requests. Admins and managers can transition cards.'}
        </p>
      </BlurFade>
    </div>
  );
}
