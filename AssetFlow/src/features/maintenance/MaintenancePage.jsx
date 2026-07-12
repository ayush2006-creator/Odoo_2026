/**
 * MaintenancePage — Screen 7: Kanban board with drag-and-drop.
 */

import { useState, useCallback } from 'react';
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

const INITIAL_DATA = {
  pending: [
    { id: 'mc-1', tag: 'AF-0063', name: 'Projector', desc: 'Bulb replacement', priority: 'High' },
    { id: 'mc-2', tag: 'AF-0098', name: 'UPS', desc: 'Battery replacement', priority: 'Medium' },
  ],
  approved: [
    { id: 'mc-3', tag: 'AF-0076', name: 'Laptop', desc: 'Screen damage', priority: 'High' },
  ],
  assigned: [
    { id: 'mc-4', tag: 'AF-0112', name: 'AC Unit', desc: 'Cooling issue', priority: 'Medium' },
  ],
  inProgress: [
    { id: 'mc-5', tag: 'AF-0042', name: 'Printer', desc: 'Paper jam fix', priority: 'Low' },
  ],
  resolved: [
    { id: 'mc-6', tag: 'AF-0033', name: 'Monitor', desc: 'Cable replaced', priority: 'Low' },
    { id: 'mc-7', tag: 'AF-015', name: 'Chair', desc: 'Wheel repair', priority: 'Medium' },
  ],
};

const COLUMN_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  assigned: 'Technician Assigned',
  inProgress: 'In Progress',
  resolved: 'Resolved',
};

function SortableCard({ item }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <MaintenanceCard item={item} dragListeners={listeners} />
    </div>
  );
}

function MaintenanceCard({ item, dragListeners }) {
  return (
    <Card className="mb-2 hover:shadow-md transition-shadow cursor-default">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <button className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" {...dragListeners}>
            <GripVertical className="size-4" />
          </button>
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
  const [columns, setColumns] = useState(INITIAL_DATA);
  const [activeId, setActiveId] = useState(null);

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
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const sourceCol = findColumn(active.id);
    // Determine target column: could be dropping on a card or on the column container
    let targetCol = findColumn(over.id);
    if (!targetCol) {
      // Dropped on a column droppable id
      targetCol = over.id;
    }

    if (!sourceCol || !targetCol || sourceCol === targetCol) return;

    setColumns((prev) => {
      const item = prev[sourceCol].find((i) => i.id === active.id);
      if (!item) return prev;
      return {
        ...prev,
        [sourceCol]: prev[sourceCol].filter((i) => i.id !== active.id),
        [targetCol]: [...prev[targetCol], item],
      };
    });
  };

  const activeItem = activeId ? findItem(activeId) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance" description="Track maintenance requests through the workflow." />

      <BlurFade delay={0.1} inView>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
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
                      <SortableCard key={item.id} item={item} />
                    ))}
                  </SortableContext>
                </div>
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeItem ? <MaintenanceCard item={activeItem} dragListeners={{}} /> : null}
          </DragOverlay>
        </DndContext>
      </BlurFade>

      <BlurFade delay={0.15} inView>
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
          <Wrench className="size-3" />
          Approving a card moves the asset to under maintenance, resolving returns it to available.
        </p>
      </BlurFade>
    </div>
  );
}
