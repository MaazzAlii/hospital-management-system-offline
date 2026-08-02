import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { getSuppliers } from "@/app/actions/supplier";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type SupplierRow = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive?: boolean;
};

function SupplierTableRow({ supplier }: { supplier: SupplierRow }) {
  return (
    <tr className="border-b transition-colors hover:bg-muted/40">
      <td className="px-4 py-3 text-sm font-medium text-foreground">
        {supplier.name}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {supplier.contactPerson || "—"}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {supplier.phone || "—"}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {supplier.email || "—"}
      </td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            supplier.isActive !== false ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {supplier.isActive !== false ? "Active" : "Inactive"}
        </span>
      </td>
    </tr>
  );
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q || "";
  const suppliers = await getSuppliers(query);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your medicine suppliers and contact information.
          </p>
        </div>
        <Link href="/pharmacy/suppliers/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Supplier
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form className="relative max-w-sm" method="GET" action="/pharmacy/suppliers">
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
          placeholder="Search by name, contact, phone… (Enter)"
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
                  Supplier Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact Person
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length > 0 ? (
                suppliers.map((s) => (
                  <SupplierTableRow key={s.id} supplier={s as SupplierRow} />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    {query
                      ? `No suppliers found matching "${query}".`
                      : 'No suppliers added yet. Click "Add Supplier" to get started.'}
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
