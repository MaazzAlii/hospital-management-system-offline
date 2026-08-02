import { getSaleById } from "@/app/actions/sale";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SaleEditForm from "./form";

export const dynamic = "force-dynamic";

export default async function SaleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getSaleById(id);

  if (!sale) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/pharmacy/sales/${sale.id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Sale #{sale.saleNo}</h1>
          <p className="text-sm text-muted-foreground">
            Update details for this sale record.
          </p>
        </div>
      </div>

      <SaleEditForm sale={sale} />
    </div>
  );
}
