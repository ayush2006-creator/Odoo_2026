/**
 * AssetsPage — Screen 4: Asset Registration & Directory.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, Plus, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { usePermissions } from '@/hooks/usePermissions';
import { ACTIONS } from '@/lib/permissions';
import { AssetRegistrationDialog } from './AssetRegistrationDialog';
import { getAssets } from '@/api/assets';

const FILTERS = ['Category', 'Status', 'Department'];

export default function AssetsPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { can } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadAssets() {
      try {
        const data = await getAssets();
        if (data) setAssets(data);
      } catch (err) {
        console.error('Failed to load assets:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAssets();
  }, [dialogOpen]); // Reload assets when registration dialog closes

  const filtered = assets.filter((a) =>
    a.tag.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.serialNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Assets" description="Register and manage all organization assets.">
        {can(ACTIONS.ASSET_CREATE) && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            Register Asset
          </Button>
        )}
      </PageHeader>

      <BlurFade delay={0.1} inView>
        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by tag, serial, or QR code..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f}
                variant={activeFilter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(activeFilter === f ? null : f)}
              >
                <SlidersHorizontal className="size-3 mr-1.5" />
                {f}
              </Button>
            ))}
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.2} inView>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((asset) => (
                  <TableRow
                    key={asset.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/allocations?asset=${asset.tag}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium text-primary">
                      {asset.tag}
                    </TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell className="text-muted-foreground">{asset.category}</TableCell>
                    <TableCell><StatusBadge status={asset.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{asset.location}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No assets found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </BlurFade>

      <AssetRegistrationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
