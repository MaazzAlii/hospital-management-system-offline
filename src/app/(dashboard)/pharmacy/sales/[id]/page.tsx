import { getSaleById } from "@/app/actions/sale";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Calendar, ShoppingBag, DollarSign, User } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pharmacy/sales">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sale #{sale.saleNo}</h1>
            <p className="text-sm text-muted-foreground">
              Created on {new Date(sale.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Link href={`/pharmacy/sales/${sale.id}/edit`}>
          <Button className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Sale
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer / Patient</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{patientName}</div>
            {sale.patient?.mrn && (
              <p className="text-xs text-muted-foreground mt-1">MRN: {sale.patient.mrn}</p>
            )}
            {sale.customerPhone && (
              <p className="text-xs text-muted-foreground">Phone: {sale.customerPhone}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Rs. {sale.totalAmount?.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Status:{" "}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  sale.status === "completed"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {sale.status}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sale Summary</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total Items: {sale.items?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Sold Medicines / Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 font-medium">
                  <th className="p-3 text-left">Medicine Name</th>
                  <th className="p-3 text-left">Batch No</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!sale.items || sale.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No item details recorded.
                    </td>
                  </tr>
                ) : (
                  sale.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="p-3 font-medium">{item.medicine?.name || "Unknown"}</td>
                      <td className="p-3 text-muted-foreground">{item.batchNo || "—"}</td>
                      <td className="p-3 text-right">{item.quantity}</td>
                      <td className="p-3 text-right">Rs. {item.unitPrice?.toFixed(2)}</td>
                      <td className="p-3 text-right font-medium">
                        Rs. {item.totalPrice?.toFixed(2)}
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
  );
}
