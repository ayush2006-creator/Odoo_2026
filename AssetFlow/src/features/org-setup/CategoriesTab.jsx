/**
 * CategoriesTab — CRUD table for asset categories inside Org Setup.
 *
 * Columns: Category Name | Custom Fields | Status
 * Actions per row: Edit, Delete (via DropdownMenu).
 * Add / Edit dialog with category name and custom fields inputs.
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

import { getAssetCategories, createAssetCategory, updateAssetCategory, deleteAssetCategory } from '@/api/assetCategories';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CategoriesTab({ addDialogOpen, onAddDialogClose }) {
  const { can } = usePermissions();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState({ name: '', customFields: '' });

  // Fetch categories on mount
  useEffect(() => {
    async function loadCats() {
      try {
        const data = await getAssetCategories();
        if (data) {
          if (Array.isArray(data)) setCategories(data);
          else if (Array.isArray(data.data)) setCategories(data.data);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCats();
  }, [addDialogOpen]);

  // Open add dialog when triggered from parent
  useEffect(() => {
    if (addDialogOpen) {
      setEditingCat(null);
      setForm({ name: '', customFields: '' });
      setDialogOpen(true);
    }
  }, [addDialogOpen]);

  const handleDialogClose = (open) => {
    if (!open) {
      setDialogOpen(false);
      onAddDialogClose?.();
    }
  };

  const formatCustomFields = (fields) => {
    if (!fields) return '—';
    if (typeof fields === 'string') return fields === '—' ? '—' : fields;
    if (typeof fields === 'object') {
      const keys = Object.keys(fields);
      if (keys.length === 0) return '—';
      return keys.map(k => `${k} (${fields[k]})`).join(', ');
    }
    return '—';
  };

  const getCustomFieldsEditLabel = (fields) => {
    if (!fields) return '';
    if (typeof fields === 'string') return fields === '—' ? '' : fields;
    return JSON.stringify(fields);
  };

  const handleEdit = (cat) => {
    setEditingCat(cat);
    setForm({
      name: cat.name,
      customFields: getCustomFieldsEditLabel(cat.customFields || cat.customFields),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteAssetCategory(id);
      const data = await getAssetCategories();
      if (data) {
        if (Array.isArray(data)) setCategories(data);
        else if (Array.isArray(data.data)) setCategories(data.data);
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    // Parse custom fields: they can enter comma-separated list of fields (which we format as object with "string" type)
    // or enter a valid JSON string.
    let customFieldsObj = {};
    if (form.customFields.trim()) {
      try {
        if (form.customFields.trim().startsWith('{')) {
          customFieldsObj = JSON.parse(form.customFields);
        } else {
          // e.g. "warranty_months, processor" -> {"warranty_months": "string", "processor": "string"}
          form.customFields.split(',').forEach((field) => {
            const name = field.trim();
            if (name) customFieldsObj[name] = 'string';
          });
        }
      } catch (err) {
        console.warn('Failed to parse custom fields JSON, using raw fallback:', err);
        customFieldsObj = { [form.customFields.trim()]: 'string' };
      }
    }

    try {
      if (editingCat) {
        await updateAssetCategory(editingCat.id, {
          name: form.name,
          customFields: customFieldsObj,
        });
      } else {
        await createAssetCategory({
          name: form.name,
          customFields: customFieldsObj,
        });
      }

      const data = await getAssetCategories();
      if (data) {
        if (Array.isArray(data)) setCategories(data);
        else if (Array.isArray(data.data)) setCategories(data.data);
      }

      setDialogOpen(false);
      onAddDialogClose?.();
    } catch (err) {
      console.error('Failed to save category:', err);
    }
  };

  const canEdit = can(ACTIONS.CATEGORY_EDIT);
  const canDelete = can(ACTIONS.CATEGORY_DELETE);
  const showActions = canEdit || canDelete;

  return (
    <div className="space-y-4 mt-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead>Custom Fields</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(Array.isArray(categories) ? categories : []).map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="text-muted-foreground">{formatCustomFields(cat.customFields || cat.customFields)}</TableCell>
                <TableCell>
                  <StatusBadge status={cat.status} />
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
                          <DropdownMenuItem onClick={() => handleEdit(cat)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(cat.id)}
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
            {(Array.isArray(categories) ? categories : []).length === 0 && (
              <TableRow>
                <TableCell colSpan={showActions ? 4 : 3} className="h-24 text-center text-muted-foreground">
                  No categories found.
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
              {editingCat ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Electronics"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-fields">Custom Fields</Label>
              <Input
                id="cat-fields"
                placeholder="e.g. Warranty Period (optional)"
                value={form.customFields}
                onChange={(e) => setForm((f) => ({ ...f, customFields: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editingCat ? 'Save Changes' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
