import Link from "next/link";
import { Plus, Pill, AlertTriangle } from "lucide-react";
import { getMedicines } from "@/app/actions/medicine";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type MedicineRow = {
  id: string;
  name: string;
  category: { id: string; name: string } | null;
  manufacturer: string | null;
  inPrice: number;
  outPrice: number;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  isLowStock: boolean;
  isActive: boolean;
};

function MedicineTableRow({ med }: { med: MedicineRow }) {
  return (
    <tr className="border-b transition-colors hover:bg-muted/40">
      <td className="px-4 py-3 text-sm font-medium text-foreground">
        {med.name}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {med.category?.name || "Uncategorized"}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {med.manufacturer || "—"}
      </td>
      <td className="px-4 py-3 text-sm">
        Rs. {Number(med.inPrice).toFixed(2)}
      </td>
      <td className="px-4 py-3 text-sm">
        Rs. {Number(med.outPrice).toFixed(2)}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-1.5 font-medium">
          <span>{med.currentStock} {med.unit}</span>
          {med.isLowStock && (
            <span className="inline-flex items-center gap-0.5 text-xs text-destructive font-semibold">
              <AlertTriangle className="h-3 w-3" />
              Low
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            med.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {med.isActive ? "Active" : "Inactive"}
        </span>
      </td>
    </tr>
  );
}

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q || "";
  const medicines = await getMedicines(query);

  const totalMedicines = medicines.length;
  const lowStockCount = medicines.filter(m => m.isLowStock).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Medicines Master</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your pharmacy inventory, check stock, and set reorder levels.
          </p>
        </div>
        <Link href="/pharmacy/medicines/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Medicine
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Total Medicines</p>
          <p className="text-2xl font-bold tracking-tight">{totalMedicines}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Low Stock Alerts</p>
          <p className="text-2xl font-bold tracking-tight text-destructive">{lowStockCount}</p>
        </div>
      </div>

      {/* Search */}
      <form className="relative max-w-sm" method="GET" action="/pharmacy/medicines">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by name, manufacturer, category… (Enter)"
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm shadow-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </form>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Medicine Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Manufacturer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  In Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Out Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {medicines.length > 0 ? (
                medicines.map((m) => (
                  <MedicineTableRow key={m.id} med={m as unknown as MedicineRow} />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    {query
                      ? `No medicines found matching "${query}".`
                      : 'No medicines registered yet. Click "Add Medicine" to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
