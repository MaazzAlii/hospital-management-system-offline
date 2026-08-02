import Link from "next/link";
import { Search, Plus, Eye, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRole } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { computeAge } from "@/lib/utils";

export const dynamic = "force-dynamic";

function PatientRow({ patient }: { patient: any }) {
  const age = patient.dob ? computeAge(patient.dob) : "—";
  return (
    <tr className="border-b transition-colors hover:bg-muted/40">
      <td className="px-4 py-3 text-sm font-mono text-primary font-medium">{patient.mrn}</td>
      <td className="px-4 py-3 text-sm font-medium">{patient.name}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{patient.phone || "—"}</td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            patient.gender === "Female"
              ? "bg-pink-100 text-pink-700"
              : patient.gender === "Male"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {patient.gender || "—"}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{age} yrs</td>
      <td className="px-4 py-3 text-sm">
        {patient.bloodGroup ? (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            {patient.bloodGroup}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-1">
          <Link
            href={`/patients/${patient.id}`}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
          <Link
            href={`/patients/${patient.id}/edit`}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        </div>
      </td>
    </tr>
  );
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await getCurrentUserRole();

  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q || "";

  const whereClause = query
    ? {
        OR: [
          { name: { contains: query } },
          { mrn: { contains: query } },
          { phone: { contains: query } },
        ],
      }
    : {};

  const patients = await prisma.patient.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

  const totalCount = await prisma.patient.count();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount || 0} registered patients
          </p>
        </div>
        <Link href="/patients/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Register Patient
          </Button>
        </Link>
      </div>

      {/* Search - handled via a client form that updates URL params */}
      <form className="relative max-w-sm" method="GET" action="/patients">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by name, MRN, or phone (Press Enter)…"
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm shadow-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </form>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">MRN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Age</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blood Group</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(patients || []).length > 0 ? (
                patients!.map((p: any) => <PatientRow key={p.id} patient={p} />)
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {query ? `No patients found matching "${query}".` : "No patients registered yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {(patients || []).length > 0 && (
          <div className="border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            Showing {(patients || []).length} of {totalCount || 0} patients
          </div>
        )}
      </div>
    </div>
  );
}
