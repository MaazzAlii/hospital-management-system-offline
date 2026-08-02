import { getExpiringItems } from '@/app/actions/expiry'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ExpiryReportPage() {
  const items = await getExpiringItems()
  const today = new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Expiry Report</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Items Expiring Soon (Next 30 Days) or Expired
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-6 border-b p-4 font-medium bg-muted/50">
              <div className="col-span-2">Medicine</div>
              <div>Batch No</div>
              <div>Expiry Date</div>
              <div>Status</div>
              <div>Purchase Ref</div>
            </div>
            <div className="divide-y">
              {items.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Clock className="h-8 w-8 text-muted-foreground/50" />
                  No expiring batches found.
                </div>
              ) : (
                items.map((item: any) => {
                  const expiry = item.expiryDate ? new Date(item.expiryDate) : new Date();
                  const isExpired = expiry < today;
                  const medicineName = item.medicine?.name || item.Medicine?.name || 'Unknown';
                  const purchaseNo = item.purchase?.purchaseNo || item.Purchase?.purchaseNo || '—';

                  return (
                    <div key={item.id} className="grid grid-cols-6 items-center p-4">
                      <div className="col-span-2 font-medium">
                        {medicineName}
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          (Qty: {item.quantity})
                        </span>
                      </div>
                      <div>{item.batchNo || '—'}</div>
                      <div className={isExpired ? 'text-destructive font-medium' : ''}>
                        {expiry.toLocaleDateString()}
                      </div>
                      <div>
                        {isExpired ? (
                          <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                            Expiring Soon
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {purchaseNo}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
