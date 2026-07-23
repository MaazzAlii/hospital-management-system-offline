import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./form";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  let { data: settings } = await supabase.from("Settings").select("*").limit(1).maybeSingle();
  
  if (!settings) {
    const { data: newSettings } = await supabase.from("Settings").insert({}).select().single();
    settings = newSettings;
  }

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
