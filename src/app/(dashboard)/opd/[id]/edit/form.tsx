"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateOpdVisit } from "@/app/actions/opd";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-colors disabled:opacity-60";

const textareaClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-colors disabled:opacity-60 min-h-[90px] resize-y";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({hint})</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

type Vitals = {
  bp?: string;
  hr?: string;
  temp?: string;
  weight?: string;
  height?: string;
};

export default function EditOpdVisitForm({ visit }: { visit: any }) {
  const router = useRouter();

  // Vitals
  const initialVitals: Vitals = (visit.vitals as Vitals) || {};
  const [bp, setBp] = useState(initialVitals.bp || "");
  const [hr, setHr] = useState(initialVitals.hr || "");
  const [temp, setTemp] = useState(initialVitals.temp || "");
  const [weight, setWeight] = useState(initialVitals.weight || "");
  const [height, setHeight] = useState(initialVitals.height || "");

  // Clinical fields
  const [symptoms, setSymptoms] = useState(visit.symptoms || "");
  const [diagnosis, setDiagnosis] = useState(visit.diagnosis || "");
  const [prescription, setPrescription] = useState(
    typeof visit.prescription === "string"
      ? visit.prescription
      : visit.prescription
      ? JSON.stringify(visit.prescription, null, 2)
      : ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const vitals: Vitals = {};
    if (bp.trim()) vitals.bp = bp.trim();
    if (hr.trim()) vitals.hr = hr.trim();
    if (temp.trim()) vitals.temp = temp.trim();
    if (weight.trim()) vitals.weight = weight.trim();
    if (height.trim()) vitals.height = height.trim();

    let parsedPrescription: any = null;
    if (prescription.trim()) {
      try {
        parsedPrescription = JSON.parse(prescription);
      } catch {
        parsedPrescription = prescription.trim();
      }
    }

    const result = await updateOpdVisit(visit.id, {
      vitals,
      symptoms: symptoms.trim() || undefined,
      diagnosis: diagnosis.trim() || undefined,
      prescription: parsedPrescription,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push(`/opd/${visit.id}`);
    } else {
      setErrorMsg((result as any).error || "Failed to update OPD visit");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div>
        <Link
          href={`/opd/${visit.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Visit Details
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Edit OPD Visit</h1>
            <p className="text-sm text-muted-foreground">
              {visit.patient?.name} &mdash;{" "}
              {new Date(visit.visitDate).toLocaleDateString("en-PK", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Vitals */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b pb-2">Vitals</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Field label="Blood Pressure" hint="e.g. 120/80">
              <input
                type="text"
                value={bp}
                onChange={(e) => setBp(e.target.value)}
                placeholder="120/80 mmHg"
                className={inputClass}
              />
            </Field>
            <Field label="Heart Rate" hint="bpm">
              <input
                type="text"
                value={hr}
                onChange={(e) => setHr(e.target.value)}
                placeholder="72"
                className={inputClass}
              />
            </Field>
            <Field label="Temperature" hint="°F or °C">
              <input
                type="text"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                placeholder="98.6 °F"
                className={inputClass}
              />
            </Field>
            <Field label="Weight" hint="kg">
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70 kg"
                className={inputClass}
              />
            </Field>
            <Field label="Height" hint="cm">
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170 cm"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Clinical Notes */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground border-b pb-2">Clinical Notes</h2>
          <div className="space-y-4">
            <Field label="Symptoms">
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Describe presenting symptoms…"
                className={textareaClass}
              />
            </Field>
            <Field label="Diagnosis">
              <textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Clinical diagnosis…"
                className={textareaClass}
              />
            </Field>
            <Field label="Prescription" hint="free text or JSON">
              <textarea
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                placeholder="Medicines, dosage, instructions…"
                className={textareaClass}
                style={{ minHeight: "120px" }}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/opd/${visit.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
