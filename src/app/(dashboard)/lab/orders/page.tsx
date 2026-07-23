import Link from "next/link";
import { Plus, Beaker } from "lucide-react";
import { getLabOrders } from "@/app/actions/lab-order";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function LabOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q || "";
  const orders = await getLabOrders(query);

  const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lab Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage test orders, collect samples, and enter results.
          </p>
        </div>
        <Link href="/lab/orders/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
          <p className="text-2xl font-bold tracking-tight">{orders.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Pending Orders</p>
          <p className="text-2xl font-bold tracking-tight text-orange-500">{pendingOrders}</p>
        </div>
      </div>

      <form className="relative max-w-sm" method="GET" action="/lab/orders">
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
          placeholder="Search by order no, patient…"
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm shadow-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </form>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map((order: any) => (
                  <tr key={order.id} className="border-b transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{order.orderNo}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(order.orderedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-medium">{order.Patient?.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        order.status === 'completed' ? "bg-success/10 text-success" : 
                        order.status === 'pending' ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <Link href={`/lab/orders/${order.id}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Beaker className="h-4 w-4" />
                          Process Order
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {query ? `No orders found matching "${query}".` : 'No lab orders yet.'}
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
