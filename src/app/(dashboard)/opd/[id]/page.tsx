import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Stethoscope, FileText, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OpdVisitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: visit } = await supabase
    .from("OpdVisit")
    .select(`
      *,
      patient:Patient(*)
    `)
    .eq("id", id)
    .single();

  if (!visit) {
    notFound();
  }

  // Fetch doctor user separately
  let doctorName = "Unknown";
  let doctorSpecialization = "";
  if (visit.doctorId) {
    const { data: doctor } = await supabase.from("Doctor").select("userId, specialization").eq("id", visit.doctorId).single();
    if (doctor) {
      doctorSpecialization = doctor.specialization || "";
      if (doctor.userId) {
        const { data: user } = await supabase.from("User").select("name").eq("id", doctor.userId).single();
        if (user) {
          doctorName = user.name;
        }
      }
    }
  }

  const patient = visit.patient as any;
  const vitals = (visit.vitals as Record<string, string>) || {};

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <Link
          href="/opd"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to OPD Visits
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">OPD Visit Details</h1>
              <p className="text-sm text-muted-foreground">
                {new Date(visit.visitDate).toLocaleString()}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              visit.status === "closed"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            }`}
          >
            {visit.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Patient Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b pb-2">Patient & Doctor Information</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Patient Name</p>
              <p className="font-medium text-foreground">{patient?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">MRN</p>
              <p className="font-medium text-foreground">{patient?.mrn}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Doctor</p>
              <p className="font-medium text-foreground">Dr. {doctorName} {doctorSpecialization && `(${doctorSpecialization})`}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Follow-up Date</p>
              <p className="font-medium text-foreground">{visit.followUpDate ? new Date(visit.followUpDate).toLocaleDateString() : "None scheduled"}</p>
            </div>
          </div>
        </div>

        {/* Vitals */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Vitals</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">BP</p>
              <p className="font-medium">{vitals.bp || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Pulse</p>
              <p className="font-medium">{vitals.pulse || "-"} bpm</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Temp</p>
              <p className="font-medium">{vitals.temp || "-"} °</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">SpO2</p>
              <p className="font-medium">{vitals.spo2 || "-"} %</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Weight</p>
              <p className="font-medium">{vitals.weight || "-"} kg</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Height</p>
              <p className="font-medium">{vitals.height || "-"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Notes */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Clinical Notes & Diagnosis</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-1">PRIMARY DIAGNOSIS</h3>
            <p className="text-sm text-foreground bg-muted/40 p-3 rounded-md">
              {visit.diagnosis || "No diagnosis recorded."}
            </p>
          </div>
          
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-1">NOTES & PRESCRIPTION</h3>
            <div className="text-sm text-foreground bg-muted/40 p-3 rounded-md min-h-[100px] whitespace-pre-wrap">
              {visit.notes || "No additional clinical notes."}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Link href={`/billing/new?patientId=${patient?.id}&sourceType=OPD&sourceId=${visit.id}`}>
          <Button>Generate Invoice</Button>
        </Link>
      </div>
    </div>
  );
}
