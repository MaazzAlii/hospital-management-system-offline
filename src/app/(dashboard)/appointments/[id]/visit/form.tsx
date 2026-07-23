"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createOpdVisit } from "@/app/actions/opd";

interface OpdVisitFormProps {
  appointment: {
    id: string;
    patientId: string;
    doctorId: string;
    patient: { id: string; name: string; mrn: string; dob?: string; gender?: string };
    doctorName: string;
    doctorSpecialization?: string;
  };
}

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-colors disabled:opacity-60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

export default function OpdVisitForm({ appointment }: OpdVisitFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [vitals, setVitals] = useState({
    bp: "",
    pulse: "",
    temp: "",
    weight: "",
    height: "",
    spo2: "",
  });
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const updateVital = (key: keyof typeof vitals, value: string) => {
    setVitals((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await createOpdVisit({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentId: appointment.id,
      visitDate: new Date().toISOString(),
      vitals,
      diagnosis,
      notes,
      followUpDate,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push(`/patients/${appointment.patientId}`);
    } else {
      setErrorMsg(result.error || "Failed to save OPD visit");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/appointments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Appointments
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">OPD Visit</h1>
            <p className="text-sm text-muted-foreground">
              Record visit details for {appointment.patient.name}.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
          {errorMsg}
        </div>
      )}

      {/* Details Card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-2">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Patient</span>
            <div className="font-medium text-base">{appointment.patient.name}</div>
            <div className="text-muted-foreground">{appointment.patient.mrn}</div>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Doctor</span>
            <div className="font-medium text-base">Dr. {appointment.doctorName}</div>
            {appointment.doctorSpecialization && (
              <div className="text-muted-foreground">{appointment.doctorSpecialization}</div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Vitals */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Vitals</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Blood Pressure">
              <input
                type="text"
                placeholder="e.g. 120/80"
                value={vitals.bp}
                onChange={(e) => updateVital("bp", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Pulse (bpm)">
              <input
                type="text"
                placeholder="e.g. 72"
                value={vitals.pulse}
                onChange={(e) => updateVital("pulse", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Temperature (°F)">
              <input
                type="text"
                placeholder="e.g. 98.6"
                value={vitals.temp}
                onChange={(e) => updateVital("temp", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Weight (kg)">
              <input
                type="text"
                placeholder="e.g. 70"
                value={vitals.weight}
                onChange={(e) => updateVital("weight", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Height (cm)">
              <input
                type="text"
                placeholder="e.g. 175"
                value={vitals.height}
                onChange={(e) => updateVital("height", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="SpO2 (%)">
              <input
                type="text"
                placeholder="e.g. 98"
                value={vitals.spo2}
                onChange={(e) => updateVital("spo2", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Clinical Notes */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Clinical Details</h2>
          <div className="space-y-4">
            <Field label="Primary Diagnosis">
              <input
                type="text"
                placeholder="e.g. Viral Fever, Hypertension..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Notes / Prescription">
              <textarea
                placeholder="Enter detailed clinical notes, complaints, and prescribed medications..."
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass + " resize-y"}
              />
            </Field>
            <div className="sm:w-1/2">
              <Field label="Follow-up Date">
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/appointments">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? "Saving Visit…" : "Complete Visit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
