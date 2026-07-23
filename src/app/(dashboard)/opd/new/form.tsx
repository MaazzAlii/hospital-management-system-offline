"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createOpdVisit } from "@/app/actions/opd";

interface PatientOption {
  id: string;
  name: string;
  mrn: string;
}

interface DoctorOption {
  id: string;
  name: string;
  specialization: string;
}

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-colors disabled:opacity-60";
const selectClass = inputClass + " cursor-pointer";
const textareaClass = inputClass + " min-h-[100px] resize-y";

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function NewOpdForm({
  patients,
  doctors,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    visitDate: new Date().toISOString().slice(0, 16),
    bp: "",
    pulse: "",
    temp: "",
    weight: "",
    height: "",
    spo2: "",
    diagnosis: "",
    notes: "",
    followUpDate: "",
    status: "open",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.patientId) errs.patientId = "Please select a patient";
    if (!formData.doctorId) errs.doctorId = "Please select a doctor";
    if (!formData.visitDate) errs.visitDate = "Visit date is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const vitals = {
      bp: formData.bp,
      pulse: formData.pulse,
      temp: formData.temp,
      weight: formData.weight,
      height: formData.height,
      spo2: formData.spo2,
    };

    const result = await createOpdVisit({
      patientId: formData.patientId,
      doctorId: formData.doctorId,
      visitDate: formData.visitDate,
      vitals,
      diagnosis: formData.diagnosis || undefined,
      notes: formData.notes || undefined,
      followUpDate: formData.followUpDate || undefined,
      status: formData.status,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push("/opd");
    } else {
      setErrorMsg(result.error || "Failed to log visit");
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <Link
          href="/opd"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to OPD Visits
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">New OPD Visit</h1>
            <p className="text-sm text-muted-foreground">
              Log patient vitals and initial diagnosis.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b pb-2">Visit Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Patient" required error={fieldErrors.patientId}>
              <select
                value={formData.patientId}
                onChange={(e) => updateField("patientId", e.target.value)}
                className={selectClass}
              >
                <option value="">Select patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Doctor" required error={fieldErrors.doctorId}>
              <select
                value={formData.doctorId}
                onChange={(e) => updateField("doctorId", e.target.value)}
                className={selectClass}
              >
                <option value="">Select doctor…</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.specialization && `(${d.specialization})`}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Visit Date & Time" required error={fieldErrors.visitDate}>
              <input
                type="datetime-local"
                value={formData.visitDate}
                onChange={(e) => updateField("visitDate", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Status">
              <select
                value={formData.status}
                onChange={(e) => updateField("status", e.target.value)}
                className={selectClass}
              >
                <option value="open">Open (In Progress)</option>
                <option value="closed">Closed (Completed)</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b pb-2">Vitals</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Blood Pressure (BP)">
              <input
                type="text"
                placeholder="e.g. 120/80"
                value={formData.bp}
                onChange={(e) => updateField("bp", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Pulse (bpm)">
              <input
                type="text"
                placeholder="e.g. 72"
                value={formData.pulse}
                onChange={(e) => updateField("pulse", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Temperature (°F/°C)">
              <input
                type="text"
                placeholder="e.g. 98.6"
                value={formData.temp}
                onChange={(e) => updateField("temp", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Weight (kg)">
              <input
                type="text"
                placeholder="e.g. 70"
                value={formData.weight}
                onChange={(e) => updateField("weight", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Height (cm/in)">
              <input
                type="text"
                placeholder="e.g. 175cm"
                value={formData.height}
                onChange={(e) => updateField("height", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="SpO2 (%)">
              <input
                type="text"
                placeholder="e.g. 98"
                value={formData.spo2}
                onChange={(e) => updateField("spo2", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b pb-2">Clinical Notes</h2>
          <div className="grid gap-4 sm:grid-cols-1">
            <Field label="Primary Diagnosis">
              <input
                type="text"
                placeholder="Enter diagnosis if known..."
                value={formData.diagnosis}
                onChange={(e) => updateField("diagnosis", e.target.value)}
                className={inputClass}
              />
            </Field>
            
            <Field label="Doctor Notes & Prescription">
              <textarea
                placeholder="Detailed clinical notes, symptoms, and prescribed treatment..."
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                className={textareaClass}
              />
            </Field>

            <Field label="Follow-up Date">
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => updateField("followUpDate", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/opd">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? "Saving..." : "Save OPD Visit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
