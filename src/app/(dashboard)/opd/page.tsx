import Link from "next/link";
import { Plus, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRole, getCurrentDoctorId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function OpdVisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { role } = await getCurrentUserRole();

  let whereClause: any = {};

  if (role?.toLowerCase() === 'doctor') {
    const currentDoctorId = await getCurrentDoctorId();
    if (currentDoctorId) {
      whereClause.doctorId = currentDoctorId;
    } else {
      whereClause.id = "non-existent";
    }
  }

  if (q) {
    whereClause.OR = [
      { diagnosis: { contains: q } },
      { status: { contains: q } },
      { patient: { name: { contains: q } } },
      { patient: { mrn: { contains: q } } },
      { doctor: { user: { name: { contains: q } } } },
    ];
  }

  const visits = await prisma.opdVisit.findMany({
    where: whereClause,
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          mrn: true,
        },
      },
      doctor: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { visitDate: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OPD Visits</h1>
          <p className="text-sm text-muted-foreground">
            Manage out-patient department visits, vitals, and diagnoses.
          </p>
        </div>
        <Link href="/opd/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Visit
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <form>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search patient, doctor, diagnosis, status..."
                className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </form>
          </div>
        </div>
        
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40 text-sm">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patient</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Doctor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Diagnosis</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {!visits || visits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-24 text-center text-muted-foreground">
                      No visits found.
                    </td>
                  </tr>
                ) : (
                  visits.map((visit) => {
                    const patient = visit.patient;
                    const doctorName = visit.doctor?.user?.name || "Unknown";
                    return (
                      <tr key={visit.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(visit.visitDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{patient?.name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{patient?.mrn}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {doctorName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                          {visit.diagnosis || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              visit.status === "closed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                          >
                            {visit.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/opd/${visit.id}`}>
                            <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary hover:bg-primary/10">
                              <FileText className="h-4 w-4" />
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
