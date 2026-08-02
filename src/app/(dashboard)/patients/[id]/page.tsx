import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  Droplet,
  FileText,
  Receipt,
  Plus,
  Stethoscope,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth-utils";
import { hasAccess } from "@/lib/permissions";

function computeAge(dobString: string): number {
  const dob = new Date(dobString);
  const diffMs = Date.now() - dob.getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}
export const dynamic = "force-dynamic";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md bg-muted p-1.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch Patient
  const { data: patient } = await supabase
    .from("Patient")
    .select("*")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  // Fetch Appointments
  const { data: rawAppointments } = await supabase
    .from("Appointment")
    .select(`
      id, scheduledAt, status,
      Doctor ( id, userId, specialization )
    `)
    .eq("patientId", id)
    .order("scheduledAt", { ascending: false })
    .limit(5);

  // Fetch doctors names for appointments
  const apptDoctorUserIds = (rawAppointments || []).map((a: any) => {
    const d = Array.isArray(a.Doctor) ? a.Doctor[0] : a.Doctor;
    return d?.userId;
  }).filter(Boolean);

  let apptDoctorsMap: Record<string, string> = {};
  if (apptDoctorUserIds.length > 0) {
    const { data: users } = await supabase
      .from("User")
      .select("id, name")
      .in("id", apptDoctorUserIds);
    if (users) {
      apptDoctorsMap = users.reduce((acc, u) => {
        acc[u.id] = u.name;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  const appointments = (rawAppointments || []).map((a: any) => {
    const d = Array.isArray(a.Doctor) ? a.Doctor[0] : a.Doctor;
    const docName = d?.userId ? apptDoctorsMap[d.userId] : "Unknown";
    return {
      id: a.id,
      scheduledAt: a.scheduledAt,
      status: a.status,
      doctor: {
        specialization: d?.specialization,
        user: { name: docName },
      },
    };
  });

  // Permission check for billing access
  const { role } = await getCurrentUserRole();
  const canReadBilling = role ? hasAccess(role, "billing", "read") : false;

  // Fetch Invoices only if authorized
  let invoices: any[] | null = null;
  if (canReadBilling) {
    const { data } = await supabase
      .from("Invoice")
      .select("id, invoiceNo, createdAt, total, status, sourceType")
      .eq("patientId", id)
      .order("createdAt", { ascending: false })
      .limit(5);
    invoices = data;
  }

  // Fetch OPD Visits
  const { data: rawOpdVisits } = await supabase
    .from("OpdVisit")
    .select(`
      id, visitDate, diagnosis, status,
      Doctor ( id, userId, specialization )
    `)
    .eq("patientId", id)
    .order("visitDate", { ascending: false })
    .limit(5);

  const opdDoctorUserIds = (rawOpdVisits || []).map((o: any) => {
    const d = Array.isArray(o.Doctor) ? o.Doctor[0] : o.Doctor;
    return d?.userId;
  }).filter(Boolean);

  let opdDoctorsMap: Record<string, string> = {};
  if (opdDoctorUserIds.length > 0) {
    const { data: users } = await supabase
      .from("User")
      .select("id, name")
      .in("id", opdDoctorUserIds);
    if (users) {
      opdDoctorsMap = users.reduce((acc, u) => {
        acc[u.id] = u.name;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  const opdVisits = (rawOpdVisits || []).map((o: any) => {
    const d = Array.isArray(o.Doctor) ? o.Doctor[0] : o.Doctor;
    const docName = d?.userId ? opdDoctorsMap[d.userId] : "Unknown";
    return {
      id: o.id,
      visitDate: o.visitDate,
      diagnosis: o.diagnosis,
      status: o.status,
      doctor: { user: { name: docName } }
    };
  });

  const age = patient.dob ? computeAge(patient.dob) : "—";
  const dob = patient.dob
    ? new Date(patient.dob).toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Not provided";
  const registered = new Date(patient.createdAt).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Generate QR Code for MRN
  let qrCodeUrl = "";
  try {
    qrCodeUrl = await QRCode.toDataURL(patient.mrn, { width: 120, margin: 1 });
  } catch (err) {
    console.error("Failed to generate QR Code", err);
  }

  const apptColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    completed: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
    "no-show": "bg-warning/10 text-warning",
  };

  const invoiceColors: Record<string, string> = {
    paid: "bg-success/10 text-success",
    unpaid: "bg-destructive/10 text-destructive",
    partial: "bg-warning/10 text-warning",
  };

  const opdColors: Record<string, string> = {
    open: "bg-warning/10 text-warning",
    closed: "bg-success/10 text-success",
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      {/* Patient header card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar initials */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold select-none">
              {patient.name
                .split(" ")
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{patient.name}</h1>
              <p className="font-mono text-sm text-primary font-medium">{patient.mrn}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    patient.gender === "Female"
                      ? "bg-pink-100 text-pink-700"
                      : patient.gender === "Male"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {patient.gender || "Unspecified"}
                </span>
                {patient.bloodGroup && (
                  <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    {patient.bloodGroup}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{age} years old</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            {/* QR Code rendering */}
            {qrCodeUrl && (
              <div className="shrink-0 rounded-lg border bg-white p-1 shadow-sm hidden sm:block">
                <img src={qrCodeUrl} alt="Patient QR Code" className="h-20 w-20" />
              </div>
            )}
            <div className="text-xs text-muted-foreground sm:text-right pt-1">
              <p>Registered</p>
              <p className="font-medium text-foreground">{registered}</p>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t pt-5">
          <InfoRow icon={Calendar} label="Date of Birth" value={dob} />
          <InfoRow icon={Phone} label="Phone Number" value={patient.phone || "—"} />
          <InfoRow icon={MapPin} label="Address" value={patient.address || "—"} />
          <InfoRow
            icon={Droplet}
            label="Blood Group"
            value={patient.bloodGroup ?? "Not recorded"}
          />
        </div>
      </div>

      {/* Tabs area */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Appointments */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Recent Appointments</h2>
            </div>
            <Link href={`/appointments/new?patientId=${patient.id}`}>
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Book
              </Button>
            </Link>
          </div>

          {appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((appt: any) => (
                <div key={appt.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{appt.doctor.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(appt.scheduledAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })} at {new Date(appt.scheduledAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${apptColors[appt.status] || "bg-muted"}`}>
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-sm text-muted-foreground">No appointments booked yet.</p>
            </div>
          )}
        </div>

        {/* Invoices */}
        {canReadBilling && (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Recent Invoices</h2>
              </div>
              <Link href={`/billing/new?patientId=${patient.id}`}>
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  New Invoice
                </Button>
              </Link>
            </div>

            {(invoices || []).length > 0 ? (
              <div className="space-y-3">
                {invoices!.map((inv: any) => (
                  <Link key={inv.id} href={`/billing/${inv.id}`}>
                    <div className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 hover:bg-muted/30 transition-colors p-2 rounded-md -mx-2 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium font-mono text-primary">{inv.invoiceNo}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })} • {inv.sourceType}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">Rs. {Number(inv.total).toLocaleString()}</p>
                        <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${invoiceColors[inv.status] || "bg-muted"}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm text-muted-foreground">No invoices generated yet.</p>
              </div>
            )}
          </div>
        )}

        {/* OPD Visits */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Recent OPD Visits</h2>
            </div>
          </div>

          {opdVisits.length > 0 ? (
            <div className="space-y-3">
              {opdVisits.map((visit: any) => (
                <Link key={visit.id} href={`/opd/${visit.id}`}>
                  <div className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 hover:bg-muted/30 transition-colors p-2 rounded-md -mx-2 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium">Dr. {visit.doctor.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(visit.visitDate).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {visit.diagnosis && (
                        <p className="text-xs font-medium text-primary mt-0.5">{visit.diagnosis}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${opdColors[visit.status] || "bg-muted"}`}>
                        {visit.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-sm text-muted-foreground">No OPD visits recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
