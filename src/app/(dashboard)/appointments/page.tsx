import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRole } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { DeleteConfirmButton } from "@/components/common/DeleteConfirmButton";
import { deleteAppointment } from "@/app/actions/appointment";

export const dynamic = "force-dynamic";

type ApptRow = {
  id: string;
  scheduledAt: Date;
  status: string;
  notes: string | null;
  patient: { id: string; mrn: string; name: string };
  doctor: { id: string; specialization: string | null; user: { name: string } };
};

function AppointmentRow({ appt }: { appt: ApptRow }) {
  const dateObj = new Date(appt.scheduledAt);
  const date = dateObj.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = dateObj.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    completed: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
    "no-show": "bg-warning/10 text-warning",
  };

  return (
    <tr className="border-b transition-colors hover:bg-muted/40">
      <td className="px-4 py-3 text-sm">
        <Link href={`/patients/${appt.patient.id}`} className="hover:underline">
          <div className="font-medium text-primary">{appt.patient.mrn}</div>
          <div className="text-muted-foreground">{appt.patient.name}</div>
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {appt.doctor.user.name}
        {appt.doctor.specialization && (
          <div className="text-xs">{appt.doctor.specialization}</div>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="font-medium">{date}</div>
        <div className="text-xs text-muted-foreground">{time}</div>
      </td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            statusColors[appt.status] || "bg-muted text-muted-foreground"
          }`}
        >
          {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
        {appt.notes || "—"}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-1.5">
          {appt.status === "scheduled" && (
            <Link
              href={`/appointments/${appt.id}/visit`}
              className="inline-flex items-center rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Start Visit
            </Link>
          )}
          <DeleteConfirmButton
            id={appt.id}
            title="Delete Appointment"
            itemName={`appointment for ${appt.patient.name} (${date})`}
            description={`Are you sure you want to delete this appointment for ${appt.patient.name} on ${date} at ${time}? Appointments with linked OPD visits or invoices cannot be deleted.`}
            onDelete={deleteAppointment}
            iconOnly={false}
          />
        </div>
      </td>
    </tr>
  );
}

export default async function AppointmentsPage({
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
          { patient: { name: { contains: query } } },
          { patient: { mrn: { contains: query } } },
          { doctor: { user: { name: { contains: query } } } },
        ],
      }
    : {};

  const rawAppointments = await prisma.appointment.findMany({
    where: whereClause,
    include: {
      patient: true,
      doctor: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      scheduledAt: "desc",
    },
  });

  const totalCount = await prisma.appointment.count();

  const appointments: ApptRow[] = rawAppointments.map((a) => ({
    id: a.id,
    scheduledAt: a.scheduledAt,
    status: a.status,
    notes: a.notes,
    patient: {
      id: a.patient?.id ?? "",
      mrn: a.patient?.mrn ?? "",
      name: a.patient?.name ?? "Unknown",
    },
    doctor: {
      id: a.doctor?.id ?? "",
      specialization: a.doctor?.specialization ?? null,
      user: { name: a.doctor?.user?.name ?? "Unknown" },
    },
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount || 0} appointment{(totalCount || 0) !== 1 ? "s" : ""} booked
          </p>
        </div>
        <Link href="/appointments/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form className="relative max-w-sm" method="GET" action="/appointments">
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
          placeholder="Search by patient, MRN, or doctor… (Enter)"
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
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Doctor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Date &amp; Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {appointments.length > 0 ? (
                appointments.map((a) => <AppointmentRow key={a.id} appt={a} />)
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    {query
                      ? `No appointments found matching "${query}".`
                      : "No appointments booked yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {appointments.length > 0 && (
          <div className="border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            Showing {appointments.length} of {totalCount || 0} appointments
          </div>
        )}
      </div>
    </div>
  );
}
