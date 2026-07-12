/**
 * AuditPage — Screen 8: Audit cycle checklist & discrepancy report.
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BlurFade } from '@/components/ui/blur-fade';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getAuditCycles, getAuditItems, getDiscrepancies } from '@/api/auditCycles';

const AUDITORS = [
  { initials: 'S', name: 'Suresh' },
  { initials: 'K', name: 'Kya' },
  { initials: 'G', name: 'Geeta' },
  { initials: 'L', name: 'Leela' },
];

export default function AuditPage() {
  const [cycle, setCycle] = useState({ name: 'Q3 Audit: Engineering Dept', dateRangeStart: '1 Feb', dateRangeEnd: '28 Jul' });
  const [items, setItems] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAuditData() {
      try {
        const cycles = await getAuditCycles();
        if (cycles && cycles.length > 0) {
          const activeCycle = cycles[0];
          setCycle({
            name: activeCycle.name,
            dateRangeStart: activeCycle.dateRangeStart,
            dateRangeEnd: activeCycle.dateRangeEnd
          });

          const auditItems = await getAuditItems(activeCycle.id);
          if (auditItems) setItems(auditItems);

          const disc = await getDiscrepancies(activeCycle.id);
          if (disc) setDiscrepancies(disc);
        }
      } catch (err) {
        console.error('Failed to load audit cycle items:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAuditData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit" description="Manage audit cycles and verify asset inventory." />

      {/* Audit Cycle Info */}
      <BlurFade delay={0.05} inView>
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">{cycle.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {cycle.dateRangeStart} to {cycle.dateRangeEnd}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Auditors:</span>
                <div className="flex -space-x-2">
                  {AUDITORS.map((a) => (
                    <Avatar key={a.initials} className="h-8 w-8 border-2 border-background">
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                        {a.initials}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Checklist Table */}
      <BlurFade delay={0.1} inView>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="size-4 text-primary" />
              Verification Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Expected Location</TableHead>
                  <TableHead>Verification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.tag}>
                    <TableCell>
                      <div>
                        <span className="font-mono text-xs text-primary font-semibold">{item.tag}</span>
                        <p className="text-sm font-medium">{item.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.location}</TableCell>
                    <TableCell><StatusBadge status={item.result} /></TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      No audit checklist items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Discrepancy Alert */}
      {discrepancies.length > 0 && (
        <BlurFade delay={0.15} inView>
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="size-4 text-amber-600" />
            <AlertTitle className="text-amber-700 dark:text-amber-400">Discrepancies Found</AlertTitle>
            <AlertDescription className="text-amber-600 dark:text-amber-300">
              {discrepancies.length} assets flagged — discrepancy report generated automatically.
            </AlertDescription>
          </Alert>
        </BlurFade>
      )}

      <BlurFade delay={0.2} inView>
        <div className="flex justify-end">
          <Button variant="destructive">Close Audit Cycle</Button>
        </div>
      </BlurFade>
    </div>
  );
}
