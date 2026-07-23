import { getLabOrderDetails } from '@/app/actions/lab-result'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { ResultFormClient } from './result-form'
import { Button } from '@/components/ui/button'
import { getCurrentUserRole, hasAccess } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export default async function LabOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const order = await getLabOrderDetails(resolvedParams.id)

  const { role } = await getCurrentUserRole();
  const canVerify = hasAccess(role, 'lab', 'verify_lab');

  const hasVerifiedResults = (order.results || []).some((r: any) => r.status === 'verified');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/lab/orders" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Lab Order {order.orderNo}</h1>
        <Badge variant={order.status === 'completed' ? 'default' : 'outline'} className="ml-auto">
          {order.status.toUpperCase()}
        </Badge>
        {hasVerifiedResults && (
          <a 
            href={`/api/pdf/lab-report/${order.id}`} 
            download 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] bg-primary text-primary-foreground hover:bg-primary/80"
          >
            <FileText className="h-4 w-4" />
            Download PDF
          </a>
        )}
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs">Patient</span>
              <span className="font-medium text-base">{order.Patient?.name} ({order.Patient?.mrn})</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Doctor</span>
              <span className="font-medium">{order.Doctor?.user?.name || 'Self-Requested'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Ordered At</span>
              <span className="font-medium">{new Date(order.orderedAt).toLocaleString()}</span>
            </div>
            {order.notes && (
              <div>
                <span className="text-muted-foreground block text-xs">Notes</span>
                <span className="font-medium">{order.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <ResultFormClient order={order} canVerify={canVerify} />
        </div>
      </div>
    </div>
  )
}
