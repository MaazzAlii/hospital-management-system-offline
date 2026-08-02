import { getSales } from '@/app/actions/sale'
import { Plus, Eye, Edit } from 'lucide-react'
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
            <div className="grid grid-cols-6 border-b p-4 font-medium bg-muted/50">
              <div>Sale No</div>
              <div>Patient</div>
              <div>Date</div>
              <div>Total Amount</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y">
              {sales?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No sales found
                </div>
              ) : (
                sales?.map((sale: any) => {
                  const patientName =
                    sale.patient?.name ||
                    (sale.patient?.firstName ? `${sale.patient.firstName} ${sale.patient.lastName || ''}`.trim() : null) ||
                    (sale.Patient?.name) ||
                    (sale.Patient?.firstName ? `${sale.Patient.firstName} ${sale.Patient.lastName || ''}`.trim() : null) ||
                    sale.customerName;

                  return (
                    <div key={sale.id} className="grid grid-cols-6 items-center p-4">
                      <div className="font-medium">{sale.saleNo}</div>
                      <div>
                        {patientName ? (
                          <span>{patientName}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Walk-in</span>
                        )}
                      </div>
                      <div>{new Date(sale.createdAt || new Date()).toLocaleDateString()}</div>
                      <div>Rs {Number(sale.totalAmount || 0).toFixed(2)}</div>
                      <div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          sale.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sale.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/pharmacy/sales/${sale.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/pharmacy/sales/${sale.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </Link>
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
