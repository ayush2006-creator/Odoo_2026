/**
 * AllocationPage — Screen 5: Asset Allocation & Transfer.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { AlertTriangle, Send, History, Package, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getEmployees } from '@/api/employees';
import { getAssets, getAssetAllocationHistory } from '@/api/assets';
import { createTransfer } from '@/api/transfers';

export default function AllocationPage() {
  const [searchParams] = useSearchParams();
  const assetTag = searchParams.get('asset') || 'AF-0076';

  const [asset, setAsset] = useState({ id: 'asset-76', tag: assetTag, name: 'Dell Laptop', status: 'Allocated', currentHolder: 'Priya Shah' });
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  
  const [toEmployee, setToEmployee] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch asset matching the tag
        const assetList = await getAssets({ tag: assetTag });
        if (assetList && assetList.length > 0) {
          setAsset(assetList[0]);
          
          // Load allocation history for that asset
          const hist = await getAssetAllocationHistory(assetList[0].id);
          if (hist) setHistory(hist);
        }

        // Fetch employee list for transfer target selector
        const empList = await getEmployees();
        if (empList) setEmployees(empList);
      } catch (err) {
        console.error('Failed to load allocation/employee data:', err);
      }
    }
    loadData();
  }, [assetTag]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!toEmployee) return;
    
    setSubmitting(true);
    setSuccessMsg('');
    try {
      await createTransfer({
        assetId: asset.id,
        fromHolderId: asset.currentHolderId || 'e-1', // Default Priya Shah id
        toHolderId: toEmployee,
        reason
      });
      setSuccessMsg('Transfer request submitted successfully!');
      setToEmployee('');
      setReason('');
    } catch (err) {
      console.error('Failed to submit transfer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Allocation & Transfer" description="Manage asset allocations and transfer requests." />

      {successMsg && (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <AlertDescription className="text-emerald-600 dark:text-emerald-400">
            {successMsg}
          </AlertDescription>
        </Alert>
      )}

      {/* Asset Info */}
      <BlurFade delay={0.05} inView>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Package className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Asset</p>
              <p className="font-semibold text-lg">{asset.tag} — {asset.name}</p>
            </div>
            <div className="ml-auto">
              <StatusBadge status={asset.status} />
            </div>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Conflict Alert */}
      {asset.status === 'Allocated' && (
        <BlurFade delay={0.1} inView>
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
            <AlertTriangle className="size-4" />
            <AlertTitle>Already Allocated</AlertTitle>
            <AlertDescription>
              Currently allocated to <span className="font-semibold">{asset.currentHolder || 'Priya Shah'}</span>.
              Asset must be returned or submit a transfer request below.
            </AlertDescription>
          </Alert>
        </BlurFade>
      )}

      {/* Transfer Request Form */}
      <BlurFade delay={0.15} inView>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="size-4 text-primary" />
              Transfer Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input value={asset.currentHolder || 'Priya Shah'} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Select value={toEmployee} onValueChange={setToEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name} ({e.department})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Why is this transfer needed?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={!toEmployee || submitting}>
                <Send className="size-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Allocation History */}
      <BlurFade delay={0.2} inView>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="size-4 text-primary" />
              Allocation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {history.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-3 border-l-2 border-primary/20 pl-4 ml-2 relative"
                >
                  <div className="absolute -left-[5px] top-4 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.dept}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.date}</span>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No allocation history available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  );
}


