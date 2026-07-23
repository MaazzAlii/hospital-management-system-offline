import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

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
        {appt.status === "scheduled" && (
          <Link
            href={`/appointments/${appt.id}/visit`}
            className="inline-flex items-center rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Start Visit
          </Link>
        )}
      </td>
    </tr>
  );
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q || "";
  const supabase = await createClient();

  const { data: rawAppointments } = await supabase
    .from("Appointment")
    .select(`
      id,
      scheduledAt,
      status,
      notes,
      Patient ( id, mrn, name ),
      Doctor ( id, userId, specialization )
    `)
    .order("scheduledAt", { ascending: false });

  // Fetch users separately to attach to doctors
  let usersMap: Record<string, string> = {};
  if (rawAppointments && rawAppointments.length > 0) {
    const userIds = rawAppointments
      .map((a: any) => {
        const d = Array.isArray(a.Doctor) ? a.Doctor[0] : a.Doctor;
        return d?.userId;
      })
      .filter(Boolean);

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("User")
        .select("id, name")
        .in("id", userIds);

      if (usersData) {
        usersMap = usersData.reduce((acc, u) => {
          acc[u.id] = u.name;
          return acc;
        }, {} as Record<string, string>);
      }
    }
  }

  let appointments: ApptRow[] = (rawAppointments || []).map((a: any) => {
    const p = Array.isArray(a.Patient) ? a.Patient[0] : a.Patient;
    const d = Array.isArray(a.Doctor) ? a.Doctor[0] : a.Doctor;
    const uName = d?.userId ? usersMap[d.userId] : "Unknown";
    
    return {
      id: a.id,
      scheduledAt: new Date(a.scheduledAt),
      status: a.status,
      notes: a.notes,
      patient: { id: p?.id, mrn: p?.mrn, name: p?.name },
      doctor: { id: d?.id, specialization: d?.specialization, user: { name: uName || "Unknown" } }
    };
  });

  if (query) {
    const q = query.toLowerCase();
    appointments = appointments.filter((a) =>
      (a.patient?.name || "").toLowerCase().includes(q) ||
      (a.patient?.mrn || "").toLowerCase().includes(q) ||
      (a.doctor?.user?.name || "").toLowerCase().includes(q)
    );
  }

  const { count: totalCount } = await supabase
    .from("Appointment")
    .select("*", { count: "exact", head: true });

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
                    colSpan={5}
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
