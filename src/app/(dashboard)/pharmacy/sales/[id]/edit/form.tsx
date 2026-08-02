"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSale } from "@/app/actions/sale";
import { Button } from "@/components/ui/button";

interface SaleEditFormProps {
  sale: {
    id: string;
    saleNo: string;
    customerName: string | null;
    customerPhone: string | null;
    status: string;
    totalAmount: number;
    patient?: { name?: string | null } | null;
  };
}

export default function SaleEditForm({ sale }: SaleEditFormProps) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState(sale.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(sale.customerPhone || "");
  const [status, setStatus] = useState(sale.status || "completed");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await updateSale(sale.id, {
      customerName,
      customerPhone,
      status,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push(`/pharmacy/sales/${sale.id}`);
      router.refresh();
    } else {
      setError(result.error || "Failed to update sale");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Sale Number</label>
          <input
            type="text"
            disabled
            value={sale.saleNo}
            className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Customer Name</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Walk-in Customer Name"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Customer Phone</label>
          <input
            type="text"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone Number"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Total Amount (Rs.)</label>
          <input
            type="text"
            disabled
            value={sale.totalAmount?.toFixed(2) || "0.00"}
            className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/pharmacy/sales/${sale.id}`)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
