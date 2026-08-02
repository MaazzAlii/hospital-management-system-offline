import { getPurchaseById } from "@/app/actions/purchase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Calendar, Package, DollarSign, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PurchaseViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const purchase = await getPurchaseById(id);

  if (!purchase) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pharmacy/purchases">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Purchase #{purchase.purchaseNo}</h1>
            <p className="text-sm text-muted-foreground">
              Created on {new Date(purchase.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Link href={`/pharmacy/purchases/${purchase.id}/edit`}>
          <Button className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Purchase
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supplier</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {purchase.supplier?.name || "Unknown Supplier"}
            </div>
            {purchase.supplier?.phone && (
              <p className="text-xs text-muted-foreground mt-1">
                Phone: {purchase.supplier.phone}
              </p>
            )}
            {purchase.supplier?.email && (
              <p className="text-xs text-muted-foreground">
                Email: {purchase.supplier.email}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Rs. {purchase.totalAmount?.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Status:{" "}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  purchase.status === "completed"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {purchase.status}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Date & Items</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {new Date(purchase.purchaseDate || purchase.createdAt).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total Items: {purchase.items?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {purchase.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{purchase.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Purchased Medicines / Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 font-medium">
                  <th className="p-3 text-left">Medicine Name</th>
                  <th className="p-3 text-left">Batch No</th>
                  <th className="p-3 text-left">Expiry Date</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!purchase.items || purchase.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                      No item details recorded.
                    </td>
                  </tr>
                ) : (
                  purchase.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="p-3 font-medium">{item.medicine?.name || "Unknown"}</td>
                      <td className="p-3 text-muted-foreground">{item.batchNo || "—"}</td>
                      <td className="p-3 text-muted-foreground">
                        {item.expiryDate
                          ? new Date(item.expiryDate).toLocaleDateString()
                          : "—"}
                      </td>
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
