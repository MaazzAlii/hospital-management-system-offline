"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Stethoscope, Activity, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createOpdVisit } from "@/app/actions/opd";

export default function StartVisitForm({ appointment }: { appointment: any }) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [temp, setTemp] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await createOpdVisit({
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      vitals: { bp, hr, temp, weight, height },
      symptoms,
      diagnosis,
      notes,
      status: "closed",
    });

    if (res.success) {
      router.push(`/opd/${res.visit?.id}`);
    } else {
      setErrorMsg(res.error || "Failed to save visit record");
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring transition-colors";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
            <h1 className="text-xl font-semibold tracking-tight">OPD Consultation / Start Visit</h1>
            <p className="text-sm text-muted-foreground">
              Record vitals, symptoms, diagnosis, and prescription for patient consultation.
            </p>
          </div>
        </div>
      </div>

      {/* Patient & Doctor Banner */}
      <div className="rounded-xl border bg-card p-5 shadow-sm grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Patient</p>
          <p className="text-base font-semibold text-foreground mt-0.5">{appointment.patient?.name}</p>
          <p className="text-xs text-primary font-mono font-medium">{appointment.patient?.mrn}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Consulting Doctor</p>
          <p className="text-base font-semibold text-foreground mt-0.5">Dr. {appointment.doctor?.user?.name}</p>
          <p className="text-xs text-muted-foreground">{appointment.doctor?.specialization || "General"}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vitals Section */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Patient Vitals</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Blood Pressure (BP)</label>
              <input
                type="text"
                value={bp}
                onChange={(e) => setBp(e.target.value)}
                placeholder="120/80 mmHg"
                className={inputClass + " mt-1"}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Heart Rate (HR)</label>
              <input
                type="text"
                value={hr}
                onChange={(e) => setHr(e.target.value)}
                placeholder="72 bpm"
                className={inputClass + " mt-1"}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Temperature (°F)</label>
              <input
                type="text"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                placeholder="98.6 °F"
                className={inputClass + " mt-1"}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Weight (kg)</label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70 kg"
                className={inputClass + " mt-1"}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Height (cm)</label>
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="175 cm"
                className={inputClass + " mt-1"}
              />
            </div>
          </div>
        </div>

        {/* Clinical Details Section */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Clinical Findings &amp; Diagnosis</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Symptoms / Chief Complaints</label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Fever, cough, headache for 3 days..."
                rows={2}
                className={inputClass + " mt-1 resize-none"}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Diagnosis</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Upper Respiratory Tract Infection (URTI)"
                className={inputClass + " mt-1"}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Prescription &amp; Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tab Paracetamol 500mg 1-1-1 for 5 days. Rest and hydration recommended."
                rows={4}
                className={inputClass + " mt-1 resize-none"}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
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
