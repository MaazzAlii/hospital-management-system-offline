"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAppointment } from "@/app/actions/appointment";

// ── Types ──────────────────────────────────────────────────────────
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

// ── Zod schema ────────────────────────────────────────────────────
const appointmentSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  doctorId: z.string().min(1, "Please select a doctor"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

// ── Field wrapper ──────────────────────────────────────────────────
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
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

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-colors disabled:opacity-60";
const selectClass = inputClass + " cursor-pointer";

// ── Page ───────────────────────────────────────────────────────────
export default function NewAppointmentForm({
  patients,
  doctors,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
}) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
  });

  const onSubmit = async (data: AppointmentFormValues) => {
    setErrorMsg(null);
    const result = await createAppointment(data);
    if (result.success) {
      router.push("/appointments");
    } else {
      setErrorMsg(result.error || "Failed to book appointment");
    }
  };

  // Generate 15-minute time slots (09:00 to 20:00)
  const timeSlots: string[] = [];
  for (let h = 9; h <= 20; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 20 && m > 0) break;
      timeSlots.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back + header */}
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
            <CalendarPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Book Appointment</h1>
            <p className="text-sm text-muted-foreground">
              Schedule a new visit for a patient.
            </p>
          </div>
        </div>
      </div>

      {/* Banners */}
      {isSubmitSuccessful && !errorMsg && (
        <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success font-medium">
          ✓ Appointment booked successfully! Redirecting…
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
          {errorMsg}
        </div>
      )}

      {/* Form card */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border bg-card p-6 shadow-sm space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Patient" required error={errors.patientId?.message}>
            <select {...register("patientId")} className={selectClass}>
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.mrn})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Doctor" required error={errors.doctorId?.message}>
            <select {...register("doctorId")} className={selectClass}>
              <option value="">Select doctor…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.specialization ? ` — ${d.specialization}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Date" required error={errors.date?.message}>
            <input
              {...register("date")}
              type="date"
              className={inputClass}
              min={new Date().toISOString().split("T")[0]}
            />
          </Field>

          <Field label="Time (15-min intervals)" required error={errors.time?.message}>
            <select {...register("time")} className={selectClass}>
              <option value="">Select time…</option>
              {timeSlots.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notes / Reason for Visit" error={errors.notes?.message}>
          <textarea
            {...register("notes")}
            placeholder="e.g. Follow-up for fever, general checkup…"
            rows={3}
            className={inputClass + " resize-none"}
          />
        </Field>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t">
          <Link href="/appointments">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? "Booking…" : "Book Appointment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
