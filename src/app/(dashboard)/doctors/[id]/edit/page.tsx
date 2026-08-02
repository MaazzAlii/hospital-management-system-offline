"use client";

import { useEffect, useState, use } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDoctorById, updateDoctor } from "@/app/actions/doctor";

const doctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  specialization: z.string().min(2, "Specialization is required"),
  qualifications: z.string().min(2, "Enter qualifications (comma separated)"),
  fee: z.string().min(1, "Fee is required").refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Enter a valid fee"),
  isActive: z.boolean(),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

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

export default function EditDoctorPage({
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
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      isActive: true,
      fee: "1000",
    },
  });

  useEffect(() => {
    async function loadDoctor() {
      const doc = await getDoctorById(resolvedParams.id);
      if (doc) {
        setValue("name", doc.user?.name || "");
        setValue("email", doc.user?.email || "");
        setValue("specialization", doc.specialization || "");
        setValue("qualifications", doc.qualification || "");
        setValue("fee", doc.fee ? String(doc.fee) : "0");
        setValue("isActive", doc.status === "active");
      } else {
        setErrorMsg("Doctor not found");
      }
      setLoading(false);
    }
    loadDoctor();
  }, [resolvedParams.id, setValue]);

  const onSubmit = async (data: DoctorFormValues) => {
    setErrorMsg(null);
    const result = await updateDoctor(resolvedParams.id, {
      name: data.name,
      email: data.email,
      specialization: data.specialization,
      qualifications: data.qualifications,
      fee: Number(data.fee),
      isActive: data.isActive,
    });
    if (result.success) {
      router.push(`/doctors/${resolvedParams.id}`);
    } else {
      setErrorMsg(result.error || "Failed to update doctor");
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading doctor details…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/doctors/${resolvedParams.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Doctor Profile
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Edit Doctor Profile</h1>
            <p className="text-sm text-muted-foreground">
              Update doctor information and consultation details.
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

          <Field label="Email Address" required error={errors.email?.message}>
            <input {...register("email")} type="email" className={inputClass} />
          </Field>

          <Field label="Specialization" required error={errors.specialization?.message}>
            <input {...register("specialization")} type="text" className={inputClass} />
          </Field>

          <Field label="Consultation Fee (Rs.)" required error={errors.fee?.message}>
            <input {...register("fee")} type="number" min="0" step="50" className={inputClass} />
          </Field>
        </div>

        <Field label="Qualifications" required error={errors.qualifications?.message}>
          <input {...register("qualifications")} type="text" className={inputClass} />
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

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link href={`/doctors/${resolvedParams.id}`}>
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
