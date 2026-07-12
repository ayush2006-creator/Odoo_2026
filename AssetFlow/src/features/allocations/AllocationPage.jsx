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
import { createTransfer, getTransfers, approveTransfer, rejectTransfer } from '@/api/transfers';
import { createAllocation, getAllocations, returnAllocation } from '@/api/allocations';
import { usePermissions } from '@/hooks/usePermissions';
import { ACTIONS } from '@/lib/permissions';

import { useCallback } from 'react';

export default function AllocationPage() {
  const [searchParams] = useSearchParams();
  const assetTag = searchParams.get('asset');

  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [transfers, setTransfers] = useState([]);
  
  const [toEmployee, setToEmployee] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const { can } = usePermissions();

  useEffect(() => {
    async function loadInitialData() {
      try {
        const empList = await getEmployees();
        if (empList) {
          if (Array.isArray(empList)) setEmployees(empList);
          else if (Array.isArray(empList.data)) setEmployees(empList.data);
        }

        const assetList = await getAssets();
        if (assetList) {
          const actualAssets = Array.isArray(assetList) ? assetList : (Array.isArray(assetList.data) ? assetList.data : []);
          setAssets(actualAssets);
          
          if (assetTag) {
            const matched = actualAssets.find(a => (a.tag === assetTag || a.assetTag === assetTag));
            if (matched) {
              setSelectedAsset(matched);
              return;
            }
          }
          if (actualAssets.length > 0) {
            setSelectedAsset(actualAssets[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load initial assets/employees:', err);
      }
    }
    loadInitialData();
  }, [assetTag]);

  useEffect(() => {
    async function loadHistory() {
      if (!selectedAsset) return;
      try {
        const hist = await getAssetAllocationHistory(selectedAsset.id);
        if (hist) {
          if (Array.isArray(hist)) setHistory(hist);
          else if (Array.isArray(hist.data)) setHistory(hist.data);
        }
      } catch (err) {
        console.error('Failed to load asset history:', err);
      }
    }
    loadHistory();
  }, [selectedAsset]);

  const loadTransfers = useCallback(async () => {
    if (!can(ACTIONS.TRANSFER_APPROVE)) return;
    try {
      const list = await getTransfers();
      if (list) {
        if (Array.isArray(list)) setTransfers(list);
        else if (Array.isArray(list.data)) setTransfers(list.data);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    }
  }, [can]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers, selectedAsset]);

  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeHistory = Array.isArray(history) ? history : [];
  const pendingTransfers = Array.isArray(transfers)
    ? transfers.filter(t => t && (t.status === 'Pending' || t.status === 'pending'))
    : [];

  const currentHolderName = selectedAsset?.currentHolderType === 'Employee' && selectedAsset?.currentHolderId
    ? (safeEmployees.find(e => String(e.id) === String(selectedAsset.currentHolderId))?.name || `Employee #${selectedAsset.currentHolderId}`)
    : 'None';

  const getEmployeeName = (id) => {
    return safeEmployees.find(e => String(e.id) === String(id))?.name || `Employee #${id}`;
  };

  const handleApproveTransfer = async (id) => {
    setSubmitting(true);
    setSuccessMsg('');
    try {
      await approveTransfer(id);
      setSuccessMsg('Transfer request approved and executed successfully!');
      await loadTransfers();
      if (selectedAsset) {
        const assetList = await getAssets();
        if (assetList) {
          setAssets(assetList);
          const updated = assetList.find(a => a.id === selectedAsset.id);
          if (updated) setSelectedAsset(updated);
        }
        const hist = await getAssetAllocationHistory(selectedAsset.id);
        if (hist) setHistory(hist);
      }
    } catch (err) {
      console.error('Failed to approve transfer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectTransfer = async (id) => {
    setSubmitting(true);
    setSuccessMsg('');
    try {
      await rejectTransfer(id);
      setSuccessMsg('Transfer request rejected successfully.');
      await loadTransfers();
    } catch (err) {
      console.error('Failed to reject transfer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!toEmployee || !selectedAsset) return;
    
    setSubmitting(true);
    setSuccessMsg('');
    try {
      if (can(ACTIONS.ALLOCATION_CREATE)) {
        // Direct transfer/allocation workflow for Admins
        try {
          const list = await getAllocations();
          const safeList = Array.isArray(list) ? list : (list && Array.isArray(list.data) ? list.data : []);
          const active = safeList.find(al => al.assetId === selectedAsset.id && (al.status?.toLowerCase() === 'active' || al.status?.toLowerCase() === 'allocated'));
          
          if (active) {
            await returnAllocation(active.id, { conditionCheckInNotes: 'Automatic release for direct admin transfer.' });
          }
        } catch (err) {
          console.warn('Auto-return step skipped or failed:', err);
        }

        await createAllocation({
          assetId: selectedAsset.id,
          holderType: 'Employee',
          holderId: String(toEmployee)
        });

        setSuccessMsg('Asset allocated and transferred directly!');
      } else {
        // Standard Employee request workflow
        await createTransfer({
          assetId: selectedAsset.id,
          fromHolderId: selectedAsset.currentHolderId || 1, 
          toHolderId: parseInt(toEmployee, 10),
          reason
        });
        setSuccessMsg('Transfer request submitted successfully!');
      }

      setToEmployee('');
      setReason('');
      
      // Reload assets list to sync current status & holder
      const assetList = await getAssets();
      if (assetList) {
        const actualAssets = Array.isArray(assetList) ? assetList : (Array.isArray(assetList.data) ? assetList.data : []);
        setAssets(actualAssets);
        const updated = actualAssets.find(a => a.id === selectedAsset.id);
        if (updated) setSelectedAsset(updated);
      }

      // Reload history log
      const hist = await getAssetAllocationHistory(selectedAsset.id);
      if (hist) {
        if (Array.isArray(hist)) setHistory(hist);
        else if (Array.isArray(hist.data)) setHistory(hist.data);
      }

      await loadTransfers();
    } catch (err) {
      console.error('Failed to execute transfer/allocation:', err);
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

      {/* Asset Selector */}
      <BlurFade delay={0.05} inView>
        <Card>
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Package className="size-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Select Asset for Allocation & Transfer</p>
              <Select
                value={selectedAsset ? String(selectedAsset.id) : ''}
                onValueChange={(val) => {
                  const found = safeAssets.find(a => String(a.id) === val);
                  if (found) setSelectedAsset(found);
                }}
              >
                <SelectTrigger className="w-full max-w-md font-semibold text-sm h-10">
                  <SelectValue>
                    {selectedAsset ? `${selectedAsset.name} (${selectedAsset.tag || selectedAsset.assetTag || `AF-${selectedAsset.id}`})` : 'No assets available'}
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
            {selectedAsset && (
              <div className="sm:ml-auto">
                <StatusBadge status={selectedAsset.status} />
              </div>
            )}
          </CardContent>
        </Card>
      </BlurFade>

      {/* Conflict Alert */}
      {selectedAsset?.status === 'Allocated' && (
        <BlurFade delay={0.1} inView>
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
            <AlertTriangle className="size-4" />
            <AlertTitle>Already Allocated</AlertTitle>
            <AlertDescription>
              Currently allocated to <span className="font-semibold">{currentHolderName}</span>.
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
              {can(ACTIONS.ALLOCATION_CREATE) ? 'Direct Allocation & Transfer (Admin)' : 'Transfer Request'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input value={currentHolderName} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Select value={toEmployee} onValueChange={setToEmployee}>
                    <SelectTrigger>
                      <SelectValue>
                        {toEmployee ? (safeEmployees.find(e => String(e.id) === toEmployee)?.name || 'Select Employee...') : 'Select Employee...'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {safeEmployees.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {`${e.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!can(ACTIONS.ALLOCATION_CREATE) && (
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    placeholder="Why is this transfer needed?"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
              <Button type="submit" disabled={!toEmployee || submitting}>
                <Send className="size-4 mr-2" />
                {submitting ? 'Processing...' : (can(ACTIONS.ALLOCATION_CREATE) ? 'Execute Direct Transfer' : 'Submit Request')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Administrative Approval Control Panel */}
      {can(ACTIONS.TRANSFER_APPROVE) && pendingTransfers.length > 0 && (
        <BlurFade delay={0.18} inView>
          <Card className="border-t-2 border-t-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRight className="size-4 text-primary" />
                Pending Transfer Approvals (Admin)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingTransfers.map((req) => {
                const isCurrent = selectedAsset && req.assetId === selectedAsset.id;
                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      isCurrent
                        ? 'bg-primary/5 border-primary/30'
                        : 'border-border/60 bg-card'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-mono text-xs font-semibold text-primary">
                          {req.asset?.assetTag || req.asset?.tag || `Asset #${req.assetId}`}
                        </span>
                        <h4 className="text-sm font-semibold mb-1">
                          {req.asset?.name || 'Asset Transfer'}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          From: <span className="font-medium text-foreground">{getEmployeeName(req.fromHolderId)}</span>{' '}
                          → To: <span className="font-medium text-foreground">{getEmployeeName(req.toHolderId)}</span>
                        </p>
                        {req.reason && (
                          <p className="text-xs italic text-muted-foreground mt-1">
                            Reason: "{req.reason}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10"
                          onClick={() => handleRejectTransfer(req.id)}
                          disabled={submitting}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApproveTransfer(req.id)}
                          disabled={submitting}
                        >
                          Approve & Execute
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </BlurFade>
      )}

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
              {safeHistory.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-3 border-l-2 border-primary/20 pl-4 ml-2 relative"
                >
                  <div className="absolute -left-[5px] top-4 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.action || item.notes || 'Asset Transfer'}</p>
                    <p className="text-xs text-muted-foreground">{item.dept || item.details || ''}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '')}
                  </span>
                </div>
              ))}
              {safeHistory.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No allocation history available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  );
}


