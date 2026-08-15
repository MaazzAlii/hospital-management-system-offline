"use client";

import { useEffect, useState, use } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPatientById, updatePatient } from "@/app/actions/patient";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";

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

export default function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { bloodGroup: "", phone: "" },
  });

  useEffect(() => {
    async function loadPatient() {
      const patient = await getPatientById(resolvedParams.id);
      if (patient) {
        setValue("name", patient.name);
        setValue("dob", patient.dob ? new Date(patient.dob).toISOString().split("T")[0] : "");
        setValue("gender", (patient.gender as any) || "Male");
        setValue("phone", patient.phone || "");
        setValue("address", patient.address || "");
        setValue("bloodGroup", (patient.bloodGroup as any) || "");
      } else {
        setErrorMsg("Patient not found");
      }
      setLoading(false);
    }
    loadPatient();
  }, [resolvedParams.id, setValue]);

  const onSubmit = async (data: PatientFormValues) => {
    setErrorMsg(null);
    const result = await updatePatient(resolvedParams.id, data);
    if (result.success) {
      router.push(`/patients/${resolvedParams.id}`);
    } else {
      setErrorMsg(result.error || "Failed to update patient");
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading patient details…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/patients/${resolvedParams.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patient Profile
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Pencil className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Edit Patient Profile</h1>
            <p className="text-sm text-muted-foreground">
              Update the patient&apos;s personal and medical information.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border bg-card p-6 shadow-sm space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" required error={errors.name?.message}>
            <input {...register("name")} type="text" className={inputClass} />
          </Field>

          <Field label="Date of Birth" required error={errors.dob?.message}>
            <input
              {...register("dob")}
              type="date"
              className={inputClass}
              max={new Date().toISOString().split("T")[0]}
            />
          </Field>

          <Field label="Gender" required error={errors.gender?.message}>
            <select {...register("gender")} className={selectClass}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </Field>

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

        <Field label="Address" required error={errors.address?.message}>
          <textarea {...register("address")} rows={3} className={inputClass + " resize-none"} />
        </Field>

        <div className="flex items-center justify-end gap-3 pt-2 border-t">
          <Link href={`/patients/${resolvedParams.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
