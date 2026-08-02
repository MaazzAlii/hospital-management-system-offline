import Link from "next/link";
import { Plus, Eye, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRole } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type DoctorWithUser = {
  id: string;
  specialization: string | null;
  fee: unknown;
  isActive: boolean;
  qualifications: string | null;
  user: { name: string; email: string; isActive: boolean };
};

function DoctorRow({ doctor }: { doctor: DoctorWithUser }) {
  const initials = doctor.user.name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const feeNum = doctor.fee ? Number(doctor.fee) : null;

  return (
    <tr className="border-b transition-colors hover:bg-muted/40">
      <td className="px-4 py-3 text-sm font-medium">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {initials}
          </div>
          <div>
            <p>{doctor.user.name}</p>
            <p className="text-xs text-muted-foreground">{doctor.user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {doctor.specialization || "—"}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {feeNum != null ? `Rs. ${feeNum.toLocaleString()}` : "—"}
      </td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            doctor.isActive
              ? "bg-success/10 text-success"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {doctor.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-1">
          <Link
            href={`/doctors/${doctor.id}`}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
          <Link
            href={`/doctors/${doctor.id}/edit`}
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

export default async function DoctorsPage({
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
          { specialization: { contains: query } },
          { user: { name: { contains: query } } },
          { user: { email: { contains: query } } },
        ],
      }
    : {};

  const rawDoctors = await prisma.doctor.findMany({
    where: whereClause,
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalCount = await prisma.doctor.count();

  const doctors: DoctorWithUser[] = rawDoctors.map((d) => ({
    id: d.id,
    specialization: d.specialization,
    fee: d.fee,
    isActive: d.status === "active",
    qualifications: d.qualification,
    user: d.user
      ? { name: d.user.name, email: d.user.email, isActive: true }
      : { name: "Unknown", email: "", isActive: false },
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Doctors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount || 0} doctor{(totalCount || 0) !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Link href="/doctors/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Doctor
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form className="relative max-w-sm" method="GET" action="/doctors">
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
          placeholder="Search by name, specialization… (Enter)"
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm shadow-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </form>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Doctor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Specialization
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Consultation Fee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {doctors.length > 0 ? (
                doctors.map((d) => <DoctorRow key={d.id} doctor={d} />)
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    {query
                      ? `No doctors found matching "${query}".`
                      : 'No doctors registered yet. Click "Add Doctor" to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {doctors.length > 0 && (
          <div className="border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            Showing {doctors.length} of {totalCount || 0} doctors
          </div>
        )}
      </div>
    </div>
  );
}
