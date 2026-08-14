import { getSaleReturns } from '@/app/actions/return'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RotateCcw, Plus, Calendar, DollarSign, Package } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PharmacyReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const returns = await getSaleReturns(date)

  const totalRefund = returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0)
  const totalQtyReturned = returns.reduce((sum, r) => sum + (r.quantityReturned || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Sale Returns</h1>
          <p className="text-sm text-muted-foreground">
            Track and audit all pharmacy customer & distributor sales returns, reasons, and stock restorations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/pharmacy/returns/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Process New Return
            </Button>
          </Link>
        </div>
      </div>

      {/* Date Filter & Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Filter by Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form method="GET" className="space-y-2">
              <input
                type="date"
                name="date"
                defaultValue={date || ''}
                className="w-full text-xs rounded-md border border-input bg-background p-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="default" className="w-full text-xs h-7">
                  Apply Filter
                </Button>
                {date && (
                  <Link href="/pharmacy/returns" className="w-full">
                    <Button type="button" size="sm" variant="outline" className="w-full text-xs h-7">
                      Clear
                    </Button>
                  </Link>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Return Records</CardTitle>
            <RotateCcw className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returns.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {date ? `Filtered for ${new Date(date).toLocaleDateString()}` : 'All time recorded'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Quantity Restored</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQtyReturned} Units</div>
            <p className="text-[11px] text-muted-foreground mt-1">Added back to batch stock</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Refund Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">Rs {totalRefund.toFixed(2)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Refunded / credited amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Return Records Table */}
      <Card className="shadow-sm">
        <CardHeader className="bg-muted/20 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" />
            Daily Sale Return Records Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-y text-muted-foreground font-semibold">
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Sale No</th>
                  <th className="p-3 min-w-[150px]">Customer / Patient</th>
                  <th className="p-3 min-w-[180px]">Medicine Name</th>
                  <th className="p-3">Batch No</th>
                  <th className="p-3 text-right">Return Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Refund Amount</th>
                  <th className="p-3 min-w-[160px]">Return Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No sale returns found {date ? `for date ${date}` : 'in the system'}.
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground">
                        {new Date(ret.returnDate).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/pharmacy/sales/${ret.saleId}`}
                          className="font-mono font-medium text-primary hover:underline"
                        >
                          {ret.saleNo}
                        </Link>
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        {ret.patientName}
                        {ret.patientPhone !== '—' && (
                          <div className="text-[10px] text-muted-foreground">{ret.patientPhone}</div>
                        )}
                      </td>
                      <td className="p-3 font-medium">{ret.medicineName}</td>
                      <td className="p-3 font-mono text-muted-foreground">{ret.batchNo}</td>
                      <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                        {ret.quantityReturned}
                      </td>
                      <td className="p-3 text-right font-mono">Rs {ret.unitPrice.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        Rs {ret.refundAmount.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className="inline-block bg-muted px-2 py-0.5 rounded text-[11px] text-muted-foreground">
                          {ret.reason}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
