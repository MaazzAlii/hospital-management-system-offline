import Link from "next/link";
import { Plus, TestTube } from "lucide-react";
import { getLabTests } from "@/app/actions/lab-test";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function LabTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q || "";
  const tests = await getLabTests(query);

  const totalTests = tests.length;
  const activeTests = tests.filter((t: any) => t.isActive).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lab Tests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your laboratory test catalog and pricing.
          </p>
        </div>
        <Link href="/lab/tests/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Test
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Total Tests</p>
          <p className="text-2xl font-bold tracking-tight">{totalTests}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Active Tests</p>
          <p className="text-2xl font-bold tracking-tight text-success">{activeTests}</p>
        </div>
      </div>

      <form className="relative max-w-sm" method="GET" action="/lab/tests">
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
          placeholder="Search by name, code, category…"
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm shadow-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </form>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sample Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {tests.length > 0 ? (
                tests.map((test: any) => (
                  <tr key={test.id} className="border-b transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{test.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{test.code || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{test.LabCategory?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                      <TestTube className="h-4 w-4 text-muted-foreground" />
                      {test.sampleType || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">Rs. {Number(test.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        test.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      }`}>
                        {test.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {query ? `No tests found matching "${query}".` : 'No tests registered yet.'}
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
