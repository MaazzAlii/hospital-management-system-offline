"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createDoctor } from "@/app/actions/doctor";

// ── Zod schema ────────────────────────────────────────────────────
const doctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  specialization: z.string().min(2, "Specialization is required"),
  qualifications: z.string().min(2, "Enter qualifications (comma separated)"),
  fee: z.string().min(1, "Fee is required").refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Enter a valid fee"),
  isActive: z.boolean(),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

// ── Reusable field wrapper ─────────────────────────────────────────
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

// ── Page ───────────────────────────────────────────────────────────
export default function NewDoctorPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      isActive: true,
      fee: "1000",
    },
  });

  const onSubmit = async (data: DoctorFormValues) => {
    setErrorMsg(null);
    const result = await createDoctor({
      name: data.name,
      email: data.email,
      specialization: data.specialization,
      qualifications: data.qualifications,
      fee: Number(data.fee),
      isActive: data.isActive,
    });
    if (result.success) {
      router.push(`/doctors/${result.doctor?.id}`);
    } else {
      setErrorMsg(result.error || "Failed to add doctor");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Doctors
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Add New Doctor</h1>
            <p className="text-sm text-muted-foreground">
              Register a new doctor in the clinic system.
            </p>
          </div>
        </div>
      </div>

      {/* Banners */}
      {isSubmitSuccessful && !errorMsg && (
        <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success font-medium">
          ✓ Doctor added successfully! Redirecting…
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
          <Field label="Full Name" required error={errors.name?.message}>
            <input
              {...register("name")}
              type="text"
              placeholder="e.g. Dr. Ahmed Khan"
              className={inputClass}
            />
          </Field>

          <Field label="Email Address" required error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              placeholder="doctor@lifecare.com"
              className={inputClass}
            />
          </Field>

          <Field label="Specialization" required error={errors.specialization?.message}>
            <input
              {...register("specialization")}
              type="text"
              placeholder="e.g. Cardiologist"
              className={inputClass}
            />
          </Field>

          <Field label="Consultation Fee (Rs.)" required error={errors.fee?.message}>
            <input
              {...register("fee")}
              type="number"
              min="0"
              step="50"
              placeholder="1000"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Qualifications" required error={errors.qualifications?.message}>
          <input
            {...register("qualifications")}
            type="text"
            placeholder="e.g. MBBS, FCPS (Medicine)"
            className={inputClass}
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <input
            {...register("isActive")}
            type="checkbox"
            id="isActive"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-foreground cursor-pointer">
            Doctor is active and accepting appointments
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link href="/doctors">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? "Adding…" : "Add Doctor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
