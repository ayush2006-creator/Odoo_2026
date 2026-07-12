/**
 * EmployeesTab — read-only table of employees inside Org Setup.
 *
 * Columns: Name | Email | Department | Role | Status
 * Role column: inline Select for role change (only if user can EMPLOYEE_CHANGE_ROLE).
 * No add/edit dialog — employee creation is handled elsewhere;
 * this tab lets admins change roles and view the roster.
 */

import { useState, useEffect } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ROLES, ROLE_LABELS } from '@/lib/roles';

import { getEmployees } from '@/api/employees';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmployeesTab({ addDialogOpen, onAddDialogClose }) {
  const { can } = usePermissions();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', department: '', role: ROLES.EMPLOYEE });

  // Fetch employees on mount
  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await getEmployees();
        if (data) setEmployees(data);
      } catch (err) {
        console.error('Failed to load employees:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEmployees();
  }, [addDialogOpen]);

  const canChangeRole = can(ACTIONS.EMPLOYEE_CHANGE_ROLE);
  const canEdit = can(ACTIONS.EMPLOYEE_EDIT);

  // Open add dialog when triggered from parent
  useEffect(() => {
    if (addDialogOpen) {
      setEditingEmp(null);
      setForm({ name: '', email: '', department: '', role: ROLES.EMPLOYEE });
      setDialogOpen(true);
    }
  }, [addDialogOpen]);

  const handleDialogClose = (open) => {
    if (!open) {
      setDialogOpen(false);
      onAddDialogClose?.();
    }
  };

  const handleEdit = (emp) => {
    setEditingEmp(emp);
    setForm({
      name: emp.name,
      email: emp.email,
      department: emp.department,
      role: emp.role,
    });
    setDialogOpen(true);
  };

  const handleRoleChange = (employeeId, newRole) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, role: newRole } : e)),
    );
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;

    if (editingEmp) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === editingEmp.id
            ? { ...e, name: form.name, email: form.email, department: form.department, role: form.role }
            : e,
        ),
      );
    } else {
      const newEmp = {
        id: Date.now(),
        name: form.name,
        email: form.email,
        department: form.department,
        role: form.role,
        status: 'Active',
      };
      setEmployees((prev) => [...prev, newEmp]);
    }

    setDialogOpen(false);
    onAddDialogClose?.();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                <TableCell>{emp.department}</TableCell>
                <TableCell>
                  {canChangeRole ? (
                    <Select
                      value={emp.role}
                      onValueChange={(value) => handleRoleChange(emp.id, value)}
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm">{ROLE_LABELS[emp.role] || emp.role}</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={emp.status} />
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(emp)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="h-24 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEmp ? 'Edit Employee' : 'Add Employee'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="emp-name">Name</Label>
              <Input
                id="emp-name"
                placeholder="e.g. Priya Shah"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emp-email">Email</Label>
              <Input
                id="emp-email"
                type="email"
                placeholder="e.g. priya@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emp-department">Department</Label>
              <Input
                id="emp-department"
                placeholder="e.g. Engineering"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emp-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => setForm((f) => ({ ...f, role: value }))}
              >
                <SelectTrigger id="emp-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
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
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.email.trim()}>
              {editingEmp ? 'Save Changes' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
