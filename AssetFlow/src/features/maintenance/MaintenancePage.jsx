/**
 * MaintenancePage — Screen 7: Kanban board with drag-and-drop.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Wrench, Plus } from 'lucide-react';

function DroppableColumn({ id, children, className }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { getAssets } from '@/api/assets';
import { getEmployees } from '@/api/employees';
import {
  getMaintenanceRequests,
  createMaintenanceRequest,
  approveMaintenanceRequest,
  assignTechnician,
  startMaintenance,
  resolveMaintenance,
} from '@/api/maintenance';

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

function SortableCard({ item, canDrag }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(canDrag ? listeners : {})}
      className={canDrag ? "cursor-grab active:cursor-grabbing mb-2" : "cursor-default mb-2"}
    >
      <MaintenanceCard item={item} canDrag={canDrag} />
    </div>
  );
}

function MaintenanceCard({ item, canDrag }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {canDrag && (
            <div className="mt-0.5 text-muted-foreground">
              <GripVertical className="size-4 shrink-0" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs font-semibold text-primary">{item.tag}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[item.priority]}`}>
                {item.priority}
              </Badge>
            </div>
            <p className="text-sm font-medium truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Raise Maintenance Request Dialog ─────────────────────────────────────────
function RaiseRequestDialog({ open, onOpenChange, onSubmitted }) {
  const [assets, setAssets] = useState([]);
  const [assetId, setAssetId] = useState('');
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    getAssets().then((list) => {
      const arr = Array.isArray(list) ? list : (list?.data || []);
      setAssets(arr);
      if (arr.length > 0) setAssetId(String(arr[0].id));
    }).catch(() => {});
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
                <SelectValue placeholder="Select asset...">
                  {assetId ? (() => {
                    const selected = safeAssets.find(a => String(a.id) === String(assetId));
                    return selected ? `${selected.name} (${selected.tag || selected.assetTag || `AF-${selected.id}`})` : 'Select asset...';
                  })() : 'Select asset...'}
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
                <SelectValue>
                  {priority}
                </SelectValue>
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

export default function MaintenancePage() {
  const { can, role, user } = usePermissions();
  const hasTransitionPerm = can(ACTIONS.MAINTENANCE_APPROVE) || can(ACTIONS.MAINTENANCE_ASSIGN_TECH) || can(ACTIONS.MAINTENANCE_START) || can(ACTIONS.MAINTENANCE_RESOLVE);
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

  const loadTickets = useCallback(async (currentAssetMap = null) => {
    try {
      let map = currentAssetMap;
      if (!map) {
        const assetsList = await getAssets().catch(() => []);
        const safeAssets = Array.isArray(assetsList) ? assetsList : (assetsList?.data || []);
        map = {};
        safeAssets.forEach((a) => {
          map[String(a.id)] = a;
        });
        setAssetMap(map);
      }

      const tickets = await getMaintenanceRequests();
      if (tickets) {
        const newCols = {
          pending: [],
          approved: [],
          assigned: [],
          inProgress: [],
          resolved: [],
        };
        tickets.forEach((t) => {
          const colKey = mapStatusToColKey(t.status);
          const matchedAsset = map[String(t.assetId || t.asset_id)] || t.asset || {};
          newCols[colKey].push({
            id: t.id,
            tag: matchedAsset.tag || matchedAsset.assetTag || matchedAsset.asset_tag || t.asset?.assetTag || t.asset?.tag || t.asset?.asset_tag || `AF-${t.assetId || t.asset_id}`,
            name: matchedAsset.name || t.asset?.name || `Asset #${t.assetId || t.asset_id}`,
            desc: t.issueDescription || t.issue_description || '',
            priority: t.priority || 'Medium',
            assetId: t.assetId || t.asset_id || t.asset?.id,
            asset: matchedAsset,
          });
        });
        setColumns(newCols);
      }
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
          getEmployees().catch(() => [])
        ]);

        const safeAssets = Array.isArray(assetsList) ? assetsList : (assetsList?.data || []);
        const map = {};
        safeAssets.forEach((a) => {
          map[String(a.id)] = a;
        });
        setAssetMap(map);

        if (emps) {
          if (Array.isArray(emps)) setEmployees(emps);
          else if (Array.isArray(emps.data)) setEmployees(emps.data);
        }

        await loadTickets(map);
      } catch (err) {
        console.warn('Failed to load asset/employee mapping:', err);
        await loadTickets({});
      }
    }
    initPage();
  }, [loadTickets]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const findColumn = useCallback((id) => {
    for (const [col, items] of Object.entries(columns)) {
      if (items.find((i) => i.id === id)) return col;
    }
    return null;
  }, [columns]);

  const canDragItem = useCallback((item) => {
    if (!item) return false;
    // Admin and AssetManager can drag everything
    if (can(ACTIONS.MAINTENANCE_APPROVE) || can(ACTIONS.MAINTENANCE_ASSIGN_TECH) || can(ACTIONS.MAINTENANCE_START) || can(ACTIONS.MAINTENANCE_RESOLVE)) {
      return true;
    }

    // DepartmentHead can drag if the asset belongs to their department
    if (role === 'DepartmentHead' && user?.departmentId) {
      const itemAsset = assetMap[String(item.assetId || item.asset?.id)] || item.asset || {};
      const itemDeptId = item.departmentId || itemAsset.departmentId || itemAsset.department_id;
      if (itemDeptId && String(itemDeptId) === String(user.departmentId)) {
        return true;
      }
    }
    return false;
  }, [can, role, user, assetMap]);

  const handleDragStart = (event) => {
    const item = findItem(event.active.id);
    if (!canDragItem(item)) return;
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    const item = findItem(active.id);
    if (!canDragItem(item)) return;

    setActiveId(null);
    if (!over) return;

    const sourceCol = findColumn(active.id);
    let targetCol = findColumn(over.id);
    if (!targetCol) {
      targetCol = over.id;
    }

    if (!sourceCol || !targetCol || sourceCol === targetCol) return;

    const ticketId = active.id;
    try {
      if (targetCol === 'approved') {
        await approveMaintenanceRequest(ticketId);
      } else if (targetCol === 'assigned') {
        const safeEmps = Array.isArray(employees) ? employees : [];
        // Find a valid technician: try Asset Manager, then Admin, then first employee, otherwise fallback to 1
        const tech = safeEmps.find(e => e.role?.toLowerCase() === 'assetmanager' || e.role?.toLowerCase() === 'admin') || safeEmps[0];
        const techId = tech ? tech.id : 1;
        await assignTechnician(ticketId, { technicianId: techId });
      } else if (targetCol === 'inProgress') {
        await startMaintenance(ticketId);
      } else if (targetCol === 'resolved') {
        await resolveMaintenance(ticketId, { resolutionNotes: 'Resolved via board drag' });
      }

      setColumns((prev) => {
        const ticket = prev[sourceCol].find((i) => i.id === active.id);
        if (!ticket) return prev;
        return {
          ...prev,
          [sourceCol]: prev[sourceCol].filter((i) => i.id !== active.id),
          [targetCol]: [...prev[targetCol], ticket],
        };
      });
    } catch (err) {
      console.error('Failed to transition ticket:', err);
      // Revert board to database state on failure
      await loadTickets();
    }
  };

  const activeItem = activeId ? findItem(activeId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Track maintenance requests through the workflow."
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <BlurFade delay={0.1} inView>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {Object.entries(COLUMN_LABELS).map(([key, label]) => (
              <div
                key={key}
                className={`flex-shrink-0 w-[260px] rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm border-t-2 ${COLUMN_COLORS[key]}`}
              >
                <div className="flex items-center justify-between p-3 pb-2">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {columns[key]?.length || 0}
                  </Badge>
                </div>
                <DroppableColumn
                  id={key}
                  className="p-2 pt-0 min-h-[120px] h-full flex flex-col"
                >
                  <SortableContext
                    items={columns[key]?.map((i) => i.id) || []}
                    strategy={verticalListSortingStrategy}
                    id={key}
                  >
                    {columns[key]?.map((item) => (
                      <SortableCard key={item.id} item={item} canDrag={canDragItem(item)} />
                    ))}
                  </SortableContext>
                </DroppableColumn>
              </div>
            ))}
          </div>
        </BlurFade>

        <DragOverlay>
          {activeItem ? <MaintenanceCard item={activeItem} canDrag={canDragItem(activeItem)} /> : null}
        </DragOverlay>
      </DndContext>

      <BlurFade delay={0.15} inView>
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
          <Wrench className="size-3" />
          Approving a card moves the asset to under maintenance, resolving returns it to available.
        </p>
      </BlurFade>
    </div>
  );
}
