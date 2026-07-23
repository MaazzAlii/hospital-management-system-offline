import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  Mail,
  GraduationCap,
  Banknote,
  Calendar,
  CheckCircle2,
  XCircle,
  ClipboardList,
} from "lucide-react";
export const dynamic = "force-dynamic";

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md bg-muted p-1.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();
  
  const { data: doctorRaw, error: doctorError } = await supabase
    .from("Doctor")
    .select(`*`)
    .eq("id", resolvedParams.id)
    .single();

  if (doctorError) {
    console.error("Doctor detail query error:", doctorError.message, doctorError.code, "id:", resolvedParams.id);
  }
  if (!doctorRaw) notFound();

  // Fetch user separately to avoid RLS join issues
  let user: { name: string; email: string } = { name: "Unknown", email: "" };
  if (doctorRaw.userId) {
    const { data: userData } = await supabase
      .from("User")
      .select("name, email")
      .eq("id", doctorRaw.userId)
      .single();
    if (userData) user = userData;
  }

  const doctor = {
    ...doctorRaw,
    user,
  };

  const { data: rawAppointments } = await supabase
    .from("Appointment")
    .select(`id, scheduledAt, status, Patient ( id, name, mrn )`)
    .eq("doctorId", resolvedParams.id)
    .order("scheduledAt", { ascending: false })
    .limit(10);

  const appointments = (rawAppointments || []).map((a: any) => ({
    ...a,
    patient: Array.isArray(a.Patient) ? a.Patient[0] : a.Patient,
  }));

  const initials = doctor.user.name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const feeNum = doctor.fee ? Number(doctor.fee) : null;
  const registered = new Date(doctor.createdAt).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const quals = doctor.qualifications
    ? doctor.qualifications.split(",").map((q: string) => q.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/doctors"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Doctors
      </Link>

      {/* Doctor header card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold select-none">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{doctor.user.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {doctor.specialization || "General"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {doctor.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    <XCircle className="h-3 w-3" />
                    Inactive
                  </span>
                )}
                {quals.map((q: string) => (
                  <span
                    key={q}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {q}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground sm:text-right pt-1">
            <p>Registered</p>
            <p className="font-medium text-foreground">{registered}</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t pt-5">
          <InfoCard icon={Mail} label="Email Address" value={doctor.user.email} />
          <InfoCard
            icon={Banknote}
            label="Consultation Fee"
            value={feeNum != null ? `Rs. ${feeNum.toLocaleString()}` : "Not set"}
          />
          <InfoCard
            icon={GraduationCap}
            label="Qualifications"
            value={
              quals.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {quals.map((q: string) => (
                    <span
                      key={q}
                      className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      {q}
                    </span>
                  ))}
                </div>
              ) : (
                "Not listed"
              )
            }
          />
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Recent Appointments</h2>
          <span className="ml-auto text-xs text-muted-foreground">Last 10</span>
        </div>

        {appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Patient
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date &amp; Time
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt: any) => {
                  const dateObj = new Date(appt.scheduledAt);
                  const statusColors: Record<string, string> = {
                    scheduled: "bg-blue-100 text-blue-700",
                    completed: "bg-success/10 text-success",
                    cancelled: "bg-destructive/10 text-destructive",
                    "no-show": "bg-warning/10 text-warning",
                  };
                  return (
                    <tr key={appt.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 text-sm">
                        <div className="font-medium">{appt.patient?.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {appt.patient?.mrn}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <div className="font-medium">
                          {dateObj.toLocaleDateString("en-PK", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dateObj.toLocaleTimeString("en-PK", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            statusColors[appt.status] || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 py-10 text-center">
            <div className="rounded-full bg-muted p-3">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No appointments yet</p>
            <Link
              href={`/appointments/new`}
              className="text-xs font-medium text-primary hover:underline"
            >
              Book first appointment →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
