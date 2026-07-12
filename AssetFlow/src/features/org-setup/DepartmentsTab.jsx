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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { ACTIONS } from '@/lib/permissions';

import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/api/departments';
import { getEmployees } from '@/api/employees';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DepartmentsTab({ addDialogOpen, onAddDialogClose }) {
  const { can } = usePermissions();
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState({ name: '', parentDeptId: '', headId: '' });

  // Fetch departments and employees on mount
  useEffect(() => {
    async function loadData() {
      try {
        const depts = await getDepartments();
        if (depts) {
          if (Array.isArray(depts)) setDepartments(depts);
          else if (Array.isArray(depts.data)) setDepartments(depts.data);
        }

        const emps = await getEmployees();
        if (emps) {
          if (Array.isArray(emps)) setEmployees(emps);
          else if (Array.isArray(emps.data)) setEmployees(emps.data);
        }
      } catch (err) {
        console.error('Failed to load departments/employees data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [addDialogOpen]);

  // Open add dialog when triggered from parent
  useEffect(() => {
    if (addDialogOpen) {
      setEditingDept(null);
      setForm({ name: '', parentDeptId: '', headId: '' });
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
      parentDeptId: dept.parentDeptId || dept.parentDept || '',
      headId: dept.headId || dept.head || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDepartment(id);
      const depts = await getDepartments();
      if (depts) {
        if (Array.isArray(depts)) setDepartments(depts);
        else if (Array.isArray(depts.data)) setDepartments(depts.data);
      }
    } catch (err) {
      console.error('Failed to delete department:', err);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    const parentIdVal = form.parentDeptId ? parseInt(form.parentDeptId, 10) : null;
    const headIdVal = form.headId ? parseInt(form.headId, 10) : null;

    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, {
          name: form.name,
          parentDepartmentId: parentIdVal,
          departmentHeadId: headIdVal,
        });
      } else {
        await createDepartment({
          name: form.name,
          parentDepartmentId: parentIdVal,
          departmentHeadId: headIdVal,
        });
      }

      const depts = await getDepartments();
      if (depts) {
        if (Array.isArray(depts)) setDepartments(depts);
        else if (Array.isArray(depts.data)) setDepartments(depts.data);
      }

      setDialogOpen(false);
      onAddDialogClose?.();
    } catch (err) {
      console.error('Failed to save department details:', err);
    }
  };

  const canEdit = can(ACTIONS.DEPARTMENT_EDIT);
  const canDelete = can(ACTIONS.DEPARTMENT_DELETE);
  const showActions = canEdit || canDelete;

  const safeDepartments = Array.isArray(departments) ? departments : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

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
            {safeDepartments.map((dept) => {
              const parentId = dept.parentDeptId || dept.parentDept;
              const parentDeptName = parentId
                ? (safeDepartments.find(d => String(d.id) === String(parentId))?.name || `Dept #${parentId}`)
                : '—';
              const headId = dept.headId || dept.head;
              const headName = headId
                ? (safeEmployees.find(e => String(e.id) === String(headId))?.name || `Employee #${headId}`)
                : '—';

              return (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {parentDeptName}
                  </TableCell>
                  <TableCell>{headName}</TableCell>
                  <TableCell>
                    <StatusBadge status={dept.status} />
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
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
              );
            })}
            {safeDepartments.length === 0 && (
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
              <Label>Parent Department</Label>
              <Select
                value={form.parentDeptId ? String(form.parentDeptId) : 'none'}
                onValueChange={(val) => setForm(f => ({ ...f, parentDeptId: val === 'none' ? '' : val }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {form.parentDeptId ? (safeDepartments.find(d => String(d.id) === String(form.parentDeptId))?.name || 'None') : 'None'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {safeDepartments
                    .filter((d) => !editingDept || d.id !== editingDept.id) // Cannot be parent of itself
                    .map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {`${d.name}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department Head</Label>
              <Select
                value={form.headId ? String(form.headId) : 'none'}
                onValueChange={(val) => setForm(f => ({ ...f, headId: val === 'none' ? '' : val }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {form.headId ? (safeEmployees.find(e => String(e.id) === String(form.headId))?.name || 'None') : 'None'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {safeEmployees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {`${e.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
