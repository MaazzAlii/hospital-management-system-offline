import { getPurchaseById } from "@/app/actions/purchase";
import { getSuppliers } from "@/app/actions/supplier";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PurchaseEditForm from "./form";

export const dynamic = "force-dynamic";

export default async function PurchaseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const purchase = await getPurchaseById(id);
  const suppliers = await getSuppliers();

  if (!purchase) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/pharmacy/purchases/${purchase.id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Purchase #{purchase.purchaseNo}</h1>
          <p className="text-sm text-muted-foreground">
            Update details for this purchase record.
          </p>
        </div>
      </div>

      <PurchaseEditForm purchase={purchase} suppliers={suppliers} />
    </div>
  );
}
