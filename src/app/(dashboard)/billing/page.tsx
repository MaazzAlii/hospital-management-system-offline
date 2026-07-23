import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";

type InvoiceRow = {
  id: string;
  invoiceNo: string;
  sourceType: string;
  total: unknown;
  status: string;
  createdAt: Date | string;
  patient: { id: string; name: string; mrn: string };
  paymentMethod: string | null;
};

function InvoiceTableRow({ inv }: { inv: InvoiceRow }) {
  const statusColors: Record<string, string> = {
    paid: "bg-success/10 text-success",
    unpaid: "bg-destructive/10 text-destructive",
    partial: "bg-warning/10 text-warning",
  };

  return (
    <tr className="border-b transition-colors hover:bg-muted/40">
      <td className="px-4 py-3 text-sm font-mono font-medium text-primary">
        {inv.invoiceNo}
      </td>
      <td className="px-4 py-3 text-sm">
        <Link href={`/patients/${inv.patient?.id}`} className="hover:underline font-medium">
          {inv.patient?.name || "Unknown"}
        </Link>
        <div className="text-xs text-muted-foreground font-mono">{inv.patient?.mrn || "—"}</div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{inv.sourceType}</td>
      <td className="px-4 py-3 text-sm font-semibold">
        Rs. {Number(inv.total).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
            statusColors[inv.status] || "bg-muted text-muted-foreground"
          }`}
        >
          {inv.status}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(inv.createdAt).toLocaleDateString("en-PK", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </td>
      <td className="px-4 py-3 text-sm">
        <Link
          href={`/billing/${inv.id}`}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Receipt className="h-3.5 w-3.5" />
          View
        </Link>
      </td>
    </tr>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q || "";
  const supabase = await createClient();

  const { data: rawInvoices } = await supabase
    .from("Invoice")
    .select(`
      id, invoiceNo, sourceType, total, status, createdAt, paymentMethod,
      Patient ( id, name, mrn )
    `)
    .order("createdAt", { ascending: false });
  
  let invoices = (rawInvoices || []).map((i: any) => ({
    ...i,
    patient: Array.isArray(i.Patient) ? i.Patient[0] : i.Patient,
  }));

  if (query) {
    const q = query.toLowerCase();
    invoices = invoices.filter((i) => 
      (i.invoiceNo || "").toLowerCase().includes(q) ||
      (i.patient?.name || "").toLowerCase().includes(q) ||
      (i.patient?.mrn || "").toLowerCase().includes(q)
    );
  }

  const { count: totalCount } = await supabase.from("Invoice").select("*", { count: 'exact', head: true });
  const { count: unpaidCount } = await supabase.from("Invoice").select("*", { count: 'exact', head: true }).eq('status', 'unpaid');
  
  const { data: revenueData } = await supabase.from("Invoice").select("total").in('status', ['paid', 'partial']);
  const totalRevenue = (revenueData || []).reduce((sum, item) => sum + Number(item.total), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount || 0} invoice{totalCount !== 1 ? "s" : ""} · {unpaidCount || 0} unpaid
          </p>
        </div>
        <Link href="/billing/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Total Collected</p>
          <p className="text-2xl font-bold tracking-tight">
            Rs. {totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Unpaid Invoices</p>
          <p className="text-2xl font-bold tracking-tight text-destructive">{unpaidCount || 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Total Invoices</p>
          <p className="text-2xl font-bold tracking-tight">{totalCount || 0}</p>
        </div>
      </div>

      {/* Search */}
      <form className="relative max-w-sm" method="GET" action="/billing">
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
          placeholder="Search by invoice #, patient… (Enter)"
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm shadow-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </form>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Invoice #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <InvoiceTableRow key={inv.id} inv={inv as InvoiceRow} />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    {query
                      ? `No invoices found matching "${query}".`
                      : 'No invoices yet. Click "New Invoice" to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {invoices.length > 0 && (
          <div className="border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            Showing {invoices.length} of {totalCount} invoices
          </div>
        )}
      </div>
    </div>
  );
}
