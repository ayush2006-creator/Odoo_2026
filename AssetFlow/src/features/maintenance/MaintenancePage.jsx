/**
 * MaintenancePage — Screen 7: Kanban board with drag-and-drop.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';
import { usePermissions } from '@/hooks/usePermissions';
import { ACTIONS } from '@/lib/permissions';
import { getEmployees } from '@/api/employees';
import {
  getMaintenanceRequests,
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

function SortableCard({ item, hasTransitionPerm }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !hasTransitionPerm,
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
      {...(hasTransitionPerm ? listeners : {})}
      className={hasTransitionPerm ? "cursor-grab active:cursor-grabbing mb-2" : "cursor-default mb-2"}
    >
      <MaintenanceCard item={item} hasTransitionPerm={hasTransitionPerm} />
    </div>
  );
}

function MaintenanceCard({ item, hasTransitionPerm }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {hasTransitionPerm && (
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

export default function MaintenancePage() {
  const { can } = usePermissions();
  const hasTransitionPerm = can(ACTIONS.MAINTENANCE_APPROVE) || can(ACTIONS.MAINTENANCE_ASSIGN_TECH) || can(ACTIONS.MAINTENANCE_START) || can(ACTIONS.MAINTENANCE_RESOLVE);

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

  const loadTickets = useCallback(async () => {
    try {
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
          newCols[colKey].push({
            id: t.id,
            tag: t.asset?.assetTag || t.asset?.tag || `AF-${t.assetId}`,
            name: t.asset?.name || `Asset #${t.assetId}`,
            desc: t.issueDescription || '',
            priority: t.priority || 'Medium',
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
    loadTickets();
    async function loadEmps() {
      try {
        const emps = await getEmployees();
        if (emps) {
          if (Array.isArray(emps)) setEmployees(emps);
          else if (Array.isArray(emps.data)) setEmployees(emps.data);
        }
      } catch (err) {
        console.warn('Failed to load employees for technician assignment fallback:', err);
      }
    }
    loadEmps();
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

  const findItem = useCallback((id) => {
    for (const items of Object.values(columns)) {
      const item = items.find((i) => i.id === id);
      if (item) return item;
    }
    return null;
  }, [columns]);

  const handleDragStart = (event) => {
    if (!hasTransitionPerm) return;
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    if (!hasTransitionPerm) return;
    const { active, over } = event;
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
        const item = prev[sourceCol].find((i) => i.id === active.id);
        if (!item) return prev;
        return {
          ...prev,
          [sourceCol]: prev[sourceCol].filter((i) => i.id !== active.id),
          [targetCol]: [...prev[targetCol], item],
        };
      });
    } catch (err) {
      console.error('Failed to transition ticket:', err);
      // Revert board to database state on failure (e.g. role validation block)
      await loadTickets();
    }
  };

  const activeItem = activeId ? findItem(activeId) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance" description="Track maintenance requests through the workflow." />

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
                <div className="p-2 pt-0 min-h-[120px]">
                  <SortableContext
                    items={columns[key]?.map((i) => i.id) || []}
                    strategy={verticalListSortingStrategy}
                    id={key}
                  >
                    {columns[key]?.map((item) => (
                      <SortableCard key={item.id} item={item} hasTransitionPerm={hasTransitionPerm} />
                    ))}
                  </SortableContext>
                </div>
              </div>
            ))}
          </div>
        </BlurFade>

        <DragOverlay>
          {activeItem ? <MaintenanceCard item={activeItem} hasTransitionPerm={hasTransitionPerm} /> : null}
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
