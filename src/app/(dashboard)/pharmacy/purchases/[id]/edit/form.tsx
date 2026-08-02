"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePurchase } from "@/app/actions/purchase";
import { Button } from "@/components/ui/button";

interface PurchaseEditFormProps {
  purchase: {
    id: string;
    purchaseNo: string;
    supplierId: string | null;
    status: string;
    notes: string | null;
    totalAmount: number;
    items?: Array<{
      id: string;
      medicineId: string;
      quantity: number;
      unitPrice: number;
      batchNo: string | null;
      expiryDate: string | Date | null;
      medicine?: { name: string };
    }>;
  };
  suppliers: Array<{ id: string; name: string }>;
}

export default function PurchaseEditForm({ purchase, suppliers }: PurchaseEditFormProps) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(purchase.supplierId || "");
  const [status, setStatus] = useState(purchase.status || "completed");
  const [notes, setNotes] = useState(purchase.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await updatePurchase(purchase.id, {
      supplierId: supplierId || undefined,
      status,
      notes,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push(`/pharmacy/purchases/${purchase.id}`);
      router.refresh();
    } else {
      setError(result.error || "Failed to update purchase");
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
          <label className="text-sm font-medium">Purchase Number</label>
          <input
            type="text"
            disabled
            value={purchase.purchaseNo}
            className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select Supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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
          <label className="text-sm font-medium">Total Amount (Rs.)</label>
          <input
            type="text"
            disabled
            value={purchase.totalAmount?.toFixed(2) || "0.00"}
            className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="Add any notes regarding this purchase..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/pharmacy/purchases/${purchase.id}`)}
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
