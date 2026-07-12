/**
 * DepartmentsTab — CRUD table for departments inside Org Setup.
 *
 * Columns: Name | Parent Department | Department Head | Status
 * Actions per row: Edit, Delete (via DropdownMenu).
 * Add / Edit dialog with name, parent dept, head inputs.
 */

import { useState, useEffect } from 'react';
import { MoreHorizontal, Pencil, Trash2, Info } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { usePermissions } from '@/hooks/usePermissions';
import { ACTIONS } from '@/lib/permissions';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const INITIAL_DEPARTMENTS = [
  { id: 1, name: 'Engineering',  parentDept: null,          head: 'Priya Shah', status: 'Active' },
  { id: 2, name: 'Facilities',   parentDept: null,          head: 'Arjun Rao',  status: 'Active' },
  { id: 3, name: 'Marketing',    parentDept: null,          head: '—',           status: 'Active' },
  { id: 4, name: 'HR',           parentDept: null,          head: 'Meera K',     status: 'Active' },
  { id: 5, name: 'Finance',      parentDept: 'Engineering', head: 'Ravi J',      status: 'Inactive' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DepartmentsTab({ addDialogOpen, onAddDialogClose }) {
  const { can } = usePermissions();
  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState({ name: '', parentDept: '', head: '' });

  // Open add dialog when triggered from parent
  useEffect(() => {
    if (addDialogOpen) {
      setEditingDept(null);
      setForm({ name: '', parentDept: '', head: '' });
      setDialogOpen(true);
    }
  }, [addDialogOpen]);

  const handleDialogClose = (open) => {
    if (!open) {
      setDialogOpen(false);
      onAddDialogClose?.();
    }
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      parentDept: dept.parentDept || '',
      head: dept.head === '—' ? '' : dept.head,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id) => {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;

    if (editingDept) {
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === editingDept.id
            ? { ...d, name: form.name, parentDept: form.parentDept || null, head: form.head || '—' }
            : d,
        ),
      );
    } else {
      const newDept = {
        id: Date.now(),
        name: form.name,
        parentDept: form.parentDept || null,
        head: form.head || '—',
        status: 'Active',
      };
      setDepartments((prev) => [...prev, newDept]);
    }

    setDialogOpen(false);
    onAddDialogClose?.();
  };

  const canEdit = can(ACTIONS.DEPARTMENT_EDIT);
  const canDelete = can(ACTIONS.DEPARTMENT_DELETE);
  const showActions = canEdit || canDelete;

  return (
    <div className="space-y-4 mt-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Parent Department</TableHead>
              <TableHead>Department Head</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {dept.parentDept || '—'}
                </TableCell>
                <TableCell>{dept.head}</TableCell>
                <TableCell>
                  <StatusBadge status={dept.status} />
                </TableCell>
                {showActions && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem onClick={() => handleEdit(dept)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(dept.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {departments.length === 0 && (
              <TableRow>
                <TableCell colSpan={showActions ? 5 : 4} className="h-24 text-center text-muted-foreground">
                  No departments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info text */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p>
          Departments define the organizational structure. Each department can have a parent department
          and a designated head who can approve transfers within their unit.
        </p>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDept ? 'Edit Department' : 'Add Department'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Department Name</Label>
              <Input
                id="dept-name"
                placeholder="e.g. Engineering"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-parent">Parent Department</Label>
              <Input
                id="dept-parent"
                placeholder="e.g. Engineering (optional)"
                value={form.parentDept}
                onChange={(e) => setForm((f) => ({ ...f, parentDept: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-head">Department Head</Label>
              <Input
                id="dept-head"
                placeholder="e.g. Priya Shah (optional)"
                value={form.head}
                onChange={(e) => setForm((f) => ({ ...f, head: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editingDept ? 'Save Changes' : 'Add Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
