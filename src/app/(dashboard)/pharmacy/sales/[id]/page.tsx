import { getSaleById } from "@/app/actions/sale";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ShoppingBag,
  DollarSign,
  User,
  Printer,
  RotateCcw,
  Building2,
  FileText,
  Truck,
  BadgePercent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SaleViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getSaleById(id);

  if (!sale) {
    notFound();
  }

  const patientName = sale.patient?.name || sale.customerName || "Walk-in Customer";
  const items = sale.items || [];

  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalFree = items.reduce((s, i) => s + (i.freeQty || 0), 0);
  const totalGross = items.reduce((s, i) => s + (i.grossAmount || ((i.tradePrice || i.unitPrice || 0) * (i.quantity || 0))), 0);
  const totalDiscount = items.reduce((s, i) => s + (i.discountAmount || 0), 0);
  const totalTax = items.reduce((s, i) => s + ((i.sTax || 0) + (i.gst || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/pharmacy/sales">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Invoice #{sale.saleNo}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  sale.status === "completed"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    : sale.status === "returned"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {sale.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Invoice Date: {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()} | Created:{" "}
              {new Date(sale.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/api/pdf/invoice/${sale.id}`} target="_blank">
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4 text-primary" />
              Print / PDF Invoice
            </Button>
          </Link>
          <Link href="/pharmacy/returns/new">
            <Button variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4 text-amber-600" />
              Process Return
            </Button>
          </Link>
        </div>
      </div>

      {/* Header Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer / Buyer Information */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Customer / Buyer Details
            </CardTitle>
            {sale.accountCode && (
              <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                {sale.accountCode}
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-1.5 text-xs">
            <div className="text-sm font-bold text-foreground">{patientName}</div>
            {sale.patient?.mrn && (
              <p className="text-muted-foreground">MRN: <span className="font-mono">{sale.patient.mrn}</span></p>
            )}
            {sale.customerPhone && (
              <p className="text-muted-foreground">Phone: <span className="font-medium">{sale.customerPhone}</span></p>
            )}
            {sale.customerAddress && (
              <p className="text-muted-foreground">Address: <span className="font-medium">{sale.customerAddress}</span></p>
            )}
            {sale.licenseNo && (
              <p className="text-muted-foreground">Drug License: <span className="font-mono">{sale.licenseNo}</span></p>
            )}
            {sale.ntn && (
              <p className="text-muted-foreground">NTN: <span className="font-mono">{sale.ntn}</span></p>
            )}
          </CardContent>
        </Card>

        {/* Distributor / Order Logistics Information */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Distributor & Order Details
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4 space-y-1.5 text-xs">
            <p className="text-muted-foreground">
              Supplied By: <span className="font-semibold text-foreground">{sale.suppliedBy || "Life Care Pharmacy"}</span>
            </p>
            {sale.summaryPrsNo && (
              <p className="text-muted-foreground">
                PRS / Summary No: <span className="font-mono font-medium">{sale.summaryPrsNo}</span>
              </p>
            )}
            {sale.bookedBy && (
              <p className="text-muted-foreground">
                Order Booker: <span className="font-medium">{sale.bookedBy}</span>
              </p>
            )}
            {sale.salesmanMobile && (
              <p className="text-muted-foreground">
                Salesman Phone: <span className="font-medium">{sale.salesmanMobile}</span>
              </p>
            )}
            {sale.territory && (
              <p className="text-muted-foreground">
                Territory: <span className="font-medium">{sale.territory}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Financial Summary
            </CardTitle>
            <BadgePercent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Total:</span>
              <span className="font-mono">Rs {totalGross.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Discount:</span>
              <span className="font-mono">- Rs {totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Tax (STax + GST):</span>
              <span className="font-mono">Rs {totalTax.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center text-sm font-bold text-primary">
              <span>Net Amount:</span>
              <span className="text-lg font-mono">Rs {Number(sale.totalAmount || 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card className="shadow-sm">
        <CardHeader className="bg-muted/20 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Distributor Invoice Products & Batches
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-y text-muted-foreground font-semibold">
                  <th className="p-3">#</th>
                  <th className="p-3 min-w-[200px]">Product / Medicine</th>
                  <th className="p-3 min-w-[130px]">Batch No</th>
                  <th className="p-3 min-w-[100px]">Expiry Date</th>
                  <th className="p-3 text-right">Billed Qty</th>
                  <th className="p-3 text-right">Free Qty</th>
                  <th className="p-3 text-right">Trade Price</th>
                  <th className="p-3 text-right">Gross (Rs)</th>
                  <th className="p-3 text-right">Disc (Rs)</th>
                  <th className="p-3 text-right">Tax (Rs)</th>
                  <th className="p-3 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-muted-foreground">
                      No item details recorded for this sale.
                    </td>
                  </tr>
                ) : (
                  items.map((item: any, idx: number) => {
                    const price = item.tradePrice ?? item.unitPrice ?? 0;
                    const gross = item.grossAmount ?? (price * item.quantity);
                    const disc = item.discountAmount ?? 0;
                    const tax = (item.sTax || 0) + (item.gst || 0);
                    const net = item.netAmount ?? item.totalPrice ?? (gross - disc + tax);
                    const expStr = item.expiryDate
                      ? new Date(item.expiryDate).toLocaleDateString()
                      : item.batch?.expiryDate
                      ? new Date(item.batch.expiryDate).toLocaleDateString()
                      : "—";

                    return (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="p-3 font-semibold text-foreground">
                          {item.medicine?.name || "Unknown Medicine"}
                          {item.medicine?.unit && (
                            <span className="text-[10px] text-muted-foreground font-normal ml-1">
                              ({item.medicine.unit})
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-medium text-primary">
                          {item.batchNo || item.batch?.batchNo || "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">{expStr}</td>
                        <td className="p-3 text-right font-medium">{item.quantity}</td>
                        <td className="p-3 text-right text-muted-foreground">
                          {item.freeQty || 0}
                        </td>
                        <td className="p-3 text-right font-mono">Rs {price.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono">Rs {gross.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {disc > 0 ? `- Rs ${disc.toFixed(2)}` : "0.00"}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {tax > 0 ? `Rs ${tax.toFixed(2)}` : "0.00"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          Rs {net.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Invoice Summary Footer */}
          <div className="p-4 bg-muted/20 border-t flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="text-muted-foreground">
              Total Billed Quantity: <span className="font-semibold text-foreground">{totalQty}</span> | Free:{" "}
              <span className="font-semibold text-foreground">{totalFree}</span> | Line Items:{" "}
              <span className="font-semibold text-foreground">{items.length}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium text-muted-foreground">Grand Total:</span>
              <span className="text-lg font-bold font-mono text-primary">
                Rs {Number(sale.totalAmount || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
