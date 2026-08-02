import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck, Pencil, Phone, Mail, MapPin, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupplierById } from "@/app/actions/supplier";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await getSupplierById(id);

  if (!supplier) {
    notFound();
  }

  // Fetch recent purchases from this supplier
  const purchases = await prisma.purchase.findMany({
    where: { supplierId: id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <Link
          href="/pharmacy/suppliers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suppliers
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{supplier.name}</h1>
              <p className="text-sm text-muted-foreground">
                Registered on {new Date(supplier.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Link href={`/pharmacy/suppliers/${supplier.id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit Supplier
            </Button>
          </Link>
        </div>
      </div>

      {/* Supplier Profile Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b pb-2">Contact Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <UserCheck className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Contact Person</p>
                <p className="font-medium text-foreground">{supplier.contactPerson || "Not provided"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <p className="font-medium text-foreground">{supplier.phone || "Not provided"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Email Address</p>
                <p className="font-medium text-foreground">{supplier.email || "Not provided"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium text-foreground">{supplier.address || "Not provided"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b pb-2">Recent Purchases</h2>
          {purchases.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No purchase orders created for this supplier yet.
            </p>
          ) : (
            <div className="space-y-2">
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                  <div>
                    <span className="font-mono font-medium text-primary">{p.purchaseNo}</span>
                    <p className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">Rs. {p.totalAmount.toLocaleString()}</p>
                    <span className="capitalize text-success font-medium">{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
