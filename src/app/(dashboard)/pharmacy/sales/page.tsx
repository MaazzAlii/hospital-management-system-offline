import { getSales } from '@/app/actions/sale'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function SalesPage() {
  const sales = await getSales()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
        <Link href="/pharmacy/sales/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Sale
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-5 border-b p-4 font-medium bg-muted/50">
              <div>Sale No</div>
              <div>Patient</div>
              <div>Date</div>
              <div>Total Amount</div>
              <div>Status</div>
            </div>
            <div className="divide-y">
              {sales?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No sales found
                </div>
              ) : (
                sales?.map((sale: any) => (
                  <div key={sale.id} className="grid grid-cols-5 items-center p-4">
                    <div className="font-medium">{sale.saleNo}</div>
                    <div>
                      {sale.Patient ? (
                        <span>
                          {sale.Patient.firstName} {sale.Patient.lastName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Walk-in</span>
                      )}
                    </div>
                    <div>{new Date(sale.createdAt || new Date()).toLocaleDateString()}</div>
                    <div>Rs {sale.totalAmount?.toFixed(2)}</div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        sale.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sale.status}
                      </span>
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
