import { getPurchases } from '@/app/actions/purchase'
import { Plus, Eye, Edit } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function PurchasesPage() {
  const purchases = await getPurchases()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
        <Link href="/pharmacy/purchases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-6 border-b p-4 font-medium bg-muted/50">
              <div>Purchase No</div>
              <div>Supplier</div>
              <div>Date</div>
              <div>Total Amount</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y">
              {purchases?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No purchases found
                </div>
              ) : (
                purchases?.map((purchase: any) => (
                  <div key={purchase.id} className="grid grid-cols-6 items-center p-4">
                    <div className="font-medium">{purchase.purchaseNo}</div>
                    <div>{purchase.supplier?.name || purchase.Supplier?.name || 'Unknown'}</div>
                    <div>{new Date(purchase.createdAt || new Date()).toLocaleDateString()}</div>
                    <div>Rs {purchase.totalAmount?.toFixed(2)}</div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        purchase.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {purchase.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/pharmacy/purchases/${purchase.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/pharmacy/purchases/${purchase.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
