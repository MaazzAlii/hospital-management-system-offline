import { getClinicSettings } from "@/app/actions/billing";
import SettingsForm from "./form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getClinicSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clinic Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage clinic information, billing preferences, and system defaults.
        </p>
      </div>

      <SettingsForm initialData={settings} />
    </div>
  );
}
