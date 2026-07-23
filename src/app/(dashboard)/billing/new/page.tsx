import { createClient } from "@/lib/supabase/server";
import NewInvoiceForm from "./form";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const { data: patients } = await supabase
    .from("Patient")
    .select("id, name, mrn")
    .order("name", { ascending: true });

  const { role } = await getCurrentUserRole();
  const canApplyDiscount = hasAccess(role, "billing", "apply_discount");

  return <NewInvoiceForm patients={patients || []} canApplyDiscount={canApplyDiscount} />;
}
