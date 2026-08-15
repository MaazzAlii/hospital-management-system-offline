"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPatient } from "@/app/actions/patient";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";

// ── Zod schema ────────────────────────────────────────────────────
const patientSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"], { error: "Please select a gender" }),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => {
      const digits = val.replace(/\D/g, "");
      const national = digits.startsWith("92") ? digits.slice(2) : (digits.startsWith("0") ? digits.slice(1) : digits);
      return /^3\d{9}$/.test(national);
    }, "Enter a valid 10-digit Pakistani mobile number (e.g. 300-1234567)"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""]).optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

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

const selectClass = inputClass + " cursor-pointer";

// ── Page ───────────────────────────────────────────────────────────
export default function NewPatientPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    reset,
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { bloodGroup: "", phone: "" },
  });

  const onSubmit = async (data: PatientFormValues) => {
    setErrorMsg(null);
    const result = await createPatient(data);
    if (result.success) {
      reset();
      router.push(`/patients/${result.patient?.id}`);
    } else {
      setErrorMsg(result.error || "Failed to create patient");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Register New Patient</h1>
            <p className="text-sm text-muted-foreground">
              Fill in the details below to register a new patient.
            </p>
          </div>
        </div>
      </div>

      {/* Success/Error banners */}
      {isSubmitSuccessful && !errorMsg && (
        <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success font-medium">
          ✓ Patient registered successfully! Redirecting...
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
          {/* Full name */}
          <Field label="Full Name" required error={errors.name?.message}>
            <input
              {...register("name")}
              type="text"
              placeholder="e.g. Muhammad Ali Khan"
              className={inputClass}
            />
          </Field>

          {/* Date of birth */}
          <Field label="Date of Birth" required error={errors.dob?.message}>
            <input
              {...register("dob")}
              type="date"
              className={inputClass}
              max={new Date().toISOString().split("T")[0]}
            />
          </Field>

          {/* Gender */}
          <Field label="Gender" required error={errors.gender?.message}>
            <select {...register("gender")} className={selectClass}>
              <option value="">Select gender…</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </Field>

          {/* Blood group */}
          <Field label="Blood Group" error={errors.bloodGroup?.message}>
            <select {...register("bloodGroup")} className={selectClass}>
              <option value="">Select blood group…</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </Field>

          {/* Phone */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-foreground">
              Phone Number <span className="ml-0.5 text-destructive">*</span>
            </label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneNumberInput
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.phone?.message}
                  required
                />
              )}
            />
          </div>
        </div>

        {/* Address — full width */}
        <Field label="Address" required error={errors.address?.message}>
          <textarea
            {...register("address")}
            placeholder="Village, Tehsil, District…"
            rows={3}
            className={inputClass + " resize-none"}
          />
        </Field>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t">
          <Link href="/patients">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? "Registering…" : "Register Patient"}
          </Button>
        </div>
      </form>
    </div>
  );
}
