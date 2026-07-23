"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateClinicSettings } from "@/app/actions/billing";

const settingsSchema = z.object({
  clinicName: z.string().min(2, "Clinic name is required"),
  phone: z.string().min(5, "Phone number is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(5, "Address is required"),
  invoicePrefix: z.string().min(1, "Invoice prefix is required"),
  currency: z.string().min(1, "Currency is required"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-colors disabled:opacity-60";

interface ClinicSettings {
  clinicName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  invoicePrefix?: string | null;
  currency?: string | null;
}

export default function SettingsForm({ initialData }: { initialData: ClinicSettings | null }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      clinicName: initialData?.clinicName || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      address: initialData?.address || "",
      invoicePrefix: initialData?.invoicePrefix || "LCC",
      currency: initialData?.currency || "PKR",
    },
  });

  const onSubmit = async (data: SettingsFormValues) => {
    setIsSubmitting(true);
    setMessage(null);
    const result = await updateClinicSettings(data);
    setIsSubmitting(false);

    if (result.success) {
      setMessage({ type: "success", text: "Settings saved successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: result.error || "Failed to save settings" });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl border bg-card p-6 shadow-sm space-y-6"
    >
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-success/40 bg-success/10 text-success"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold mb-4">General Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Clinic Name" error={errors.clinicName?.message}>
            <input {...register("clinicName")} type="text" className={inputClass} />
          </Field>
          <Field label="Contact Email" error={errors.email?.message}>
            <input {...register("email")} type="email" className={inputClass} />
          </Field>
          <Field label="Phone Number" error={errors.phone?.message}>
            <input {...register("phone")} type="text" className={inputClass} />
          </Field>
          <Field label="Address" error={errors.address?.message}>
            <input {...register("address")} type="text" className={inputClass} />
          </Field>
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-base font-semibold mb-4">Billing & System</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Invoice Prefix" error={errors.invoicePrefix?.message}>
            <input {...register("invoicePrefix")} type="text" className={inputClass} />
          </Field>
          <Field label="Default Currency" error={errors.currency?.message}>
            <input {...register("currency")} type="text" className={inputClass} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px] gap-2">
          <Save className="h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
